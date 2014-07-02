﻿module Hackcraft.Simulator

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
    // HACK create a phony location based on the id
    let loc = Location (Position (meta.Id, 0), Position.Empty, "")
    raise (RuntimeError (Serialization.LANGUAGE_NAME, int code, loc, msg, null))

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
            | None -> runtimeError {Id=0} RuntimeErrorCode.UnknownProcedure (sprintf "procedure '%s' does not exist" procname)
            | Some x -> x
        | Some x -> x
    List.ofSeq prog.Body

let private exprAsInt meta (o:obj) =
    match o with
    | :? int as x -> x
    | :? string as s ->
        try System.Int32.Parse(s)
        with _ -> runtimeError meta RuntimeErrorCode.UnableToConvertToInteger (sprintf "cannot convert '%s' to integer" s)
    | _ -> runtimeError meta RuntimeErrorCode.UnableToConvertToInteger "cannot coerce object to integer"

let CreateState program mainProcName =
    {CallStack=[{Args=ImmArr.empty; ToExecute=getProc program mainProcName;}]; LastExecuted=[];}

let Evaluate (state:State) meta expression =
    match expression with
    | Literal x -> x
    | Argument idx ->
        try state.CallStack.Head.Args.[idx]
        with :? System.IndexOutOfRangeException as e -> runtimeError meta RuntimeErrorCode.IncorrectNumberOfArguments (sprintf "Invalid argument index %d, arguments are only length %d" idx state.CallStack.Head.Args.Length)

let private step program (state:State) =
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

let private internalError e = 
    raise (SyntaxError (Serialization.LANGUAGE_NAME, int RuntimeErrorCode.InternalError, Location.Empty, "Internal runtime error.", e))

/// Executes a single line of the program, returning a robot command, if any.
let ExecuteStep program state =
    try step program state
    with
    | :? RuntimeError -> reraise ()
    | e -> internalError e

/// Executes the program until a BasicCommand is hit, then returns that command, or None if the program has finished.
let ExecuteUntilCommand program state =
    try
        let mutable cmd = None
        while cmd.IsNone && not state.CallStack.IsEmpty do
            cmd <- ExecuteStep program state
        match cmd with Some c -> c | None -> null
    with
    | :? RuntimeError -> reraise ()
    | e -> internalError e

let IsDone (state:State) = state.CallStack.IsEmpty

type StepState = {
    Command: Robot.Command;
    LastExecuted: Statement list;
    Robot: Robot.IRobot;
    Grid: ImmArr<KeyValuePair<IntVec3,Block>>;
}

let ExecuteFullProgram program mainFunc (grid:GridStateTracker) (robot:Robot.IRobot) =
    try
        let MAX_ITER = 10000
        let state = CreateState program mainFunc
        let mutable steps = [{Command=null; LastExecuted=[]; Robot=robot.Clone; Grid=grid.CurrentState}]
        let mutable isDone = false
        let mutable numSteps = 0
        while not (IsDone state) && numSteps < MAX_ITER do
            let cmd = ExecuteUntilCommand program state
            if cmd <> null then
                robot.Execute grid cmd
                steps <- {Command=cmd; LastExecuted=state.LastExecuted; Robot=robot.Clone; Grid=grid.CurrentState} :: steps
                numSteps <- numSteps + 1
            else System.Diagnostics.Debug.Assert(IsDone state, "execute until command returned a null command when program was not done!")

        ImmArr.ofSeq (List.rev steps)
    with
    | :? RuntimeError -> reraise ()
    | e -> internalError e
