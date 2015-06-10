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

let private valueAsInt meta (o:obj) =
    match o with
    | :? int as x -> x
    | :? string as s ->
        try System.Int32.Parse(s)
        with _ -> runtimeError meta ErrorCode.UnableToConvertToInteger (sprintf "cannot convert '%s' to integer" s)
    | _ -> runtimeError meta ErrorCode.UnableToConvertToInteger "cannot coerce object to integer"

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

type CallStackState = {
    ToExecute: Statement list;
    Environment: Environment;
}

type ProgramState<'S> = {
    mutable CallStack: CallStackState list;
    mutable LastExecuted: Statement list;
    Simulator: Robot.IRobotSimulator<'S>;
    /// maximum number of level allowed on the callstack
    CallStackLimit: int;
} with
    member x.PushCallStack meta css =
        if x.CallStack.Length >= x.CallStackLimit then runtimeError meta ErrorCode.StackOverflow "max callstack length exceeded"
        x.CallStack <- css :: x.CallStack

    member x.Copy = {x with CallStackLimit=x.CallStackLimit}

let private createNewProgramState (program:Program) robotSimulator globals =
    {
        CallStack = [{ToExecute=program.Body; Environment=Environment.Create globals}];
        LastExecuted = [];
        Simulator = robotSimulator;
        CallStackLimit = 3000;
    }

let private popNextStatement (state:ProgramState<_>) : Statement option =
    match state.CallStack with
    | [] -> None
    | head :: tail ->
        match head.ToExecute with
        | [] ->
            state.CallStack <- tail
            None
        | stmt :: next ->
            // update toExecute before simulating, because we want to advance to the next statement even if a RuntimeError is thrown.
            state.CallStack <- {head with ToExecute=next} :: tail

            // update last executed
            if state.LastExecuted.Length < state.CallStack.Length then
                state.LastExecuted <- stmt :: state.LastExecuted
            else
                state.LastExecuted <- stmt :: MyList.skip (1 + state.LastExecuted.Length - state.CallStack.Length) state.LastExecuted

            Some stmt

/// Execute a single statement (or pop that state stack).
/// Intended primarily for a lazy simulation, or a reference implementation for computing all states.
let private executeNextStatement (state:ProgramState<_>) (stmt:Statement) : Robot.Command option =
    let mutable cmdopt = None
    let head = state.CallStack.Head
    let env = state.CallStack.Head.Environment

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
            state.CallStack <- {head with ToExecute=after :: head.ToExecute} :: state.CallStack.Tail
            state.PushCallStack stmt.Meta {head with ToExecute=body}
    | Function func ->
        state.CallStack <- {head with Environment=head.Environment.AddGlobal (func.Name, func)} :: state.CallStack.Tail
    | Procedure proc ->
        state.CallStack <- {head with Environment=head.Environment.AddGlobal (proc.Name, proc)} :: state.CallStack.Tail
    | Execute exec ->
        let env, proc = prepareExecute stmt.Meta exec head.Environment
        state.PushCallStack stmt.Meta {head with Environment=env; ToExecute=proc.Body}
    | Command {Name=name; Arguments=args} ->
        let args = List.map (evaluate head.Environment) args
        let command: Robot.Command = {Name=name; Args=args}
        state.Simulator.Execute command
        cmdopt <- Some command

    cmdopt

let private tryExecuteNextStatement (state:ProgramState<_>) =
    match popNextStatement state with
    | Some stmt ->
        let r =
            try stmt, executeNextStatement state stmt, None
            with
            | :? CodeException as e -> stmt, None, Some (e.Error :?> RuntimeError)
            | e -> stmt, None, Some (makeInternalError e)
        Some r
    | None -> None

let private executeSteps onStep (state:ProgramState<_>) =
    let mutable doExecute = true
    while doExecute && not state.CallStack.IsEmpty do
        doExecute <- onStep (tryExecuteNextStatement state)

type StateData<'S> = {
     State: 'S;
     LastExecuted: Statement list;
     Command: Robot.Command option;
}

