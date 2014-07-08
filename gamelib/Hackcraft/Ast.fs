namespace Hackcraft.Ast

open System
open Hackcraft

module Imperative =

    type Meta = {
        Id: int;
    }
    with
        override x.ToString() = sprintf "id = %d" x.Id

    type Expression =
    | Literal of obj
    | Argument of int

    type Expression with
        member x.AsLiteral = match x with Literal o -> o | _ -> invalidOp "not a literal"
        member x.AsArgument = match x with Argument i -> i | _ -> invalidOp "not a argument"

    type Call = { Proc:string; Args:ImmArr<Expression>; }
    type Repeat = { Stmt:Statement; NumTimes:Expression; }
    and StatementT =
    | Block of ImmArr<Statement>
    | Call of Call
    | Repeat of Repeat
    | Command of string * ImmArr<Expression>
    and Statement = {
        Stmt: StatementT;
        Meta: Meta;
    }
    with
        override x.ToString() = sprintf "%O: %O" x.Meta x.Stmt
    and Procedure = {
        Arity: int;
        Body: ImmArr<Statement>;
    }

    type StatementT with
        member x.AsCall = match x with Call c -> c | _ -> invalidOp "not a call"
        member x.AsRepeat = match x with Repeat r -> r | _ -> invalidOp "not a repeat"

    let NewStatement id stmt = {Stmt=stmt; Meta={Id=id}}
    let NewBlock id list = NewStatement id (Block list)
    let NewCall id proc args = NewStatement id (Call({Proc=proc; Args=ImmArr.ofSeq args;}))
    let NewCallL1 id proc literalArg = NewCall id proc [Literal literalArg]
    let NewCall0 id proc = NewCall id proc []
    let NewRepeat id stmt nt = NewStatement id (Repeat({Stmt=stmt; NumTimes=nt;}))
    let NewCommand id cmd args = NewStatement id (Command (cmd, args))
    let NewCommandZ id cmd = NewStatement id (Command (cmd, ImmArr.empty))

    type Program = {
        Procedures: Map<string,Procedure>;
        Modules: Map<string,Program>;
    }
    with
        member x.AllIds =
            let rec idsOfStmt (stmt:Statement) =
                let tail =
                    match stmt.Stmt with
                    | Repeat r -> idsOfStmt r.Stmt
                    | _ -> []
                stmt.Meta.Id :: tail

            let idsOfProc (proc:Procedure) =
                List.ofSeq proc.Body |> List.map idsOfStmt |> List.concat

            let ids = Map.toList x.Procedures |> List.map (fun (k,v) -> idsOfProc v) |> List.concat
            Set(ids)

    let rec iterStatement fn (stmt:Statement) =
        fn stmt
        match stmt.Stmt with
        | Block b -> Seq.iter (iterStatement fn) b
        | Call _ -> ()
        | Repeat r -> iterStatement fn r.Stmt
        | Command _ -> ()

    let iterStatementP fn (proc:Procedure) =
        Seq.iter (iterStatement fn) proc.Body
        
    let iterStatementPA (proc, fn:Action<Statement>) =
        iterStatementP (fun x -> fn.Invoke(x)) proc

module Library =
    open Imperative
    let private arr = ImmArr.ofSeq

    let Builtins =
        Map([
            ("Forward", {Arity=1; Body=arr [NewRepeat 0 (NewCommandZ 0 "forward") (Argument 0)]});
            ("Right", {Arity=0; Body=arr [NewCommandZ 0 "right"]});
            ("Left", {Arity=0; Body=arr [NewCommandZ 0 "left"]});
            ("Up", {Arity=1; Body=arr [NewRepeat 0 (NewCommandZ 0 "up") (Argument 0)]});
            ("Down", {Arity=1; Body=arr [NewRepeat 0 (NewCommandZ 0 "down") (Argument 0)]});
            ("TurnAround", {Arity=0; Body=arr [NewCommandZ 0 "right"; NewCommandZ 0 "right"]});
            ("PlaceBlock", {Arity=1; Body=arr [NewCommand 0 "block" (ImmArr.ofSeq [Argument 0])]});
            ("RemoveBlock", {Arity=0; Body=arr [NewCommandZ 0 "remove"]});
            ("Line", {Arity=1; Body=arr [NewRepeat 0 (NewBlock 0 (ImmArr.ofSeq [NewCommand 0 "block" (ImmArr.ofSeq [Literal "5cab32"]); NewCommandZ 0 "forward"])) (Argument 0)]});
        ])
