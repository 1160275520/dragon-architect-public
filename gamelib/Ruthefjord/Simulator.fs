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

let private makeInternalError e =
    RuntimeError (int ErrorCode.InternalError, -1, "Internal runtime error.", e)

type ValueMap = Map<string,obj>
type private MutableList<'a> = System.Collections.Generic.List<'a>
type private MutableDict<'k,'v> = System.Collections.Generic.Dictionary<'k,'v>

type Environment = {
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

    static member Create globals =
        {Globals=globals; Locals=Map.empty}

type private CallStackStateOLD = {
    mutable ToExecute: Statement list;
    Environment: Environment;
    Robot: Robot.IRobotSimulatorOLD option
}

type private CallStackStateOLD2 = {
    mutable ToExecute: Statement list;
    Environment: Environment;
    Robot: Robot.IRobotSimulatorOLD2 option
}

let private MAX_CALLSTACK = 1000

type private State = {
    Program: Program;
    mutable CallStack: CallStackStateOLD list;
    mutable LastExecuted: Statement list;
}
with
    member x.Push meta css =
        if x.CallStack.Length >= MAX_CALLSTACK then runtimeError meta ErrorCode.StackOverflow "max callstack length exceeded"
        x.CallStack <- css :: x.CallStack

type private State2 = {
    mutable CallStack: CallStackStateOLD2 list;
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

let rec private evaluate (env: Environment) (expr: Expression) =
    match expr.Expr with
    | Literal x -> x
    // HACK this should probably make sure it's not a function or procedure...
    | Identifier name ->
        try env.[name]
        with :? System.Collections.Generic.KeyNotFoundException ->
            runtimeError expr.Meta ErrorCode.UnknownIdentifier (sprintf "Unknown identifier %s." name)
    | Evaluate {Identifier=name; Arguments=argExpr} ->
        let argVals = List.map (evaluate env) argExpr
        try
            let func = env.[name] :?> Function
            let args = Seq.zip func.Parameters argVals |> Map.ofSeq
            evaluate (env.PushScope args) func.Body
        with
        | :? System.Collections.Generic.KeyNotFoundException -> runtimeError expr.Meta ErrorCode.UnknownIdentifier (sprintf "Unknown identifier %s." name)
        | :? System.InvalidCastException -> runtimeError expr.Meta ErrorCode.TypeError "Identifier is not a function"
    | Query query ->
        raise (System.NotSupportedException "queries not supported for this evaluation algo")

type private Context<'S> = {
    Simulator: Robot.IRobotSimulator<'S>;
    Environment: Environment;
}

/// Do the intial work for executing a procedure that is common to all implementations.
/// Namely, evaluate the arguments, find the procedure, and add the parameters into the environment.
let rec private prepareExecute meta (exec:Execute) env =
    let argVals = List.map (evaluate env) exec.Arguments
    try
        let proc = env.[exec.Identifier] :?> Procedure
        let args = Seq.zip proc.Parameters argVals |> Map.ofSeq
        (env.PushScope args, proc)
    with
    | :? System.Collections.Generic.KeyNotFoundException -> runtimeError meta ErrorCode.UnknownIdentifier (sprintf "Unknown identifier %s." exec.Identifier)
    | :? System.InvalidCastException -> runtimeError meta ErrorCode.TypeError "Identifier is not a procedure"

/// Fully execute a statement, with no explicit stack.
/// Intended primarily as un-optimized reference implementation.
/// NOTE: Does NOT contain any limitations on callstack depth or program execution length!
let rec private executeStatementToEnd (ctx:Context<_>) (stmt:Statement) =
    match stmt.Stmt with
    | Conditional {Condition=cond; Then=thenb; Else=elseb} ->
        let b =
            try evaluate ctx.Environment cond :?> bool
            with :? System.InvalidCastException -> runtimeError cond.Meta ErrorCode.TypeError "Conditional expression is not a bool"
        if b
        then executeBlockToEnd ctx thenb
        else executeBlockToEnd ctx elseb
    | Repeat {Body=body; NumTimes=ntimesExpr} ->
        let ntimes = evaluate ctx.Environment ntimesExpr |> valueAsInt stmt.Meta
        let mutable tmpCtx = ctx
        for i = 1 to ntimes do
            tmpCtx <- executeBlockToEnd tmpCtx body
        tmpCtx
    | Function func ->
        {ctx with Environment=ctx.Environment.AddGlobal (func.Name, func)}
    | Procedure proc ->
        {ctx with Environment=ctx.Environment.AddGlobal (proc.Name, proc)}
    | Execute exec ->
        let env, proc = prepareExecute stmt.Meta exec ctx.Environment
        executeBlockToEnd {ctx with Environment=env} proc.Body |> ignore
        // ignore the new context, we want the old environment and the mutable state is already reference by the current context
        ctx
    | Command {Name=cmd; Arguments=args} ->
        let args = List.map (evaluate ctx.Environment) args
        ctx.Simulator.Execute {Name=cmd; Args=args}
        ctx

and private executeBlockToEnd (ctx:Context<_>) (block:Statement list) =
    let mutable tmpCtx = ctx
    for s in block do
        tmpCtx <- (executeStatementToEnd tmpCtx s)
    tmpCtx

/// Fully execute a program, with no explicit stack.
/// Intended primarily as un-optimized reference implementation.
/// NOTE: Does NOT contain any limitations on callstack depth or program execution length!
let ExecuteToEnd (program:Program) robotSimulator globals =
    executeBlockToEnd {Environment=Environment.Create globals; Simulator=robotSimulator} program.Body |> ignore
    robotSimulator.CurrentState

let rec private evaluateOLD (csstate: CallStackStateOLD) (expr: Expression) =
    match expr.Expr with
    | Literal x -> x
    // HACK this should probably make sure it's not a function or procedure...
    | Identifier name ->
        try csstate.Environment.[name]
        with :? System.Collections.Generic.KeyNotFoundException ->
            runtimeError expr.Meta ErrorCode.UnknownIdentifier (sprintf "Unknown identifier %s." name)
    | Evaluate {Identifier=name; Arguments=argExpr} ->
        let argVals = List.map (evaluateOLD csstate) argExpr
        try
            let func = csstate.Environment.[name] :?> Function
            let args = Seq.zip func.Parameters argVals |> Map.ofSeq
            let env = csstate.Environment.PushScope args
            evaluateOLD {csstate with Environment=env} func.Body
        with
        | :? System.Collections.Generic.KeyNotFoundException -> runtimeError expr.Meta ErrorCode.UnknownIdentifier (sprintf "Unknown identifier %s." name)
        | :? System.InvalidCastException -> runtimeError expr.Meta ErrorCode.TypeError "Identifier is not a function"
    | Query query ->
        match csstate.Robot with
        | None -> runtimeError expr.Meta ErrorCode.RobotUnavailable "Queries not allowed; robot not available"
        | Some robot ->
            let args = List.map (evaluateOLD csstate) query.Arguments
            try robot.Query {Name=query.Name; Args=ImmArr.ofSeq args}
            with e -> runtimeErrorWE e expr.Meta ErrorCode.QueryError "query threw exception"

let rec private evaluate2 (csstate: CallStackStateOLD2) (expr: Expression) =
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

type private CallStackState = {
    ToExecute: Statement list;
    Environment: Environment;
}

type private ProgramState<'S> = {
    mutable CallStack: CallStackState list;
    mutable LastExecuted: Statement list;
    Simulator: Robot.IRobotSimulator<'S>;
    /// maximum number of level allowed on the callstack
    CallStackLimit: int;
} with
    member x.PushCallStack meta css =
        if x.CallStack.Length >= x.CallStackLimit then runtimeError meta ErrorCode.StackOverflow "max callstack length exceeded"
        x.CallStack <- css :: x.CallStack

