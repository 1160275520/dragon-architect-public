module Hackcraft.Serialization

open Hackcraft.Ast.Imperative

module J = Hackcraft.Json

let LANGUAGE_NAME = "imperative_v01"
let CURR_MAJOR_VERSION = 0
let CURR_MINOR_VERSION = 1

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

    Json.objectOf [
        "meta", Json.objectOf [
            "language", J.String LANGUAGE_NAME;
            "version", J.objectOf ["major", J.Int CURR_MAJOR_VERSION; "minor", J.Int CURR_MINOR_VERSION];
        ];
        "procedures", J.Object (Map.map jsonOfProc program.Procedures);
    ]

type SerializationErrorCode =
| InvalidVersion = 1002
| InvalidLiteral = 1011
| InvalidExpressionType = 1012
| InvalidStatementType = 1013

let ProgramOfJson (json: J.JsonValue) =

    let jload obj key fn = fn (Json.getField obj key)
    let tryJload obj key fn = Json.tryGetField obj key |> Option.map fn

    let syntaxError j (c:SerializationErrorCode) m = raise (J.JsonError (j, int c, m, null))

    let parseObject j : obj =
        match j with
        | Json.Int i -> upcast i
        | Json.String s -> upcast s
        | _ -> syntaxError j SerializationErrorCode.InvalidLiteral (sprintf "cannot json parse object of type '%s'" (j.GetType().Name))

    let parseMeta j = {Id=jload j "id" J.asInt}

    let parseExpr j =
        match jload j "type" J.asString with
        | "literal" -> Literal (jload j "value" parseObject)
        | "argument" -> Argument (jload j "index" J.asInt)
        | t -> syntaxError j SerializationErrorCode.InvalidExpressionType ("invalid expression type " + t)

    let rec parseStmt j =
        let stmt =
            match jload j "type" J.asString with
            | "block" -> Block (ImmArr.ofSeq (jload j "body" J.asArray |> Seq.map parseStmt))
            | "call" -> Call {Proc=jload j "proc" J.asString; Args=ImmArr.ofSeq (jload j "args" J.asArray |> Seq.map parseExpr)}
            | "repeat" -> Repeat {Stmt=jload j "stmt" parseStmt; NumTimes=jload j "numtimes" parseExpr}
            | "command" -> Command (jload j "command" J.asString, ImmArr.ofSeq (jload j "args" J.asArray |> Seq.map parseExpr))
            | t -> syntaxError j SerializationErrorCode.InvalidStatementType ("invalid statement type " + t)
        {Meta=jload j "meta" parseMeta; Stmt=stmt}

    let parseProc n j =
        let body = Array.map parseStmt (jload j "body" J.asArray)
        {Arity=jload j "arity" J.asInt; Body=ImmArr.ofSeq body}

    let parseModule j =
        let procs = jload j "procedures" J.asObject
        {Procedures=Map.map parseProc procs}

    let meta = J.getField json "meta"
    let language = jload meta "language" J.asString
    let major_version, minor_version = jload meta "version" (fun o -> jload o "major" J.asInt, jload o "minor" J.asInt)
    if language <> LANGUAGE_NAME || major_version <> CURR_MAJOR_VERSION || minor_version <> CURR_MINOR_VERSION then
        syntaxError json SerializationErrorCode.InvalidVersion (sprintf "Invalid language/version: %s %d.%d" language major_version minor_version)

    parseModule json

let Load text = ProgramOfJson (Json.Parse text)
