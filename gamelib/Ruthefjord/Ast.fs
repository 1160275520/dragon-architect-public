/// The abstract syntax tree for the imperative programming language.
/// Also currently contains the standard library as hard-coded ASTs.
namespace Ruthefjord.Ast

open System
open Ruthefjord

module Imperative =

    type Meta = {
        Id: int;
        Attributes: Json.JsonValue;
    }
    with
        override x.ToString() = sprintf "id = %d" x.Id

    type ExpressionT =
    | Literal of obj
    | Identifier of string
    type Expression = {
        Meta: Meta;
        Expr: ExpressionT;
    }

    type StatementT =
    | Conditional of Conditional
    | Repeat of Repeat
    | Define of Procedure
    | Call of Call
    | Command of Command
    and Statement = {
        Stmt: StatementT;
        Meta: Meta;
    }
    with
        override x.ToString() = sprintf "%O: %O" x.Meta x.Stmt
    and Conditional = {
        Condition: Expression;
        Then: Statement list;
        Else: Statement list;
    }
    and Repeat = {
        NumTimes: Expression;
        Body: Statement list;
    }
    and Call = {
        Identifier: string;
        Arguments: Expression list;
    }
    and Procedure = {
        Name: string;
        Parameters: string list;
        Body: Statement list;
    }
    with
        member x.Arity = x.Parameters.Length
    and Command = {
        Name: string;
        Arguments: Expression list;
    }

    type Program = {
        Body: Statement list;
    }