let private createNewProgramState (program:Program) robotSimulator globals =
    {
        CallStack = [{ToExecute=program.Body; Environment=Environment.Create globals}];
        LastExecuted = [];
        Simulator = robotSimulator;
        CallStackLimit = 3000;
    }

/// Execute a single statement (or pop that state stack).
/// Intended primarily for a lazy simulation, or a reference implementation for computing all states.
let private executeNextStatement (state:ProgramState<_>) : Statement option * Robot.Command option =
    match state.CallStack with
    | [] -> (None, None)
    | head :: tail ->
        match head.ToExecute with
        | [] ->
            state.CallStack <- tail
            (None, None)
        | stmt :: next ->
            // update toExecute before simulating, because we want to advance to the next statement even if a RuntimeError is thrown.
            state.CallStack <- {head with ToExecute=next} :: tail
            let env = head.Environment

            // update last executed
            if state.LastExecuted.Length < state.CallStack.Length then
                state.LastExecuted <- stmt :: state.LastExecuted
            else
                state.LastExecuted <- stmt :: MyList.skip (1 + state.LastExecuted.Length - state.CallStack.Length) state.LastExecuted

            let mutable cmdopt = None

            match stmt.Stmt with
            | Conditional {Condition=cond; Then=thenb; Else=elseb} ->
                let b =
                    try evaluate env cond :?> bool
                    with :? System.InvalidCastException -> runtimeError cond.Meta ErrorCode.TypeError "Conditional expression is not a bool"
                state.PushCallStack stmt.Meta {head with ToExecute=if b then thenb else elseb}
            | Repeat {Body=body; NumTimes=ntimesExpr} ->
                let ntimes = evaluate env ntimesExpr |> valueAsInt stmt.Meta
                if ntimes > 0 then
                    // lazily unroll repeat by adding a fake repeat for ntimes - 1 once the stack returns
                    // HACK use the same meta so that statement highlighting works correctly
                    let after = {Stmt=Repeat {Body=body; NumTimes=Expression.Create (Literal (ntimes - 1))}; Meta=stmt.Meta}
                    // modify call stack in two operations. want to use PushCallStack to catch stack overflows.
                    state.CallStack <- {head with ToExecute=after :: next} :: tail
                    state.PushCallStack stmt.Meta {head with ToExecute=body}
            | Function func ->
                state.CallStack <- {head with Environment=head.Environment.AddGlobal (func.Name, func)} :: tail
            | Procedure proc ->
                state.CallStack <- {head with Environment=head.Environment.AddGlobal (proc.Name, proc)} :: tail
            | Execute exec ->
                let env, proc = prepareExecute stmt.Meta exec head.Environment
                state.PushCallStack stmt.Meta {head with Environment=env; ToExecute=proc.Body}
            | Command {Name=name; Arguments=args} ->
                let args = List.map (evaluate head.Environment) args
                let command: Robot.Command = {Name=name; Args=args}
                state.Simulator.Execute command
                cmdopt <- Some command

            (Some stmt, cmdopt)

