﻿namespace Hackcraft.Ast

open Hackcraft

module Imperative =

    type Meta = {
        Id: int;
    }

    type Expression =
    | Literal of obj
    | Argument of int

    type Expression with
        member x.AsLiteral = match x with Literal o -> o | _ -> invalidOp "not a literal"
        member x.AsArgument = match x with Argument i -> i | _ -> invalidOp "not a argument"

    type Call = { Proc:string; Args:ImmArr<obj>; }
    type Repeat = { Stmt:Statement; NumTimes:Expression; }
    and StatementT =
    | Call of Call
    | Repeat of Repeat
    | Command of string
    and Statement = {
        Stmt: StatementT;
        Meta: Meta;
    }

    type StatementT with
        member x.AsCall = match x with Call c -> c | _ -> invalidOp "not a call"
        member x.AsRepeat = match x with Repeat r -> r | _ -> invalidOp "not a repeat"

    let NewStatement id stmt = {Stmt=stmt; Meta={Id=id}}
    let NewCall id proc args = NewStatement id (Call({Proc=proc; Args=ImmArr.ofSeq args;}))
    let NewRepeat id stmt nt = NewStatement id (Repeat({Stmt=stmt; NumTimes=nt;}))
    let NewCommand id cmd = NewStatement id (Command cmd)

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
            ("Forward", {Arity=1; Body=arr [NewRepeat 0 (NewCommand 0 "forward") (Argument 0)]});
            ("Right", {Arity=0; Body=arr [NewCommand 0 "right"]});
            ("Left", {Arity=0; Body=arr [NewCommand 0 "left"]});
            ("Up", {Arity=1; Body=arr [NewRepeat 0 (NewCommand 0 "up") (Argument 0)]});
            ("Down", {Arity=1; Body=arr [NewRepeat 0 (NewCommand 0 "down") (Argument 0)]});
            ("TurnAround", {Arity=0; Body=arr [NewCommand 0 "right"; NewCommand 0 "right"]});
            ("PlaceBlock", {Arity=0; Body=arr [NewCommand 0 "block"]});
        ])