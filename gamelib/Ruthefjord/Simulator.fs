/// Simulator for the in-game programs.
/// See Ast.fs, Grid.fs, Robot.fs
module Ruthefjord.Simulator

open Ruthefjord
open Ruthefjord.Ast.Imperative

type ErrorCode =
| InternalError = 4001
| UnknownIdentifier = 4101
| TypeError = 4102
| RobotUnavailable = 4201
| QueryError = 4203
| UnableToConvertToInteger = 4301
| StackOverflow = 4302

let private runtimeError (meta:Ast.Imperative.Meta) (code: ErrorCode) msg =
    raise (CodeException (RuntimeError (int code, meta.Id, msg, null)))
let private runtimeErrorWE exn (meta:Ast.Imperative.Meta) (code: ErrorCode) msg =
    raise (CodeException (RuntimeError (int code, meta.Id, msg, exn)))

type ValueMap = Map<string,obj>

type private Environment = {
    Globals: ValueMap;
    Locals: ValueMap;
}
with
    member x.Item key =
        match x.Locals.TryFind key with
        | None -> x.Globals.[key]
        | Some v -> v

    member x.AddLocal ((key, value) as kvp) =
        {x with Locals=x.Locals.Add kvp}

    member x.AddGlobal ((key, value) as kvp) =
        {x with Globals=x.Globals.Add kvp}

    member x.PushScope locals =
        // disregard locals from parent scope, only inherit globals
        {x with Locals=locals}

type private CallStackState = {
    mutable ToExecute: Statement list;
    Environment: Environment;
    Robot: Robot.IRobotSimulator option
}

let private MAX_CALLSTACK = 1000

type private State = {
    mutable CallStack: CallStackState list;
    mutable LastExecuted: Statement list;
}
with
    member x.Push meta css =
        if x.CallStack.Length >= MAX_CALLSTACK then runtimeError meta ErrorCode.StackOverflow "max callstack length exceeded"
        x.CallStack <- css :: x.CallStack

let private valueAsInt meta (o:obj) =
    match o with
    | :? int as x -> x
    | :? string as s ->
        try System.Int32.Parse(s)
        with _ -> runtimeError meta ErrorCode.UnableToConvertToInteger (sprintf "cannot convert '%s' to integer" s)
    | _ -> runtimeError meta ErrorCode.UnableToConvertToInteger "cannot coerce object to integer"

let private createState (program:Program) builtInValues robot =
    let env = {Globals=builtInValues; Locals=Map.empty}
    {CallStack=[{Environment=env; ToExecute=program.Body; Robot=robot}]; LastExecuted=[];}

let rec private evaluate (csstate: CallStackState) (expr: Expression) =
    match expr.Expr with
    | Literal x -> x
    // HACK this should probably make sure it's not a function or procedure...
    | Identifier name ->
        try csstate.Environment.[name]
        with :? System.Collections.Generic.KeyNotFoundException ->
            runtimeError expr.Meta ErrorCode.UnknownIdentifier (sprintf "Unknown identifier %s." name)
    | Evaluate {Identifier=name; Arguments=argExpr} ->
        let argVals = List.map (evaluate csstate) argExpr
        try
            let func = csstate.Environment.[name] :?> Function
            let args = Seq.zip func.Parameters argVals |> Map.ofSeq
            let env = csstate.Environment.PushScope args
            evaluate {csstate with Environment=env} func.Body
        with
        | :? System.Collections.Generic.KeyNotFoundException -> runtimeError expr.Meta ErrorCode.UnknownIdentifier (sprintf "Unknown identifier %s." name)
        | :? System.InvalidCastException -> runtimeError expr.Meta ErrorCode.TypeError "Identifier is not a function"
    | Query query ->
        match csstate.Robot with
        | None -> runtimeError expr.Meta ErrorCode.RobotUnavailable "Queries not allowed; robot not available"
        | Some robot ->
            let args = List.map (evaluate csstate) query.Arguments
            try robot.Query {Name=query.Name; Args=ImmArr.ofSeq args}
            with e -> runtimeErrorWE e expr.Meta ErrorCode.QueryError "query threw exception"

