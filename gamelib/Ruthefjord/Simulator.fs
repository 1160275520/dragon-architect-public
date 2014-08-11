/// Simulator for the in-game programs.
/// See Ast.fs, Grid.fs, Robot.fs
module Ruthefjord.Simulator

open Ruthefjord
open Ruthefjord.Ast.Imperative
open Ruthefjord.Ast.Library
open System.Collections.Generic

type RuntimeErrorCode =
| InternalError = 4001
| UnknownProcedure = 4101
| UnableToConvertToInteger = 4102
| IncorrectNumberOfArguments = 4103

let private runtimeError (meta:Ast.Imperative.Meta) (code: RuntimeErrorCode) msg =
    raise (CodeException (RuntimeError (int code, meta.Id, msg, null)))

type CallStackState = {
    Args: Map<string,obj>;
    Program: Program;
    mutable ToExecute: Statement list;
}

type private State = {
    mutable CallStack: CallStackState list;
    mutable LastExecuted: Statement list;
}

let private getProc (program:Program, procname:string) =
    match program.Procedures.TryFind procname with
    | None ->
        match program.Modules.TryFind procname with
        | None ->
            match Builtins.TryFind procname with
            | None -> runtimeError (Ast.Imperative.NewMeta 0) RuntimeErrorCode.UnknownProcedure (sprintf "procedure '%s' does not exist" procname)
            | Some x -> (program, x.Parameters, List.ofSeq x.Body)
        | Some m -> (m, ImmArr.empty, [Ast.Imperative.NewCall0 0 "MAIN"])
    | Some x -> (program, x.Parameters, List.ofSeq x.Body)

let private exprAsInt meta (o:obj) =
    match o with
    | :? int as x -> x
    | :? string as s ->
        try System.Int32.Parse(s)
        with _ -> runtimeError meta RuntimeErrorCode.UnableToConvertToInteger (sprintf "cannot convert '%s' to integer" s)
    | _ -> runtimeError meta RuntimeErrorCode.UnableToConvertToInteger "cannot coerce object to integer"

let private CreateState program mainProcName =
    {CallStack=[{Args=Map.empty; Program=program; ToExecute=[Ast.Imperative.NewCall0 0 mainProcName];}]; LastExecuted=[];}

let private Evaluate (state:State) meta expression =
    match expression with
    | Literal x -> x
    | Argument name ->
        try state.CallStack.Head.Args.[name]
        with :? System.IndexOutOfRangeException as e -> runtimeError meta RuntimeErrorCode.IncorrectNumberOfArguments (sprintf "Invalid argument %s." name)

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
            | Block b ->
                state.CallStack <- {head with Args=head.Args; ToExecute=List.ofSeq b} :: state.CallStack
                None
            | Call {Proc=procname; Args=args} ->
                let args = ImmArr.map (Evaluate state stmt.Meta) args
                let prog, param, toexec = getProc (head.Program, procname)
                let argsName = Seq.zip param args |> Map.ofSeq
                state.CallStack <- {head with Args=argsName; Program=prog; ToExecute=toexec} :: state.CallStack
                None
            | Repeat {Stmt=stmt; NumTimes=ntimesExpr} ->
                let ntimes = Evaluate state stmt.Meta ntimesExpr |> exprAsInt stmt.Meta
                let toAdd = List.init ntimes (fun _ -> stmt)
                state.CallStack <- {head with ToExecute=toAdd} :: state.CallStack
                None
            | Command (cmd, args) ->
                let args = ImmArr.map (Evaluate state stmt.Meta) args
                Some (Robot.Command (cmd, args))

let private internalError e = 
    raise (CodeException (RuntimeError (int RuntimeErrorCode.InternalError, -1, "Internal runtime error.", e)))

/// Executes a single line of the program, returning a robot command, if any.
let private ExecuteStep state =
    try step state
    with
    | :? CodeException -> reraise ()
    | e -> internalError e

/// Executes the program until a BasicCommand is hit, then returns that command, or None if the program has finished.
let private ExecuteUntilCommand state =
    try
        let mutable cmd = None
        while cmd.IsNone && not state.CallStack.IsEmpty do
            cmd <- step state
        match cmd with Some c -> c | None -> null
    with
    | :? CodeException -> reraise ()
    | e -> internalError e

let inline private IsDone (state:State) = state.CallStack.IsEmpty

// NOTE: just use reference equality, and be careful to always send the exact object
// structural equality would simply be too expensive to usefully evaluate
[<ReferenceEquality;NoComparison>]
type StepState = {
    Command: Robot.Command;
    LastExecuted: Statement list;
    Robot: Robot.IRobot;
    Grid: ImmArr<KeyValuePair<IntVec3,Block>>;
}

type LazyStepState = {
    Command: Robot.Command;
    LastExecuted: Statement list;
}

type LazySimulator (program) =
    let state = CreateState program "MAIN"

    member x.IsDone = IsDone state

    member x.Step () =
        let cmd = ExecuteUntilCommand state
        {Command=cmd; LastExecuted=state.LastExecuted}

let ExecuteProgramLazily program =
    let state = CreateState program "MAIN"
    seq {
        yield {Command=null; LastExecuted=[]}
        while not (IsDone state) do
            let cmd = ExecuteUntilCommand state
            if cmd <> null then
                yield {Command=cmd; LastExecuted=state.LastExecuted}
            else System.Diagnostics.Debug.Assert(IsDone state, "execute until command returned a null command when program was not done!")
    }

let SimultateWorld (grid:IGrid) (robots: (Robot.IRobot * LazyStepState[])[]) =

    let bots = Array.map fst robots
    let steps = robots |> Array.map (fun (_,arr) -> arr |> Array.map (fun s -> s.Command))

    let commands = Array2D.create (Array.maxBy Array.length steps).Length bots.Length null

    for botIdx = 0 to steps.Length - 1 do
        let arr = steps.[botIdx]
        for stepIdx = 0 to arr.Length - 1 do
            commands.[stepIdx,botIdx] <- arr.[stepIdx]

    for stepIdx = 0 to (commands.GetLength 0) - 1 do
        for botIdx = 0 to bots.Length - 1 do
            bots.[botIdx].Execute grid commands.[stepIdx,botIdx]

    grid

let ExecuteFullProgram program (grid:GridStateTracker) (robot:Robot.IRobot) =
    try
        let MAX_ITER = 10000
        let state = CreateState program "MAIN"
        let mutable steps = [{Command=null; LastExecuted=[]; Robot=robot.Clone; Grid=grid.CurrentState}]
        let mutable isDone = false
        let mutable numSteps = 0
        while not (IsDone state) && numSteps < MAX_ITER do
            let cmd = ExecuteUntilCommand state
            if cmd <> null then
                robot.Execute grid cmd
                steps <- {Command=cmd; LastExecuted=state.LastExecuted; Robot=robot.Clone; Grid=grid.CurrentState} :: steps
                numSteps <- numSteps + 1
            else System.Diagnostics.Debug.Assert(IsDone state, "execute until command returned a null command when program was not done!")

        ImmArr.ofSeq (List.rev steps)
    with
    | :? CodeException -> reraise ()
    | e -> internalError e
