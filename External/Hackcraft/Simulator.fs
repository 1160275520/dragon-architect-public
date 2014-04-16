module Hackcraft.Simulator

type RuntimeError(msg: string) =
    inherit System.Exception(sprintf "Runtime Error: %s" msg)

let private runtimeError msg = raise (RuntimeError msg)

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

let private getProc (program:Program) procname =
    let prog = 
        match program.Procedures.TryFind procname with
        | None ->
            match Builtins.TryFind procname with
            | None -> runtimeError (sprintf "procedure '%s' does not exist" procname)
            | Some x -> x
        | Some x -> x
    List.ofSeq prog.Body

let private exprAsInt (o:obj) =
    match o with
    | :? int as x -> x
    | :? string as s -> System.Int32.Parse(s)
    | _ -> runtimeError "cannot coerce object to integer"

let CreateState program mainProcName =
    {CallStack=[{Args=ImmArr.ofSeq []; ToExecute=getProc program mainProcName;}]; LastExecuted=[];}

let Evaluate (state:State) expression =
    match expression with
    | Literal x -> x
    | Argument idx -> state.CallStack.Head.Args.[idx]

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
            | Call {Proc=procname; Args=args} ->
                state.CallStack <- {Args=args; ToExecute=getProc program procname} :: state.CallStack
                None
            | Repeat {Stmt=stmt; NumTimes=ntimesExpr} ->
                let ntimes = Evaluate state ntimesExpr |> exprAsInt
                let toAdd = List.init ntimes (fun _ -> stmt)
                state.CallStack <- {Args=head.Args; ToExecute=toAdd} :: state.CallStack
                None
            | Command cmd -> Some cmd

/// Executes the program until a BasicCommand is hit, then returns that command, or None if the program has finished.
let ExecuteUntilCommand program state =
    let mutable cmd = None
    while cmd.IsNone && not state.CallStack.IsEmpty do
        cmd <- ExecuteStep program state
    match cmd with Some c -> c | None -> null

let IsDone (state:State) = state.CallStack.IsEmpty