let ExecuteNSteps state numSteps =
    let steps = ref 0
    let command = ref None
    if numSteps > 0 then
        state |> executeSteps (fun result ->
            match result with
            | Some (_, (Some c as cmd), _) ->
                steps := 1 + !steps
                command := cmd
            | _ -> ()
            numSteps > !steps
        )
    {State=state.Simulator.CurrentState; Command= !command; LastExecuted=state.LastExecuted}

let CollectAllStates program robotSimulator globals maxSteps =
    let ps = createNewProgramState program robotSimulator globals
    let states = MutableList ()
    states.Add {State=robotSimulator.CurrentState; Command=None; LastExecuted=ps.LastExecuted}
    let maxSteps = match maxSteps with Some m -> m | None -> System.Int32.MaxValue

    let steps = ref 0
    ps |> executeSteps (fun result ->
        steps := 1 + !steps
        match result with
        | Some (_, (Some c as cmd), _) ->
            states.Add {State=robotSimulator.CurrentState; Command=cmd; LastExecuted=ps.LastExecuted}
        | _ -> ()
        maxSteps > !steps
    )
    // always add a final state after the last step (assume the last thing was NOT a command)
    // this will make it line up with other implementations that add a final state after the last step
    states.Add {State=robotSimulator.CurrentState; Command=None; LastExecuted=ps.LastExecuted}

    states.ToArray ()

let CollectEveryNStates program robotSimulator globals jumpDist maxSteps =
    let ps = createNewProgramState program robotSimulator globals
    let states = MutableList ()
    states.Add (0, ps.Copy, {State=robotSimulator.CurrentState; Command=None; LastExecuted=ps.LastExecuted})
    let maxSteps = match maxSteps with Some m -> m | None -> System.Int32.MaxValue

    let steps = ref 0
    let counter = ref 0
    ps |> executeSteps (fun result ->
        steps := 1 + !steps
        match result with
        | Some (_, (Some c as cmd), _) ->
            counter := 1 + !counter
            if (!counter) % jumpDist = 0 then
                states.Add (!counter, ps.Copy, {State=robotSimulator.CurrentState; Command=cmd; LastExecuted=ps.LastExecuted})
        | _ -> ()
        maxSteps > !steps
    )
    // always add a final state after the last step (assume the last thing was NOT a command)
    // this will make it line up with other implementations that add a final state after the last step
    states.Add (1 + !counter, ps.Copy, {State=robotSimulator.CurrentState; Command=None; LastExecuted=ps.LastExecuted})

    states.ToArray ()

type LazySimulator<'S> (program, globals, robot:Robot.IRobotSimulator<'S>) =
    let ps = createNewProgramState program robot globals
    let initialState = {State=robot.CurrentState; Command=None; LastExecuted=ps.LastExecuted}

    member x.IsDone = ps.CallStack.IsEmpty

    member x.InitialState = initialState

    /// Step the simulation until either a state change or an error.
    member x.AdvanceOneCommand () =
        let cmd = ref None
        // run until next command
        ps |> executeSteps (fun result ->
            match result with
            | Some (_, (Some _ as c), _) ->
                cmd := c
                false
            | _ -> true
        )
        {State=robot.CurrentState; Command= !cmd; LastExecuted=ps.LastExecuted}

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
        let argVals = List.map (fun e -> (evaluate ctx.Environment e) |> valueAsInt stmt.Meta) argExpr
        Some (CExecute (name, argVals))
    | Command {Name=cmd; Arguments=args} ->
        let args = List.map (evaluate ctx.Environment) args
        Some (CCommand {Name=cmd; Args=args})
    | _ -> None

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

type EmptyRobotSimulator () =
    interface Robot.IRobotSimulator<int> with
        member x.CurrentState = invalidOp ""
        member x.Execute _ = invalidOp ""
        member x.Query _ = invalidOp ""

// given a program, executes it, returning the map of names and values generated by the program
let import (program:Program) =
    try
        // HACK first change the programs ids so they don't clash with things
        // these will conflict with each other if more than one program is imported!
        let program = mapMeta (fun m -> {m with Id=m.Id + 167000}) program
        let ctx = executeBlockToEnd {Simulator=EmptyRobotSimulator (); Environment=Environment.Create Map.empty} program.Body
        ctx.Environment.Globals
    with
    | :? CodeException -> reraise ()
    | e -> raise (CodeException (makeInternalError e))