let private step (state:State) =
    match state.CallStack with
    | [] -> None
    | head :: tail ->
        match head.ToExecute with
        | [] ->
            state.CallStack <- tail
            None
        | stmt :: next ->
            // update toExecute before simulating, because we want to advance to the next statement even if a RuntimeError is thrown.
            head.ToExecute <- next

            // update last executed
            if state.LastExecuted.Length < state.CallStack.Length then
                state.LastExecuted <- stmt :: state.LastExecuted
            else
                state.LastExecuted <- stmt :: MyList.skip (1 + state.LastExecuted.Length - state.CallStack.Length) state.LastExecuted

            match stmt.Stmt with
            | Conditional {Condition=cond; Then=thenb; Else=elseb} ->
                let b =
                    try evaluate head cond :?> bool
                    with :? System.InvalidCastException -> runtimeError cond.Meta ErrorCode.TypeError "Conditional expression is not a bool"
                state.Push stmt.Meta {head with ToExecute=if b then thenb else elseb}
                None
            | Repeat {Body=body; NumTimes=ntimesExpr} ->
                let ntimes = evaluate head ntimesExpr |> valueAsInt stmt.Meta
                let toAdd = List.concat (List.init ntimes (fun _ -> body))
                state.Push stmt.Meta {head with ToExecute=toAdd}
                None
            | Function func ->
                state.CallStack <- {head with Environment=head.Environment.AddGlobal (func.Name, func)} :: tail
                None
            | Procedure proc ->
                state.CallStack <- {head with Environment=head.Environment.AddGlobal (proc.Name, proc)} :: tail
                None
            | Execute {Identifier=name; Arguments=argExpr} ->
                let argVals = List.map (evaluate head) argExpr
                try
                    let proc = head.Environment.[name] :?> Procedure
                    let args = Seq.zip proc.Parameters argVals |> Map.ofSeq
                    let env = head.Environment.PushScope args
                    state.Push stmt.Meta {head with Environment=env; ToExecute=proc.Body}
                with
                | :? System.Collections.Generic.KeyNotFoundException -> runtimeError stmt.Meta ErrorCode.UnknownIdentifier (sprintf "Unknown identifier %s." name)
                | :? System.InvalidCastException -> runtimeError stmt.Meta ErrorCode.TypeError "Identifier is not a procedure"
                None
            | Command {Name=cmd; Arguments=args} ->
                if head.Robot.IsNone then runtimeError stmt.Meta ErrorCode.RobotUnavailable "Commands not allowed; robot not available"
                let args = List.map (evaluate head) args
                Some (Robot.Command (cmd, ImmArr.ofSeq args, state.LastExecuted))

let private makeInternalError e =
    RuntimeError (int ErrorCode.InternalError, -1, "Internal runtime error.", e)

let private internalError e =
    raise (CodeException (makeInternalError e))

/// Step the simulation a single statement.
/// Will modify the passed-in state, and return either Some command or None on success, or the RuntimeError if one occurred.
/// Guaranteed to not throw an exception.
let private tryStep state =
    try Choice1Of2 (step state)
    with
    // TODO should really not need a dynamic cast here...
    | :? CodeException as e -> Choice2Of2 (e.Error :?> RuntimeError)
    | e -> Choice2Of2 (makeInternalError e)

let inline private IsDone (state:State) = state.CallStack.IsEmpty

/// Executes the program until a BasicCommand is hit, then returns that command, or None if the program has finished.
let private ExecuteUntilCommand state =
    try
        // HACK should check to make sure this a reasonable value
        let MAX_ITER = 20
        let mutable numSteps = 0
        let mutable cmd = None
        while cmd.IsNone && not (IsDone state) && numSteps < MAX_ITER do
            cmd <- step state
            numSteps <- numSteps + 1
        match cmd with Some c -> c | None -> null
    with
    | :? CodeException -> reraise ()
    | e -> internalError e

(*
    The different result types of the simulation
    Come in 3 parts:
    StepResult: The state of the stack after every statement is executed
    StateResult: The world state after every command is executed
    ErrorResult: runtime errors from executing statements

    The last two occur a subset of the time that the first does, so they are
    returned as separate arrays paired with pointers to the index into the StepResult array.
*)

type StackResult = Statement list

type Result<'a> = {
    StepIndex: int;
    Data: 'a;
}

[<ReferenceEquality;NoComparison>]
type StateResult = {
    Command: Robot.Command;
    WorldState: obj;
}

type ErrorResult = RuntimeError

