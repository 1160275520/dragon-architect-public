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

type private CallStackState2 = {
    mutable ToExecute: Statement list;
    Environment: Environment;
    Robot: Robot.IRobotSimulator2 option
}

let private MAX_CALLSTACK = 1000

type private State = {
    Program: Program;
    mutable CallStack: CallStackState list;
    mutable LastExecuted: Statement list;
}
with
    member x.Push meta css =
        if x.CallStack.Length >= MAX_CALLSTACK then runtimeError meta ErrorCode.StackOverflow "max callstack length exceeded"
        x.CallStack <- css :: x.CallStack

type private State2 = {
    mutable CallStack: CallStackState2 list;
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
    ({Program=program; CallStack=[{Environment=env; ToExecute=program.Body; Robot=robot}]; LastExecuted=[];}:State)

let private createState2 (program:Program) builtInValues robot =
    let env = {Globals=builtInValues; Locals=Map.empty}
    ({CallStack=[{Environment=env; ToExecute=program.Body; Robot=robot}]; LastExecuted=[];}:State2)

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

let rec private evaluate2 (csstate: CallStackState2) (expr: Expression) =
    match expr.Expr with
    | Literal x -> x
    // HACK this should probably make sure it's not a function or procedure...
    | Identifier name ->
        try csstate.Environment.[name]
        with :? System.Collections.Generic.KeyNotFoundException ->
            runtimeError expr.Meta ErrorCode.UnknownIdentifier (sprintf "Unknown identifier %s." name)
    | Evaluate {Identifier=name; Arguments=argExpr} ->
        let argVals = List.map (evaluate2 csstate) argExpr
        try
            let func = csstate.Environment.[name] :?> Function
            let args = Seq.zip func.Parameters argVals |> Map.ofSeq
            let env = csstate.Environment.PushScope args
            evaluate2 {csstate with Environment=env} func.Body
        with
        | :? System.Collections.Generic.KeyNotFoundException -> runtimeError expr.Meta ErrorCode.UnknownIdentifier (sprintf "Unknown identifier %s." name)
        | :? System.InvalidCastException -> runtimeError expr.Meta ErrorCode.TypeError "Identifier is not a function"
    | Query query ->
        match csstate.Robot with
        | None -> runtimeError expr.Meta ErrorCode.RobotUnavailable "Queries not allowed; robot not available"
        | Some robot ->
            let args = List.map (evaluate2 csstate) query.Arguments
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

let private step2 (state:State2) =
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
                    try evaluate2 head cond :?> bool
                    with :? System.InvalidCastException -> runtimeError cond.Meta ErrorCode.TypeError "Conditional expression is not a bool"
                state.Push stmt.Meta {head with ToExecute=if b then thenb else elseb}
                None
            | Repeat {Body=body; NumTimes=ntimesExpr} ->
                let ntimes = evaluate2 head ntimesExpr |> valueAsInt stmt.Meta
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
                let argVals = List.map (evaluate2 head) argExpr
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
                let args = List.map (evaluate2 head) args
                Some (({Name=cmd; Args=args}:Robot.Command2))

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

let private tryStep2 state =
    try Choice1Of2 (step2 state)
    with
    // TODO should really not need a dynamic cast here...
    | :? CodeException as e -> Choice2Of2 (e.Error :?> RuntimeError)
    | e -> Choice2Of2 (makeInternalError e)

let inline private IsDone (state:State) = state.CallStack.IsEmpty

let inline private IsDone2 (state:State2) = state.CallStack.IsEmpty

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

[<ReferenceEquality;NoComparison>]
type StateResult2 = {
    Command: Robot.Command2;
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

type FullSimulationResult2 = {
    /// All steps
    Steps: StackResult [];
    /// World state updates, with pointers to corresponding step
    States: Result<StateResult2>[];
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

type StepResult = {
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

let private executeStatement2 (state:State2) (stmt:Statement): Robot.Command2 option =
    let head = state.CallStack.Head
    match stmt.Stmt with
    | Conditional {Condition=cond; Then=thenb; Else=elseb} ->
        let b =
            try evaluate2 head cond :?> bool
            with :? System.InvalidCastException -> runtimeError cond.Meta ErrorCode.TypeError "Conditional expression is not a bool"
        state.Push stmt.Meta {head with ToExecute=if b then thenb else elseb}
        None
    | Repeat {Body=body; NumTimes=ntimesExpr} ->
        let ntimes = evaluate2 head ntimesExpr |> valueAsInt stmt.Meta
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
        let argVals = List.map (evaluate2 head) argExpr
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
        let args = List.map (evaluate2 head) args
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

let private popNextStatment2 (state:State2) =
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

let private executeStatement2' state statement (acc:MutableList<Robot.Command2>) =
    match executeStatement2 state statement with
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

type ConcreteStatement =
// procedure name, args
// HACK this only works for integer parameters, boo yah
| CExecute of string * int list
// ast id
| CRepeatBody of int
// ast id, numTimes
| CRepeat of int * int
| CCommand of Robot.Command2

type Dict<'a,'b> = System.Collections.Generic.Dictionary<'a,'b>

type private Context<'State> = {
    Environment: Environment;
    State: 'State;
}

let rec private evaluate3<'S> (ctx: Context<'S>) (expr: Expression) =
    match expr.Expr with
    | Literal x -> x
    // HACK this should probably make sure it's not a function or procedure...
    | Identifier name ->
        try ctx.Environment.[name]
        with :? System.Collections.Generic.KeyNotFoundException ->
            runtimeError expr.Meta ErrorCode.UnknownIdentifier (sprintf "Unknown identifier %s." name)
    | Evaluate {Identifier=name; Arguments=argExpr} ->
        let argVals = List.map (evaluate3 ctx) argExpr
        try
            let func = ctx.Environment.[name] :?> Function
            let args = Seq.zip func.Parameters argVals |> Map.ofSeq
            let env = ctx.Environment.PushScope args
            evaluate3 {ctx with Environment=env} func.Body
        with
        | :? System.Collections.Generic.KeyNotFoundException -> runtimeError expr.Meta ErrorCode.UnknownIdentifier (sprintf "Unknown identifier %s." name)
        | :? System.InvalidCastException -> runtimeError expr.Meta ErrorCode.TypeError "Identifier is not a function"
    | Query query ->
        raise (System.NotSupportedException "queries not supported for this evaluation algo")

type StateFunctions<'State, 'StateDelta> = {
    Empty: 'StateDelta;
    Combine: 'StateDelta -> 'StateDelta -> 'StateDelta;
    Create: Robot.Command2 -> 'StateDelta;
    ApplyDelta: 'State -> 'StateDelta -> 'State option;
    ApplyCommand: 'State -> Robot.Command2 -> 'State
}

type CacheData<'StateDelta> = {
    Delta: 'StateDelta;
}

let private concretizeStatement (ctx:Context<_>) (stmt:Statement) : ConcreteStatement option =
    match stmt.Stmt with
    | Repeat {Body=body; NumTimes=ntimesExpr} ->
        let ntimes = evaluate3 ctx ntimesExpr |> valueAsInt stmt.Meta
        Some (CRepeat (stmt.Meta.Id, ntimes))
    (*| Execute {Identifier=name; Arguments=argExpr} ->
        let argVals = List.map (fun e -> (evaluate3 ctx e) :?> int) argExpr
        Some (CExecute (name, argVals))*)
    | Command {Name=cmd; Arguments=args} ->
        let args = List.map (evaluate3 ctx) args
        Some (CCommand {Name=cmd; Args=args})
    | _ -> None

let private isolatedState prog env toExec =
    {Program=prog; CallStack=[{Environment=env; ToExecute=toExec; Robot=None}]; LastExecuted=[];}:State

let RunOptimized37<'State, 'StateDelta> (program:Program) (globals:ValueMap) (sfuncs:StateFunctions<'State, 'StateDelta>) (cache: Dict<ConcreteStatement, CacheData<'StateDelta>>) (startState:'State) =
    let fullProgram: Program =
        let stmts =
            [
                yield! program.Body
                for kvp in globals do
                    match kvp.Value with
                    | :? Procedure as p ->
                        yield! p.Body
                    | _ -> ()
            ]
        {Body=stmts}

    let rec executeWithCache (ctx:Context<'State>) (stmt:Statement) =
        match concretizeStatement ctx stmt with
        // assumes commands are concretizable statements, and thus any non-concretizable statement has no delta
        | None ->
            (executeWithoutCache ctx stmt, sfuncs.Empty)
        | Some concrete ->
            let result = getCached concrete
            let s = ctx.State
            let d = result.Delta
            match sfuncs.ApplyDelta ctx.State result.Delta with
            | Some s -> ({ctx with State=s}, result.Delta)
            | None ->
                // even if we fail to apply it, it's still the correct delta
                (executeWithoutCache ctx stmt, result.Delta)

    and getCached (concrete:ConcreteStatement): CacheData<'StateDelta> =
        let (b,v) = cache.TryGetValue concrete
        if b
        then v
        else
            let cr = createCached concrete
            cache.Add (concrete, cr)
            cr

    and createCached (concrete:ConcreteStatement) =
        match concrete with
        | CRepeat (nodeId, numTimes) ->
            let bodyResult = getCached (CRepeatBody nodeId)
            let delta = Seq.init numTimes (fun _ -> bodyResult.Delta) |> Seq.fold sfuncs.Combine sfuncs.Empty
            {Delta=delta}
        | CRepeatBody nodeId ->
            let stmt = (findStatementWithId nodeId fullProgram).Stmt.AsRepeat ()
            let delta = createDeltaForBlock stmt.Body
            {Delta=delta}
        | CCommand cmd ->
            let delta = sfuncs.Create cmd
            {Delta=delta}
        | _ -> invalidArg "" ""

    and createDeltaForBlock (block:Statement list) =
        // FIXME
        sfuncs.Empty

    and executeWithoutCache (ctx:Context<'State>) (stmt:Statement) =
        match stmt.Stmt with
        | Conditional {Condition=cond; Then=thenb; Else=elseb} ->
            let b =
                try evaluate3 ctx cond :?> bool
                with :? System.InvalidCastException -> runtimeError cond.Meta ErrorCode.TypeError "Conditional expression is not a bool"
            if b
            then executeBlock ctx thenb
            else executeBlock ctx elseb
        | Repeat {Body=body; NumTimes=ntimesExpr} ->
            let ntimes = evaluate3 ctx ntimesExpr |> valueAsInt stmt.Meta
            let mutable tmpCtx = ctx
            for i = 1 to ntimes do
                tmpCtx <- executeBlock tmpCtx body
            tmpCtx
        | Function func ->
            {ctx with Environment=ctx.Environment.AddGlobal (func.Name, func)}
        | Procedure proc ->
            {ctx with Environment=ctx.Environment.AddGlobal (proc.Name, proc)}
        | Execute {Identifier=name; Arguments=argExpr} ->
            let argVals = List.map (evaluate3 ctx) argExpr
            try
                let proc = ctx.Environment.[name] :?> Procedure
                let args = Seq.zip proc.Parameters argVals |> Map.ofSeq
                let env = ctx.Environment.PushScope args
                executeBlock {ctx with Environment=env} proc.Body
            with
            | :? System.Collections.Generic.KeyNotFoundException -> runtimeError stmt.Meta ErrorCode.UnknownIdentifier (sprintf "Unknown identifier %s." name)
            | :? System.InvalidCastException -> runtimeError stmt.Meta ErrorCode.TypeError "Identifier is not a procedure"
        | Command {Name=cmd; Arguments=args} ->
            let args = List.map (evaluate3 ctx) args
            let cmd: Robot.Command2 = {Name=cmd; Args=args}
            {ctx with State=sfuncs.ApplyCommand ctx.State cmd}

    and executeBlock (ctx:Context<'State>) (list:Statement list) =
        let mutable tmpCtx = ctx
        for s in list do
            tmpCtx <- fst (executeWithCache tmpCtx s)
        tmpCtx

    let ctx = {Environment={Globals=globals; Locals=Map.empty}; State=startState}
    (executeBlock ctx program.Body).State

let private evalProcedureReference2 meta (head:CallStackState2) name =
    try
        head.Environment.[name] :?> Procedure
    with
    | :? System.Collections.Generic.KeyNotFoundException -> runtimeError meta ErrorCode.UnknownIdentifier (sprintf "Unknown identifier %s." name)
    | :? System.InvalidCastException -> runtimeError meta ErrorCode.TypeError "Identifier is not a procedure"

let rec private executeWithProcedureResultCache (state:State) (cachedResults:MutableDict<ProcedureCallData,Robot.Command2[]>) (acc:MutableList<Robot.Command2>) =
    let isolatedState env toExec =
        {Program={Body=[]}; CallStack=[{Environment=env; ToExecute=toExec; Robot=None}]; LastExecuted=[];}:State
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

let rec private executeWithProcedureResultCache2 (state:State2) (cachedResults:MutableDict<ProcedureCallData,Robot.Command2[]>) (acc:MutableList<Robot.Command2>) =
    let isolatedState env toExec =
        {CallStack=[{Environment=env; ToExecute=toExec; Robot=None}]; LastExecuted=[];}:State2
    while not (IsDone2 state) do
        match popNextStatment2 state with
        | Some {Meta=meta; Stmt=Execute {Identifier=name; Arguments=argExpr}} ->
            let head = state.CallStack.Head
            let proc = evalProcedureReference2 meta head name
            let argVals = List.map (evaluate2 head) argExpr
            let args = Seq.zip proc.Parameters argVals |> Seq.toList
            let calldata: ProcedureCallData = {Name=name; Args=args |> List.map snd}
            if cachedResults.ContainsKey calldata
            then
                acc.AddRange cachedResults.[calldata]
            else
                let tmpList = MutableList (20)
                let tmpState = isolatedState (head.Environment.PushScope (args |> Map.ofList)) proc.Body
                executeWithProcedureResultCache2 tmpState cachedResults tmpList
                cachedResults.Add (calldata, tmpList.ToArray ())
                acc.AddRange tmpList
        | Some {Meta=meta; Stmt=Repeat {Body=body; NumTimes=ntimesExpr}} ->
            let head = state.CallStack.Head
            let ntimes = evaluate2 head ntimesExpr |> valueAsInt meta
            let tmpList = MutableList (20)
            let tmpState = isolatedState head.Environment body
            executeWithProcedureResultCache2 tmpState cachedResults tmpList
            for i = 1 to ntimes do
                acc.AddRange tmpList
        | Some s -> executeStatement2' state s acc
        | None -> ()

let private executeToFinalState (state:State2) (cachedCommands:MutableDict<ProcedureCallData,Robot.Command2[]>) (cachedDeltas:MutableDict<Robot.Command2[],obj>) =
    let isolatedState env toExec bot =
        {CallStack=[{Environment=env; ToExecute=toExec; Robot=bot}]; LastExecuted=[];}:State2
    while not (IsDone2 state) do
        let head = state.CallStack.Head
        let robot = head.Robot.Value
        match popNextStatment2 state with
        | Some {Meta=meta; Stmt=Execute {Identifier=name; Arguments=argExpr}} ->
            let proc = evalProcedureReference2 meta head name
            let argVals = List.map (evaluate2 head) argExpr
            let args = Seq.zip proc.Parameters argVals |> Seq.toList
            let calldata: ProcedureCallData = {Name=name; Args=args |> List.map snd}
            if cachedCommands.ContainsKey calldata
            then
                if cachedDeltas.ContainsKey cachedCommands.[calldata]
                then
                    robot.ApplyDelta cachedDeltas.[cachedCommands.[calldata]]
                else
                    // commands cached, but no delta means delta could not be generated, and we should execute all commands manually
                    for c in cachedCommands.[calldata] do
                        robot.Execute c
            else
                // first time we've encountered this procedure
                // get the commands for it
                let tmpMutList = MutableList (20)
                let env = head.Environment.PushScope (args |> Map.ofList)
                let tmpState = isolatedState env proc.Body head.Robot
                executeWithProcedureResultCache2 tmpState cachedCommands tmpMutList
                cachedCommands.Add (calldata, tmpMutList.ToArray ())
                let tmpList = Array.toList (tmpMutList.ToArray ())
                // try and generate a delta and then update the state
                match robot.GetDelta tmpList with
                | Some delta ->
                    cachedDeltas.Add (tmpMutList.ToArray (), delta)
                    robot.ApplyDelta delta
                | None ->
                    for c in tmpList do
                        robot.Execute c
        | Some {Meta=meta; Stmt=Repeat {Body=body; NumTimes=ntimesExpr}} ->
            let ntimes = evaluate2 head ntimesExpr |> valueAsInt meta
            let tmpState = isolatedState head.Environment body head.Robot
            let tmpMutList = MutableList (20)
            executeWithProcedureResultCache2 tmpState cachedCommands tmpMutList
            let tmpArr = tmpMutList.ToArray ()
            if cachedDeltas.ContainsKey tmpArr
            then // we've seen this loop body before, apply cached delta ntimes
                for i = 1 to ntimes do
                    robot.ApplyDelta cachedDeltas.[tmpArr]
            else // loop body is unseen, or a delta can't be generated
                let tmpList = Array.toList tmpArr
                match robot.GetDelta tmpList with
                | Some delta ->
                    cachedDeltas.Add (tmpArr, delta)
                    for i = 1 to ntimes do
                        robot.ApplyDelta cachedDeltas.[tmpArr]
                | None ->
                    for i = 1 to ntimes do
                        for c in tmpList do
                            robot.Execute c
        | Some s ->
            match executeStatement2 state s with
            | None -> ()
            | (Some cmd) -> robot.Execute cmd
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
    states.Add {StepIndex=0; Data=({Command=null; WorldState=robot.CurrentState}:StateResult)}

    let mutable numSteps = 0
    while not (IsDone simstate) && numSteps < MAX_ITER do
        numSteps <- numSteps + 1
        match tryStep simstate with
        | Choice1Of2 None -> ()
        | Choice1Of2 (Some cmd) ->
            robot.Execute cmd
            states.Add {StepIndex=steps.Count; Data=({Command=cmd; WorldState=robot.CurrentState}:StateResult)}
        | Choice2Of2 error ->
            errors.Add {StepIndex=steps.Count; Data=error}

        steps.Add simstate.LastExecuted
    // HACK ensure there's always a "final" state on the last step to simplify accounting for debugging tools
    if states.[states.Count - 1].StepIndex <> steps.Count - 1 then
        states.Add {StepIndex=steps.Count - 1; Data=({Command=null; WorldState=robot.CurrentState}:StateResult)}

    {Steps=steps.ToArray(); States=states.ToArray(); Errors=errors.ToArray()}:FullSimulationResult

let SimulateWithRobot2 program builtIns (robot:Robot.IRobotSimulator2) =
    let MAX_ITER = 100000
    let simstate = createState2 program builtIns (Some robot)

    let steps = MutableList ()
    let states = MutableList ()
    let errors = MutableList ()

    steps.Add simstate.LastExecuted
//    states.Add {StepIndex=0; Data=({Command=null; WorldState=robot.CurrentState}:StateResult2)}

    let mutable numSteps = 0
    while not (IsDone2 simstate) && numSteps < MAX_ITER do
        numSteps <- numSteps + 1
        match tryStep2 simstate with
        | Choice1Of2 None -> ()
        | Choice1Of2 (Some cmd) ->
            robot.Execute cmd
            states.Add {StepIndex=steps.Count; Data={Command=cmd; WorldState=robot.CurrentState}}
        | Choice2Of2 error ->
            errors.Add {StepIndex=steps.Count; Data=error}

        steps.Add simstate.LastExecuted
    {Steps=steps.ToArray(); States=states.ToArray(); Errors=errors.ToArray()}:FullSimulationResult2

let SimulateWithRobot3 program builtIns (robot:Robot.IRobotSimulator2) =
    let simstate = createState2 program builtIns (Some robot)
    let commandCache = MutableDict ()
    let deltaCache = MutableDict ()
    executeToFinalState simstate commandCache deltaCache
    robot.CurrentState

type LazySimulator (program, builtIns, robot) =
    let state = createState program builtIns (Some robot)
    let initialState = {Stack=state.LastExecuted; State={Command=null; WorldState=robot.CurrentState}; Errors=Array.empty}

    member x.IsDone = IsDone state

    member x.InitialState = initialState

    /// Step the simulation until either a state change or an error.
    member x.AdvanceOneCommand () =
        let cmd = ExecuteUntilCommand state
        robot.Execute cmd
        {Stack=state.LastExecuted; State={Command=cmd; WorldState=robot.CurrentState}; Errors=Array.empty}
        //{Command=cmd; WorldState=robot.CurrentState}

// given a program, executes it, returning the map of names and values generated by the program
let import program =
    try
        // HACK first change the programs ids so they don't clash with things
        // these will conflict with each other if more than one program is imported!
        let program = mapMeta (fun m -> {m with Id=m.Id + 167000}) program

        let state = createState program Map.empty None
        let mutable vals = Map.empty
        while not (IsDone state) do
            vals <- state.CallStack.Head.Environment.Globals
            step state |> ignore
        vals
    with
    | :? CodeException -> reraise ()
    | e -> internalError e