let private tryExecuteNextStatement (state:ProgramState<_>) =
    try Choice1Of2 (executeNextStatement state)
    with
    | :? CodeException as e -> Choice2Of2 (e.Error :?> RuntimeError)
    | e -> Choice2Of2 (makeInternalError e)

let private executeSteps onStep (state:ProgramState<_>) =
    let mutable doExecute = true
    while doExecute && not state.CallStack.IsEmpty do
        doExecute <- onStep (tryExecuteNextStatement state)

type StateData<'S> = {
     State: 'S;
     LastExecuted: Statement list;
     Command: Robot.Command option;
}

let CollectAllStates program robotSimulator globals maxSteps =
    let ps = createNewProgramState program robotSimulator globals
    let states = MutableList ()
    states.Add {State=robotSimulator.CurrentState; Command=None; LastExecuted=ps.LastExecuted}
    let maxSteps = match maxSteps with Some m -> m | None -> System.Int32.MaxValue

    let steps = ref 0
    ps |> executeSteps (fun result ->
        steps := 1 + !steps
        match result with
        | Choice1Of2 (_, (Some c as cmd)) ->
            states.Add {State=robotSimulator.CurrentState; Command=cmd; LastExecuted=ps.LastExecuted}
        | _ -> ()
        maxSteps > !steps
    )
    // always add a final state after the last step (assume the last thing was NOT a command)
    // this will make it line up with other implementations that add a final state after the last step
    states.Add {State=robotSimulator.CurrentState; Command=None; LastExecuted=ps.LastExecuted}

    states.ToArray ()

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
                    try evaluateOLD head cond :?> bool
                    with :? System.InvalidCastException -> runtimeError cond.Meta ErrorCode.TypeError "Conditional expression is not a bool"
                state.Push stmt.Meta {head with ToExecute=if b then thenb else elseb}
                None
            | Repeat {Body=body; NumTimes=ntimesExpr} ->
                let ntimes = evaluateOLD head ntimesExpr |> valueAsInt stmt.Meta
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
                let argVals = List.map (evaluateOLD head) argExpr
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
                let args = List.map (evaluateOLD head) args
                Some (Robot.CommandOLD (cmd, ImmArr.ofSeq args, state.LastExecuted))

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
                Some (({Name=cmd; Args=args}:Robot.Command))

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
    Command: Robot.CommandOLD;
    WorldState: obj;
}