type FullSimulationResult = {
    /// All steps
    Steps: StackResult [];
    /// World state updates, with pointers to corresponding step
    States: Result<StateResult>[];
    /// Errors, with pointers to corresponding step
    Errors: Result<ErrorResult>[];
}
with
    /// Returns the index into the state array of the state that is active during stepIndex.
    member x.StateOf stepIndex =
        if stepIndex >= x.Steps.Length
        then
            x.States.Length
        else
            let onePast = x.States |> Array.tryFindIndex (fun s -> s.StepIndex > stepIndex)
            (defaultArg onePast x.States.Length) - 1

type LazyStepResult = {
    Stack: StackResult;
    State: StateResult;
    Errors: RuntimeError[];
}

type private MutableList<'a> = System.Collections.Generic.List<'a>
type private MutableDict<'k,'v> = System.Collections.Generic.Dictionary<'k,'v>

let private executeStatement (state:State) (stmt:Statement): Robot.Command2 option =
    let head = state.CallStack.Head
    match stmt.Stmt with
    | Conditional {Condition=cond; Then=thenb; Else=elseb} ->
        let b =
            try evaluate head cond :?> bool
            with :? System.InvalidCastException -> runtimeError cond.Meta ErrorCode.TypeError "Conditional expression is not a bool"
        state.Push stmt.Meta {head with ToExecute=if b then thenb else elseb}
        None
    | Repeat {Body=body; NumTimes=ntimesExpr} ->
        let ntimes = evaluate head ntimesExpr |> valueAsInt stmt.Meta
        let toAdd = List.concat (List.init ntimes (fun _ -> body))
        state.Push stmt.Meta {head with ToExecute=toAdd}
        None
    | Function func ->
        state.CallStack <- {head with Environment=head.Environment.AddGlobal (func.Name, func)} :: state.CallStack.Tail
        None
    | Procedure proc ->
        state.CallStack <- {head with Environment=head.Environment.AddGlobal (proc.Name, proc)} :: state.CallStack.Tail
        None
    | Execute {Identifier=name; Arguments=argExpr} ->
        let argVals = List.map (evaluate head) argExpr
        try
            let proc = head.Environment.[name] :?> Procedure
            let args = Seq.zip proc.Parameters argVals |> Map.ofSeq
            let env = head.Environment.PushScope args
            state.Push stmt.Meta {head with Environment=env; ToExecute=proc.Body}
        with
        | :? System.Collections.Generic.KeyNotFoundException -> runtimeError stmt.Meta ErrorCode.UnknownIdentifier (sprintf "Unknown identifier %s." name)
        | :? System.InvalidCastException -> runtimeError stmt.Meta ErrorCode.TypeError "Identifier is not a procedure"
        None
    | Command {Name=cmd; Arguments=args} ->
        //if head.Robot.IsNone then runtimeError stmt.Meta ErrorCode.RobotUnavailable "Commands not allowed; robot not available"
        let args = List.map (evaluate head) args
        Some {Name=cmd; Args=args}

let private popNextStatment (state:State) =
    match state.CallStack with
    | [] -> None
    | head :: tail ->
        match head.ToExecute with
        | [] ->
            state.CallStack <- tail
            None
        | stmt :: next ->
            // update toExecute before simulating, because we want to advance to the next statement even if a RuntimeError is thrown.
            head.ToExecute <- next

            // update last executed
            if state.LastExecuted.Length < state.CallStack.Length then
                state.LastExecuted <- stmt :: state.LastExecuted
            else
                state.LastExecuted <- stmt :: MyList.skip (1 + state.LastExecuted.Length - state.CallStack.Length) state.LastExecuted

            Some stmt

let private executeStatement' state statement (acc:MutableList<Robot.Command2>) =
    match executeStatement state statement with
    | None -> ()
    | (Some cmd) -> acc.Add cmd

let private executeAll state (acc:MutableList<Robot.Command2>) =
    while not (IsDone state) do
        match popNextStatment state with
        | Some s -> executeStatement' state s acc
        | None -> ()

type ProcedureCallData = {
    Name: string;
    Args: obj list;
}

let private evalProcedureReference meta (head:CallStackState) name =
    try
        head.Environment.[name] :?> Procedure
    with
    | :? System.Collections.Generic.KeyNotFoundException -> runtimeError meta ErrorCode.UnknownIdentifier (sprintf "Unknown identifier %s." name)
    | :? System.InvalidCastException -> runtimeError meta ErrorCode.TypeError "Identifier is not a procedure"

