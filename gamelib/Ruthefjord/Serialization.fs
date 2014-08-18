/// Code to parse/serialize the AST from/to JSON.
/// See Ast.fs
module Ruthefjord.Serialization

open Ruthefjord.Ast.Imperative

module J = Ruthefjord.Json

let LANGUAGE_NAME = "imperative_v02"
let CURR_MAJOR_VERSION = 1
let CURR_MINOR_VERSION = 0

let JsonOfProgram (program:Program) =
    let jarrmap f x = List.map f x |> J.arrayOfList

    let jsonOfObj (o:obj) =
        match o with
        | :? int as i -> J.Int i
        | :? string as s -> J.String s
        | _ -> invalidArg "o" (sprintf "cannot json encode object of type '%s'" (o.GetType().Name))

    let jsonOfMeta (meta:Meta) =
        [
            (if meta.Attributes = J.emptyObject then None else Some ("attributes", meta.Attributes));
            (if meta.Id = 0 then None else Some ("id", J.Int meta.Id));
        ] |> List.choose (fun x -> x) |> J.JsonValue.ObjectOf

    let rec jsonOfExpr (expr:Expression) =
        let fields =
            match expr.Expr with
            | Literal x -> [("type", J.String "literal"); ("value", jsonOfObj x)]
            | Identifier x -> [("type", J.String "ident"); ("name", J.String x)]
            | Evaluate e -> [("type", J.String "eval"); ("ident", J.String e.Identifier); ("args", jarrmap jsonOfExpr e.Arguments)]
            | Query q -> [("type", J.String "query"); ("name", J.String q.Name); ("args", jarrmap jsonOfExpr q.Arguments)]
        J.JsonValue.ObjectOf (("meta", jsonOfMeta expr.Meta) :: fields)

    let rec jsonOfStmt (stmt:Statement) =
        let fields =
            match stmt.Stmt with
            | Conditional c -> [("type", J.String "ifelse"); ("cond", jsonOfExpr c.Condition); ("then", jarrmap jsonOfStmt c.Then); ("else", jarrmap jsonOfStmt c.Else)]
            | Repeat r -> [("type", J.String "repeat"); ("body", jarrmap jsonOfStmt r.Body); ("numtimes", jsonOfExpr r.NumTimes)]
            | Function f -> [("type", J.String "func"); ("name", J.String f.Name); ("params", J.JsonValue.ArrayOf (Seq.map J.String f.Parameters)); ("body", jsonOfExpr f.Body)]
            | Procedure p -> [("type", J.String "proc"); ("name", J.String p.Name); ("params", J.JsonValue.ArrayOf (Seq.map J.String p.Parameters)); ("body", jarrmap jsonOfStmt p.Body)]
            | Execute c -> [("type", J.String "call"); ("ident", J.String c.Identifier); ("args", jarrmap jsonOfExpr c.Arguments)]
            | Command c -> [("type", J.String "command"); ("name", J.String c.Name); ("args", jarrmap jsonOfExpr c.Arguments)]
        J.JsonValue.ObjectOf (("meta", jsonOfMeta stmt.Meta) :: fields)

    let meta = 
        J.JsonValue.ObjectOf [
            "language", J.String LANGUAGE_NAME;
            "version", J.JsonValue.ObjectOf ["major", J.Int CURR_MAJOR_VERSION; "minor", J.Int CURR_MINOR_VERSION];
        ]
    J.JsonValue.ObjectOf (["meta", meta; "body", jarrmap jsonOfStmt program.Body])

type SerializationErrorCode =
| InternalError = 2001
| InvalidVersion = 2002
| JsonFormatError = 2003
| InvalidLiteral = 2011
| InvalidExpressionType = 2012
| InvalidStatementType = 2013

let ProgramOfJson (json: J.JsonValue) =
    let jload obj key fn = fn (Json.getField obj key)
    let jloadarr obj key fn = jload obj key J.arrayToList |> List.map fn
    let tryJload obj key fn = Json.tryGetField obj key |> Option.map fn

    let syntaxError j (c:SerializationErrorCode) m = raise (J.JsonException (int c, j, m, null))

    let parseObject j : obj =
        match j with
        | Json.Int i -> upcast i
        | Json.String s -> upcast s
        | _ -> syntaxError j SerializationErrorCode.InvalidLiteral (sprintf "cannot json parse object of type '%s'" (j.GetType().Name))

    let parseMeta j =
        {
            Id = defaultArg (tryJload j "id" J.asInt) 0;
            Attributes = defaultArg (J.tryGetField j "attributes") J.emptyObject;
        }

    let emptyMeta = {Id=0; Attributes=J.Null}

    let rec parseExpr j =
        let expr =
            match jload j "type" J.asString with
            | "literal" -> Literal (jload j "value" parseObject)
            | "ident" -> Identifier (jload j "name" J.asString)
            | "eval" -> Evaluate {Identifier=jload j "ident" J.asString; Arguments=jloadarr j "args" parseExpr}
            | "query" -> Query {Name=jload j "name" J.asString; Arguments=jloadarr j "args" parseExpr}
            | t -> syntaxError j SerializationErrorCode.InvalidExpressionType ("invalid expression type " + t)
        {Meta=defaultArg (tryJload j "meta" parseMeta) emptyMeta; Expr=expr}

    let rec parseStmt j =
        let stmt =
            match jload j "type" J.asString with
            | "ifelse" -> Conditional {Condition=jload j "cond" parseExpr; Then=jloadarr j "then" parseStmt; Else=jloadarr j "else" parseStmt}
            | "repeat" -> Repeat {Body=jloadarr j "body" parseStmt; NumTimes=jload j "numtimes" parseExpr}
            | "func" -> Function {Name=jload j "name" J.asString; Parameters=jloadarr j "params" J.asString; Body=jload j "body" parseExpr}
            | "proc" -> Procedure {Name=jload j "name" J.asString; Parameters=jloadarr j "params" J.asString; Body=jloadarr j "body" parseStmt}
            | "call" -> Execute {Identifier=jload j "ident" J.asString; Arguments=jloadarr j "args" parseExpr}
            | "command" -> Command {Name=jload j "name" J.asString; Arguments=jloadarr j "args" parseExpr}
            | t -> syntaxError j SerializationErrorCode.InvalidStatementType ("invalid statement type " + t)
        {Meta=defaultArg (tryJload j "meta" parseMeta) emptyMeta; Stmt=stmt}

    try
        let meta = J.getField json "meta"
        let language = jload meta "language" J.asString
        let major_version, minor_version = jload meta "version" (fun o -> jload o "major" J.asInt, jload o "minor" J.asInt)
        if language <> LANGUAGE_NAME || major_version <> CURR_MAJOR_VERSION || minor_version <> CURR_MINOR_VERSION then
            syntaxError json SerializationErrorCode.InvalidVersion (sprintf "Invalid language/version: %s %d.%d" language major_version minor_version)

        {Body=jloadarr json "body" parseStmt}
    with
    | :? J.JsonException -> reraise ()
    | e -> raise (CodeException (SerializationError (int SerializationErrorCode.InternalError, -1, "Internal serializer error.", e)))

let Load text = ProgramOfJson (Json.Parse text)
