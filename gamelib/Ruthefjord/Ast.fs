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
    | Evaluate of Evaluate
    | Query of Query
        member x.AsLiteral() =
            match x with
            | Literal l -> l;
            | _ -> invalidOp "can't convert to literal";
    and Expression = {
        Meta: Meta;
        Expr: ExpressionT;
    }
    with
        override x.ToString() = sprintf "%O: %O" x.Meta x.Expr
    and Evaluate = {
        Identifier: string;
        Arguments: Expression list;
    }
    and Query = {
        Name: string;
        Arguments: Expression list;
    }

    type Function = {
        Name: string;
        Parameters: string list;
        Body: Expression;
    }
    with
        member x.Arity = x.Parameters.Length

    type StatementT =
    | Conditional of Conditional
    | Repeat of Repeat
    | Function of Function
    | Procedure of Procedure
    | Execute of Execute
    | Command of Command
        member x.AsProcedure() = 
            match x with
            | Procedure p -> p;
            | _ -> invalidOp "can't convert to procedure";
        member x.AsExecute() = 
            match x with
            | Execute e -> e;
            | _ -> invalidOp "can't convert to execute";
        member x.AsCommand() = 
            match x with
            | Command c -> c;
            | _ -> invalidOp "can't convert to command";
        member x.AsRepeat() = 
            match x with
            | Repeat r -> r;
            | _ -> invalidOp "can't convert to repeat";
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
    and Procedure = {
        Name: string;
        Parameters: string list;
        Body: Statement list;
    }
    with
        member x.Arity = x.Parameters.Length
    and Execute = {
        Identifier: string;
        Arguments: Expression list;
    }
    and Command = {
        Name: string;
        Arguments: Expression list;
    }

    type Program = {
        Body: Statement list;
    }

    let mapMeta f (prog:Program) =
        
        let rec mapExpr (expr:Expression) =
            let newE =
                match expr.Expr with
                | Evaluate e ->
                    Evaluate {e with Arguments=List.map mapExpr e.Arguments}
                | Query q ->
                    Query {q with Arguments=List.map mapExpr q.Arguments}
                | x -> x
            {Expr=newE; Meta=f expr.Meta}

        let rec mapStmt (stmt:Statement) =
            let newS =
                match stmt.Stmt with
                | Conditional c ->
                    Conditional {Condition=mapExpr c.Condition; Then=List.map mapStmt c.Then; Else=List.map mapStmt c.Else}
                | Repeat r ->
                    Repeat {NumTimes=mapExpr r.NumTimes; Body=List.map mapStmt r.Body}
                | Function f ->
                    Function {f with Body=mapExpr f.Body}
                | Procedure p ->
                    Procedure {p with Body=List.map mapStmt p.Body}
                | Execute e ->
                    Execute {e with Arguments=List.map mapExpr e.Arguments}
                | Command c -> 
                    Command {c with Arguments=List.map mapExpr c.Arguments}
            {Stmt=newS; Meta=f stmt.Meta}

        {Body=List.map mapStmt prog.Body}
