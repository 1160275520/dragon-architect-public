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

let private runtimeError (meta:Ast.Imperative.Meta) (code: ErrorCode) msg =
    raise (CodeException (RuntimeError (int code, meta.Id, msg, null)))
let private runtimeErrorWE exn (meta:Ast.Imperative.Meta) (code: ErrorCode) msg =
    raise (CodeException (RuntimeError (int code, meta.Id, msg, exn)))

type private CallStackState = {
    Values: Map<string,obj>;
    mutable ToExecute: Statement list;
    Robot: Robot.IRobotSimulator option
}

type private State = {
    mutable CallStack: CallStackState list;
    mutable LastExecuted: Statement list;
}
with
    member x.Push css = x.CallStack <- css :: x.CallStack

let private valueAsInt meta (o:obj) =
    match o with
    | :? int as x -> x
    | :? string as s ->
        try System.Int32.Parse(s)
        with _ -> runtimeError meta ErrorCode.UnableToConvertToInteger (sprintf "cannot convert '%s' to integer" s)
    | _ -> runtimeError meta ErrorCode.UnableToConvertToInteger "cannot coerce object to integer"

let private createState (program:Program) builtInValues robot =
    {CallStack=[{Values=builtInValues; ToExecute=program.Body; Robot=robot}]; LastExecuted=[];}

let rec private evaluate (csstate: CallStackState) (expr: Expression) =
    match expr.Expr with
    | Literal x -> x
    // HACK this should probably make sure it's not a function or procedure...
    | Identifier name ->
        try csstate.Values.[name]
        with :? System.Collections.Generic.KeyNotFoundException ->
            runtimeError expr.Meta ErrorCode.UnknownIdentifier (sprintf "Unknown identifier %s." name)
    | Evaluate {Identifier=name; Arguments=argExpr} ->
        let argVals = List.map (evaluate csstate) argExpr
        try
            let func = csstate.Values.[name] :?> Function
            let args = Seq.zip func.Parameters argVals |> Map.ofSeq
            let newVals = MyMap.merge csstate.Values args
            evaluate {csstate with Values=newVals} func.Body
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
                state.Push {head with ToExecute=if b then thenb else elseb}
                None
            | Repeat {Body=body; NumTimes=ntimesExpr} ->
                let ntimes = evaluate head ntimesExpr |> valueAsInt stmt.Meta
                let toAdd = List.concat (List.init ntimes (fun _ -> body))
                state.Push {head with ToExecute=toAdd}
                None
            | Function func ->
                state.CallStack <- {head with Values=head.Values.Add (func.Name, func)} :: tail
                None
            | Procedure proc ->
                state.CallStack <- {head with Values=head.Values.Add (proc.Name, proc)} :: tail
                None
            | Execute {Identifier=name; Arguments=argExpr} ->
                let argVals = List.map (evaluate head) argExpr
                try
                    let proc = head.Values.[name] :?> Procedure
                    let args = Seq.zip proc.Parameters argVals |> Map.ofSeq
                    let newVals = MyMap.merge head.Values args
                    state.Push {head with Values=newVals; ToExecute=proc.Body}
                with
                | :? System.Collections.Generic.KeyNotFoundException -> runtimeError stmt.Meta ErrorCode.UnknownIdentifier (sprintf "Unknown identifier %s." name)
                | :? System.InvalidCastException -> runtimeError stmt.Meta ErrorCode.TypeError "Identifier is not a procedure"
                None
            | Command {Name=cmd; Arguments=args} ->
                if head.Robot.IsNone then runtimeError stmt.Meta ErrorCode.RobotUnavailable "Commands not allowed; robot not available"
                let args = List.map (evaluate head) args
                Some (Robot.Command (cmd, ImmArr.ofSeq args))

let private internalError e = 
    raise (CodeException (RuntimeError (int ErrorCode.InternalError, -1, "Internal runtime error.", e)))
    
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

// NOTE: just use reference equality, and be careful to always send the exact object
// structural equality would simply be too expensive to usefully evaluate
[<ReferenceEquality;NoComparison>]
type StepState = {
    Command: Robot.Command;
    LastExecuted: Statement list;
    WorldState: obj;
}

type LazySimulator (program, builtIns, robot) =
    let state = createState program builtIns (Some robot)
    let initialState = {Command=null; LastExecuted=[]; WorldState=robot.CurrentState}

    member x.IsDone = IsDone state

    member x.InitialState = initialState

    member x.Step () =
        let cmd = ExecuteUntilCommand state
        robot.Execute cmd
        {Command=cmd; LastExecuted=state.LastExecuted; WorldState=robot.CurrentState}

let SimulateWithRobot program builtIns (robot:Robot.IRobotSimulator) =
    try
        let MAX_ITER = 10000
        let state = createState program builtIns (Some robot)
        let steps = System.Collections.Generic.List ()
        // add "start" state
        steps.Add {Command=null; LastExecuted=[]; WorldState=robot.CurrentState}
        let mutable isDone = false
        let mutable numSteps = 0
        while not (IsDone state) && numSteps < MAX_ITER do
            match step state with
            | Some cmd ->
                robot.Execute cmd
                steps.Add {Command=cmd; LastExecuted=state.LastExecuted; WorldState=robot.CurrentState}
            | None -> ()
            numSteps <- numSteps + 1

        ImmArr.ofArray (steps.ToArray ())
    with
    | :? CodeException -> reraise ()
    | e -> internalError e

// given a program, executes it, returning the map of names and values generated by the program
let import program =
    try
        // HACK first wipe the programs ids so they don't clash with things
        let program = mapMeta (fun m -> {m with Id=0}) program

        let state = createState program Map.empty None
        let mutable vals = Map.empty
        while not (IsDone state) do
            vals <- state.CallStack.Head.Values
            step state |> ignore
        vals
    with
    | :? CodeException -> reraise ()
    | e -> internalError e