[<ReferenceEquality;NoComparison>]
type StateResult2 = {
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

type LocalMap = Map<string,int>

let valMapToLocalMap (vals:ValueMap) =
    vals |> Map.map (fun k v -> v :?> int)

let localMapToValMap (vals:Map<string,int>) =
    vals |> Map.map (fun k v -> v :> obj)

type ConcreteStatement =
// procedure name, args
// HACK this only works for integer parameters, boo yah
| CExecute of string * int list
// ast id
| CRepeatBody of int * LocalMap
// ast id, numTimes
| CRepeat of int * LocalMap * int
| CCommand of Robot.Command


type private ContextOLD<'State> = {
    Environment: Environment;
    State: 'State;
}

type StateFunctions<'State, 'StateDelta> = {
    Empty: 'StateDelta;
    Combine: 'StateDelta -> 'StateDelta -> 'StateDelta;
    Create: Robot.Command -> 'StateDelta;
    ApplyDelta: 'State -> 'StateDelta -> 'State option;
    ApplyCommand: 'State -> Robot.Command -> 'State
}

type CacheData<'StateDelta> = {
    Delta: 'StateDelta;
    NumStates: int;
}

let private concretizeStatement (ctx:ContextOLD<_>) (stmt:Statement) : ConcreteStatement option =
    match stmt.Stmt with
    | Repeat {Body=body; NumTimes=ntimesExpr} ->
        let ntimes = evaluate ctx.Environment ntimesExpr |> valueAsInt stmt.Meta
        Some (CRepeat (stmt.Meta.Id, valMapToLocalMap ctx.Environment.Locals, ntimes))
    | Execute {Identifier=name; Arguments=argExpr} ->
        let argVals = List.map (fun e -> (evaluate ctx.Environment e) :?> int) argExpr
        Some (CExecute (name, argVals))
    | Command {Name=cmd; Arguments=args} ->
        let args = List.map (evaluate ctx.Environment) args
        Some (CCommand {Name=cmd; Args=args})
    | _ -> None

let private isolatedState prog env toExec =
    {Program=prog; CallStack=[{Environment=env; ToExecute=toExec; Robot=None}]; LastExecuted=[];}:State

