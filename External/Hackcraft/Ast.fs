namespace Hackcraft.Ast

open Hackcraft

module Imperative =

    type Expression =
    | Literal of obj
    | Argument of int

    type Expression with
        member x.AsLiteral = match x with Literal o -> o | _ -> invalidOp "not a literal"
        member x.AsArgument = match x with Argument i -> i | _ -> invalidOp "not a argument"

    type Call = { Proc:string; Args:ImmArr<obj>; }
    type Repeat = { Stmt:Statement; NumTimes:Expression; }
    and Statement =
    | Call of Call
    | Repeat of Repeat
    | Command of string

    type Statement with
        member x.AsCall = match x with Call c -> c | _ -> invalidOp "not a call"
        member x.AsRepeat = match x with Repeat r -> r | _ -> invalidOp "not a repeat"

    let NewCall (proc, args) = Call({Proc=proc; Args=ImmArr.ofSeq args;})
    let NewRepeat (stmt, nt) = Repeat({Stmt=stmt; NumTimes=nt;})

    type Procedure = {
        Arity: int;
        Body: ImmArr<Statement>;
    }

    type Program = {
        Procedures: Map<string,Procedure>;
    }


module Library =
    open Imperative
    type private C = RobotCommand

    let private arr = ImmArr.ofSeq

    let Builtins =
        Map([
            ("Forward", {Arity=1; Body=arr [NewRepeat (Command "forward", Argument 0)]});
            ("Right", {Arity=0; Body=arr [Command "right"]});
            ("Left", {Arity=0; Body=arr [Command "left"]});
            ("Up", {Arity=1; Body=arr [NewRepeat (Command "up", Argument 0)]});
            ("Down", {Arity=1; Body=arr [NewRepeat (Command "down", Argument 0)]});
            ("TurnAround", {Arity=0; Body=arr [Command "right"; Command "right"]});
            ("PlaceBlock", {Arity=0; Body=arr [Command "block"]});
        ])