let rec private executeWithProcedureResultCache state (cachedResults:MutableDict<ProcedureCallData,Robot.Command2[]>) (acc:MutableList<Robot.Command2>) =
    let isolatedState env toExec =
        {CallStack=[{Environment=env; ToExecute=toExec; Robot=None}]; LastExecuted=[];}

    while not (IsDone state) do
        match popNextStatment state with
        | Some {Meta=meta; Stmt=Execute {Identifier=name; Arguments=argExpr}} ->
            let head = state.CallStack.Head
            let proc = evalProcedureReference meta head name
            let argVals = List.map (evaluate head) argExpr
            let args = Seq.zip proc.Parameters argVals |> Seq.toList
            let calldata: ProcedureCallData = {Name=name; Args=args |> List.map snd}
            if cachedResults.ContainsKey calldata
            then
                acc.AddRange cachedResults.[calldata]
            else
                let tmpList = MutableList (20)
                let tmpState = isolatedState (head.Environment.PushScope (args |> Map.ofList)) proc.Body
                executeWithProcedureResultCache tmpState cachedResults tmpList
                cachedResults.Add (calldata, tmpList.ToArray ())
                acc.AddRange tmpList
        | Some {Meta=meta; Stmt=Repeat {Body=body; NumTimes=ntimesExpr}} ->
            let head = state.CallStack.Head
            let ntimes = evaluate head ntimesExpr |> valueAsInt meta
            let tmpList = MutableList (20)
            let tmpState = isolatedState head.Environment body
            executeWithProcedureResultCache tmpState cachedResults tmpList
            for i = 1 to ntimes do
                acc.AddRange tmpList
        | Some s -> executeStatement' state s acc
        | None -> ()

let SimulateWithoutRobotOptimized program builtIns =
    let simstate = createState program builtIns None
    let commands = MutableList 1000
    let cache = MutableDict ()
    executeWithProcedureResultCache simstate cache commands
    //printf "Cached: %A" <| (cache.Keys |> Seq.toList)
    commands.ToArray ()

let SimulateWithoutRobot program builtIns =
    let simstate = createState program builtIns None
    let commands = MutableList 1000
    executeAll simstate commands
    commands.ToArray ()

let SimulateWithRobot program builtIns (robot:Robot.IRobotSimulator) =
    let MAX_ITER = 100000
    let simstate = createState program builtIns (Some robot)

    let steps = MutableList ()
    let states = MutableList ()
    let errors = MutableList ()

    steps.Add simstate.LastExecuted
    states.Add {StepIndex=0; Data={Command=null; WorldState=robot.CurrentState}}

    let mutable numSteps = 0
    while not (IsDone simstate) && numSteps < MAX_ITER do
        numSteps <- numSteps + 1
        match tryStep simstate with
        | Choice1Of2 None -> ()
        | Choice1Of2 (Some cmd) ->
            robot.Execute cmd
            states.Add {StepIndex=steps.Count; Data={Command=cmd; WorldState=robot.CurrentState}}
        | Choice2Of2 error ->
            errors.Add {StepIndex=steps.Count; Data=error}

        steps.Add simstate.LastExecuted

    {Steps=steps.ToArray(); States=states.ToArray(); Errors=errors.ToArray()}

type LazySimulator (program, builtIns, robot) =
    let state = createState program builtIns (Some robot)
    let initialState = {Command=null; WorldState=robot.CurrentState}

    member x.IsDone = IsDone state

    member x.InitialState = initialState

    /// Step the simulation until either a state change or an error.
    member x.StepUntilSomething () =
        let cmd = ExecuteUntilCommand state
        robot.Execute cmd
        {Stack=state.LastExecuted; State={Command=cmd; WorldState=robot.CurrentState}; Errors=Array.empty}

// given a program, executes it, returning the map of names and values generated by the program
let import program =
    try
        // HACK first wipe the programs ids so they don't clash with things
        let program = mapMeta (fun m -> {m with Id=0}) program

        let state = createState program Map.empty None
        let mutable vals = Map.empty
        while not (IsDone state) do
            vals <- state.CallStack.Head.Environment.Globals
            step state |> ignore
        vals
    with
    | :? CodeException -> reraise ()
    | e -> internalError e