type OptimizedRunner<'State, 'StateDelta> (program:Program, globals:ValueMap, sfuncs:StateFunctions<'State, 'StateDelta>, cache: MutableDict<ConcreteStatement, CacheData<'StateDelta>>) =
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

    let rec executeWithCache (ctx:ContextOLD<'State>) (stmt:Statement) =
        match concretizeStatement ctx stmt with
        // assumes commands are concretizable statements, and thus any non-concretizable statement has no delta
        | None ->
            (executeWithoutCache ctx stmt, {Delta=sfuncs.Empty; NumStates=0})
        | Some concrete ->
            let result = getCached ctx concrete
            let s = ctx.State
            let d = result.Delta
            match sfuncs.ApplyDelta ctx.State result.Delta with
            | Some s -> ({ctx with State=s}, result)
            | None ->
                // even if we fail to apply it, it's still the correct delta
                (executeWithoutCache ctx stmt, result)

    and getCached (ctx:ContextOLD<_>) (concrete:ConcreteStatement): CacheData<'StateDelta> =
        let (b,v) = cache.TryGetValue concrete
        if b
        then v
        else
            let cr = createCached ctx concrete
            cache.Add (concrete, cr)
            cr

    and createCached (ctx:ContextOLD<_>) (concrete:ConcreteStatement) =
        match concrete with
        | CRepeat (nodeId, lmap, numTimes) ->
            // assumes context has the correct local map already
            let bodyResult = getCached ctx (CRepeatBody (nodeId, lmap))
            let delta = Seq.init numTimes (fun _ -> bodyResult.Delta) |> Seq.fold sfuncs.Combine sfuncs.Empty
            {Delta=delta; NumStates=bodyResult.NumStates * numTimes}
        | CRepeatBody (nodeId, lmap) ->
            let stmt = (findStatementWithId nodeId fullProgram).Stmt.AsRepeat ()
            createDeltaForBlock ctx stmt.Body
        | CExecute (name, argVals) ->
            let proc = ctx.Environment.[name] :?> Procedure
            let args = Seq.zip proc.Parameters (Seq.map (fun x -> x :> obj) argVals) |> Map.ofSeq
            let env = ctx.Environment.PushScope args
            createDeltaForBlock {ctx with Environment=env} proc.Body
        | CCommand cmd ->
            let delta = sfuncs.Create cmd
            {Delta=delta; NumStates=1}

    and createDeltaForBlock (ctx:ContextOLD<_>) (block:Statement list) =
        let mutable tmpCtx = ctx
        let mutable delta = sfuncs.Empty
        let mutable numStates = 0
        for s in block do
            let c, d = executeWithCache tmpCtx s
            tmpCtx <- c
            delta <- sfuncs.Combine delta d.Delta
            numStates <- numStates + d.NumStates
        {Delta=delta; NumStates=numStates}

    and executeWithoutCache (ctx:ContextOLD<'State>) (stmt:Statement) =
        match stmt.Stmt with
        | Conditional {Condition=cond; Then=thenb; Else=elseb} ->
            let b =
                try evaluate ctx.Environment cond :?> bool
                with :? System.InvalidCastException -> runtimeError cond.Meta ErrorCode.TypeError "Conditional expression is not a bool"
            if b
            then executeBlock ctx thenb
            else executeBlock ctx elseb
        | Repeat {Body=body; NumTimes=ntimesExpr} ->
            let ntimes = evaluate ctx.Environment ntimesExpr |> valueAsInt stmt.Meta
            let mutable tmpCtx = ctx
            for i = 1 to ntimes do
                tmpCtx <- executeBlock tmpCtx body
            tmpCtx
        | Function func ->
            {ctx with Environment=ctx.Environment.AddGlobal (func.Name, func)}
        | Procedure proc ->
            {ctx with Environment=ctx.Environment.AddGlobal (proc.Name, proc)}
        | Execute {Identifier=name; Arguments=argExpr} ->
            let argVals = List.map (evaluate ctx.Environment) argExpr
            try
                let proc = ctx.Environment.[name] :?> Procedure
                let args = Seq.zip proc.Parameters argVals |> Map.ofSeq
                let env = ctx.Environment.PushScope args
                let newCtx = executeBlock {ctx with Environment=env} proc.Body
                {Environment=ctx.Environment; State=newCtx.State}
            with
            | :? System.Collections.Generic.KeyNotFoundException -> runtimeError stmt.Meta ErrorCode.UnknownIdentifier (sprintf "Unknown identifier %s." name)
            | :? System.InvalidCastException -> runtimeError stmt.Meta ErrorCode.TypeError "Identifier is not a procedure"
        | Command {Name=cmd; Arguments=args} ->
            let args = List.map (evaluate ctx.Environment) args
            let cmd: Robot.Command = {Name=cmd; Args=args}
            {ctx with State=sfuncs.ApplyCommand ctx.State cmd}

    and executeBlock (ctx:ContextOLD<'State>) (block:Statement list) =
        let mutable tmpCtx = ctx
        for s in block do
            tmpCtx <- fst (executeWithCache tmpCtx s)
        tmpCtx

    let rec executeToStateIndex (ctx:ContextOLD<'State>) (stmt:Statement) (statesRemaining:int) =
        match statesRemaining, concretizeStatement ctx stmt with
        // no states remaining means stop running things
        | 0, _ -> (ctx, 0)
        // any non-concretizable statements take up no states
        | _, None -> (fst (executeWithCache ctx stmt), 0)
        | _, Some concrete ->
            let result = getCached ctx concrete
            // if we have extra states remaining, just run it
            if result.NumStates <= statesRemaining
            then
                (fst (executeWithCache ctx stmt), result.NumStates)
                // otherwise, we need to recurse into the statement
            else
                executeToStateIndexConcrete ctx concrete statesRemaining

    and executeToStateIndexConcrete (ctx:ContextOLD<'State>) (concrete:ConcreteStatement) (statesRemaining:int) =
        match concrete with
        | CRepeat (nodeId, lmap, numTimes) ->
            // assumes context has the correct local map already
            let cbody = CRepeatBody (nodeId, lmap)
            let bodyResult = getCached ctx cbody
            let mutable remaining = statesRemaining
            let mutable tmpCtx = ctx
            for i = 1 to numTimes do
                if remaining > 0 then
                    let c, r = executeToStateIndexConcrete tmpCtx cbody remaining
                    tmpCtx <- c
                    remaining <- remaining - r
            (tmpCtx, statesRemaining - remaining)
        | CRepeatBody (nodeId, lmap) ->
            let stmt = (findStatementWithId nodeId fullProgram).Stmt.AsRepeat ()
            executeToStateIndexBlock ctx stmt.Body statesRemaining
        | CExecute (name, argVals) ->
            let proc = ctx.Environment.[name] :?> Procedure
            let args = Seq.zip proc.Parameters (Seq.map (fun x -> x :> obj) argVals) |> Map.ofSeq
            let env = ctx.Environment.PushScope args
            executeToStateIndexBlock {ctx with Environment=env} proc.Body statesRemaining
        | _ -> invalidOp ""

    and executeToStateIndexBlock (ctx:ContextOLD<'State>) (block:Statement list) (statesRemaining:int) =
        let mutable tmpCtx = ctx
        let mutable remaining = statesRemaining
        for s in block do
            if remaining > 0 then
                let c, n = executeToStateIndex tmpCtx s remaining
                tmpCtx <- c
                remaining <- remaining - n

        (tmpCtx, statesRemaining - remaining)

    member x.RunToFinal (startState:'State) =
        let ctx = {Environment={Globals=globals; Locals=Map.empty}; State=startState}
        (executeBlock ctx program.Body).State

    member x.RunToState (startState:'State) (numStates:int) =
        let ctx = {Environment={Globals=globals; Locals=Map.empty}; State=startState}
        (fst (executeToStateIndexBlock ctx program.Body numStates)).State

let RunOptimized37 p b f c s = OptimizedRunner(p,b,f,c).RunToFinal s
let RunToState p b f c s n = OptimizedRunner(p,b,f,c).RunToState s n

let private evalProcedureReference2 meta (head:CallStackStateOLD2) name =
    try
        head.Environment.[name] :?> Procedure
    with
    | :? System.Collections.Generic.KeyNotFoundException -> runtimeError meta ErrorCode.UnknownIdentifier (sprintf "Unknown identifier %s." name)
    | :? System.InvalidCastException -> runtimeError meta ErrorCode.TypeError "Identifier is not a procedure"

let SimulateWithRobot program builtIns (robot:Robot.IRobotSimulatorOLD) =
    let MAX_ITER = 100000000
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

let SimulateWithRobotLastSateOnly program builtIns (robot:Robot.IRobotSimulatorOLD) : StateResult =
    let MAX_ITER = 100000000
    let simstate = createState program builtIns (Some robot)

    let mutable numSteps = 0
    while not (IsDone simstate) && numSteps < MAX_ITER do
        numSteps <- numSteps + 1
        match tryStep simstate with
        | Choice1Of2 None -> ()
        | Choice1Of2 (Some cmd) ->
            robot.Execute cmd
        | Choice2Of2 error -> ()

    {Command=null; WorldState=robot.CurrentState}


let SimulateWithRobot2 program builtIns (robot:Robot.IRobotSimulatorOLD2) =
    let MAX_ITER = 100000000
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

let SimulateWithRobot2LastStateOnly program builtIns (robot:Robot.IRobotSimulatorOLD2) =
    let MAX_ITER = 100000000
    let simstate = createState2 program builtIns (Some robot)

    let mutable numSteps = 0
    while not (IsDone2 simstate) && numSteps < MAX_ITER do
        numSteps <- numSteps + 1
        match tryStep2 simstate with
        | Choice1Of2 None -> ()
        | Choice1Of2 (Some cmd) ->
            robot.Execute cmd
        | Choice2Of2 error -> ()

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
