module Hackcraft.Simulator

type RuntimeError(msg: string) =
    inherit System.Exception(sprintf "Runtime Error: %s" msg)

let private runtimeError (meta:Ast.Imperative.Meta) msg = raise (RuntimeError (sprintf "Error at id=%d: %s" meta.Id msg))

open Hackcraft.Ast.Imperative
open Hackcraft.Ast.Library

type CallStackState = {
    Args: ImmArr<obj>;
    mutable ToExecute: Statement list;
}

type State = {
    mutable CallStack: CallStackState list;
    mutable LastExecuted: Statement list;
}

let private getProc (program:Program) (procname:string) =
    let prog = 
        match program.Procedures.TryFind (procname.ToUpper ()) with
        | None ->
            match Builtins.TryFind procname with
            | None -> runtimeError {Id=0} (sprintf "procedure '%s' does not exist" procname)
            | Some x -> x
        | Some x -> x
    List.ofSeq prog.Body

let private exprAsInt meta (o:obj) =
    match o with
    | :? int as x -> x
    | :? string as s ->
        try System.Int32.Parse(s)
        with _ -> runtimeError meta (sprintf "cannot convert '%s' to integer" s)
    | _ -> runtimeError meta "cannot coerce object to integer"

let CreateState program mainProcName =
    {CallStack=[{Args=ImmArr.ofSeq []; ToExecute=getProc program mainProcName;}]; LastExecuted=[];}

let Evaluate (state:State) meta expression =
    match expression with
    | Literal x -> x
    | Argument idx ->
        try state.CallStack.Head.Args.[idx]
        with :? System.IndexOutOfRangeException as e -> runtimeError meta (sprintf "Invalid argument index %d, arguments are only length %d" idx state.CallStack.Head.Args.Length)

/// Executes a single line of the program, returning a robot command, if any.
let ExecuteStep program (state:State) =
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
                state.CallStack <- {Args=head.Args; ToExecute=List.ofSeq b} :: state.CallStack
                None
            | Call {Proc=procname; Args=args} ->
                let args = ImmArr.map (Evaluate state stmt.Meta) args
                state.CallStack <- {Args=args; ToExecute=getProc program procname} :: state.CallStack
                None
            | Repeat {Stmt=stmt; NumTimes=ntimesExpr} ->
                let ntimes = Evaluate state stmt.Meta ntimesExpr |> exprAsInt stmt.Meta
                let toAdd = List.init ntimes (fun _ -> stmt)
                state.CallStack <- {Args=head.Args; ToExecute=toAdd} :: state.CallStack
                None
            | Command (cmd, args) ->
                let args = ImmArr.map (Evaluate state stmt.Meta) args
                Some (Robot.Command (cmd, args))

/// Executes the program until a BasicCommand is hit, then returns that command, or None if the program has finished.
let ExecuteUntilCommand program state =
    let mutable cmd = None
    while cmd.IsNone && not state.CallStack.IsEmpty do
        cmd <- ExecuteStep program state
    match cmd with Some c -> c | None -> null

let IsDone (state:State) = state.CallStack.IsEmpty

type StepState = {
    Command: Robot.Command;
    LastExecuted: Statement list;
    Robot: Robot.IRobot;
    Grid: ImmArr<IntVec3>;
}

let ExecuteFullProgram program mainFunc (grid:GridStateTracker) (robot:Robot.IRobot) =
    let MAX_ITER = 10000
    let state = CreateState program mainFunc
    let mutable steps = [{Command=null; LastExecuted=[]; Robot=robot.Clone; Grid=grid.CurrentState}]
    let mutable isDone = false
    let mutable numSteps = 0
    while not (IsDone state) && numSteps < MAX_ITER do
        let cmd = ExecuteUntilCommand program state
        robot.Execute grid cmd
        steps <- {Command=cmd; LastExecuted=state.LastExecuted; Robot=robot.Clone; Grid=grid.CurrentState} :: steps
        numSteps <- numSteps + 1

    ImmArr.ofSeq (List.rev steps)
    

