module Hackcraft.Serialization

open Hackcraft.Ast.Imperative

module J = Hackcraft.Json

let JsonOfProgram (program:Program) =
    let jarrmap f x = J.arrayOf (Seq.map f x)

    let jsonOfObj (o:obj) =
        match o with
        | :? int as i -> J.Int i
        | :? string as s -> J.String s
        | _ -> invalidArg "o" (sprintf "cannot json encode object of type '%s'" (o.GetType().Name))

    let jsonOfMeta (meta:Meta) = J.objectOf [("id", J.Int meta.Id)]

    let jsonOfExpr (expr:Expression) =
        match expr with
        | Literal o -> [("type", J.String "literal"); ("value", jsonOfObj o)] |> J.objectOf
        | Argument a -> [("type", J.String "argument"); ("index", J.Int a)] |> J.objectOf

    let rec jsonOfStmt (stmt:Statement) =
        let fields =
            match stmt.Stmt with
            | Block b -> [("type", J.String "block"); ("body", jarrmap jsonOfStmt b)]
            | Call c -> [("type", J.String "call"); ("proc", J.String c.Proc); ("args", jarrmap jsonOfExpr c.Args)]
            | Repeat r -> [("type", J.String "repeat"); ("stmt", jsonOfStmt r.Stmt); ("numtimes", jsonOfExpr r.NumTimes)]
            | Command (c, a) -> [("type", J.String "command"); ("command", J.String c); ("args", jarrmap jsonOfExpr a)]
        J.objectOf (("meta", jsonOfMeta stmt.Meta) :: fields)

    let jsonOfProc name (proc:Procedure) =
        J.objectOf [
            ("arity", J.Int proc.Arity);
            ("body", jarrmap jsonOfStmt proc.Body);
        ]

    Json.Object (Map.map jsonOfProc program.Procedures)

type SerializationErrorCode =
| InvalidLiteral = 1002
| InvalidExpressionType = 1003
| InvalidStatementType = 1004

let ProgramOfJson (json:Json.JsonValue) =

    let jload obj key fn = fn (Json.getField obj key)
    let tryJload obj key fn = Json.tryGetField obj key |> Option.map fn

    let syntaxError j (c:SerializationErrorCode) m = raise (J.JsonError (j, int c, m, null))

    let argexn (e:System.Exception) jvalue msg = raise (System.ArgumentException(sprintf "Error processing '%s': %s" (Json.Format jvalue) msg, e))

    let parseObject j : obj =
        match j with
        | Json.Int i -> upcast i
        | Json.String s -> upcast s
        | _ -> syntaxError j SerializationErrorCode.InvalidLiteral (sprintf "cannot json parse object of type '%s'" (j.GetType().Name))

    let parseMeta (j:Json.JsonValue) = {Id=(j.GetField "id").AsInt}

    let parseExpr (j:Json.JsonValue) =
        match jload j "type" J.asString with
        | "literal" -> Literal (jload j "value" parseObject)
        | "argument" -> Argument (jload j "index" J.asInt)
        | t -> syntaxError j SerializationErrorCode.InvalidExpressionType ("invalid expression type " + t)

    let rec parseStmt (j:Json.JsonValue) =
        let stmt =
            match jload j "type" J.asString with
            | "block" -> Block (ImmArr.ofSeq (jload j "body" J.asArray |> Seq.map parseStmt))
            | "call" -> Call {Proc=jload j "proc" J.asString; Args=ImmArr.ofSeq (jload j "args" J.asArray |> Seq.map parseExpr)}
            | "repeat" -> Repeat {Stmt=jload j "stmt" parseStmt; NumTimes=jload j "numtimes" parseExpr}
            | "command" -> Command (jload j "command" J.asString, ImmArr.ofSeq (jload j "args" J.asArray |> Seq.map parseExpr))
            | t -> syntaxError j SerializationErrorCode.InvalidStatementType ("invalid statement type " + t)
        {Meta=jload j "meta" parseMeta; Stmt=stmt}

    // need to change function name (to enforce casing) which makes this a bit more complicated
    let parseProc (name:string, j:Json.JsonValue) =
        let body = Array.map parseStmt (jload j "body" J.asArray)
        (name.ToUpper (), {Arity=jload j "arity" J.asInt; Body=ImmArr.ofSeq body})

    {Procedures=Map(json.AsObject |> Map.toSeq |> Seq.map parseProc)}

let Load text = ProgramOfJson (Json.Parse text)
