/// Simulator for the in-game programs.
/// See Ast.fs, Grid.fs, Robot.fs
module Hackcraft.Simulator

open Hackcraft
open Hackcraft.Ast.Imperative
open Hackcraft.Ast.Library
open System.Collections.Generic

type RuntimeErrorCode =
| InternalError = 4001
| UnknownProcedure = 4101
| UnableToConvertToInteger = 4102
| IncorrectNumberOfArguments = 4103

let private runtimeError (meta:Ast.Imperative.Meta) (code: RuntimeErrorCode) msg =
    raise (CodeException (RuntimeError (int code, meta.Id, msg, null)))

type CallStackState = {
    Args: ImmArr<obj>;
    Program: Program;
    mutable ToExecute: Statement list;
}

type State = {
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
            | Some x -> (program, List.ofSeq x.Body)
        | Some m -> (m, [Ast.Imperative.NewCall0 0 "MAIN"])
    | Some x -> (program, List.ofSeq x.Body)

let private exprAsInt meta (o:obj) =
    match o with
    | :? int as x -> x
    | :? string as s ->
        try System.Int32.Parse(s)
        with _ -> runtimeError meta RuntimeErrorCode.UnableToConvertToInteger (sprintf "cannot convert '%s' to integer" s)
    | _ -> runtimeError meta RuntimeErrorCode.UnableToConvertToInteger "cannot coerce object to integer"

let CreateState program mainProcName =
    {CallStack=[{Args=ImmArr.empty; Program=program; ToExecute=[Ast.Imperative.NewCall0 0 mainProcName];}]; LastExecuted=[];}

let Evaluate (state:State) meta expression =
    match expression with
    | Literal x -> x
    | Argument idx ->
        try state.CallStack.Head.Args.[idx]
        with :? System.IndexOutOfRangeException as e -> runtimeError meta RuntimeErrorCode.IncorrectNumberOfArguments (sprintf "Invalid argument index %d, arguments are only length %d" idx state.CallStack.Head.Args.Length)

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
                let prog, toexec = getProc (head.Program, procname)
                state.CallStack <- {head with Args=args; Program=prog; ToExecute=toexec} :: state.CallStack
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
let ExecuteStep state =
    try step state
    with
    | :? CodeException -> reraise ()
    | e -> internalError e

/// Executes the program until a BasicCommand is hit, then returns that command, or None if the program has finished.
let ExecuteUntilCommand state =
    try
        let mutable cmd = None
        while cmd.IsNone && not state.CallStack.IsEmpty do
            cmd <- step state
        match cmd with Some c -> c | None -> null
    with
    | :? CodeException -> reraise ()
    | e -> internalError e

let IsDone (state:State) = state.CallStack.IsEmpty

type StepState = {
    Command: Robot.Command;
    LastExecuted: Statement list;
    Robot: Robot.IRobot;
    Grid: ImmArr<KeyValuePair<IntVec3,Block>>;
}

let ExecuteProgramLazily program (grid:GridStateTracker) (robot:Robot.IRobot) =
    let state = CreateState program "MAIN"
    seq {
        yield {Command=null; LastExecuted=[]; Robot=robot.Clone; Grid=grid.CurrentState}
        while not (IsDone state) do
            let cmd = ExecuteUntilCommand state
            if cmd <> null then
                robot.Execute grid cmd
                yield {Command=cmd; LastExecuted=state.LastExecuted; Robot=robot.Clone; Grid=grid.CurrentState}
            else System.Diagnostics.Debug.Assert(IsDone state, "execute until command returned a null command when program was not done!")
    }

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
