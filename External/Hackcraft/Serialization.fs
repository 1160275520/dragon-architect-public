module Hackcraft.Serialization

open Hackcraft.Ast.Imperative

let private jstr s = Json.String s
let private jint i = Json.Int i
let private jarr x = Json.Array (Array.ofSeq x)

let private jarrmap f x = jarr (Seq.map f x)

let JsonOfProgram (program:Program) =
    let jsonOfObj (o:obj) =
        match o with
        | :? int as i -> jint i
        | :? string as s -> jstr s
        | _ -> invalidArg "o" (sprintf "cannot json encode object of type '%s'" (o.GetType().Name))

    let jsonOfMeta (meta:Meta) =
        Json.Object (
            Map([
                ("id", jint meta.Id);
            ])
        )

    let jsonOfExpr (expr:Expression) =
        let fields =
            match expr with
            | Literal o -> [("type", jstr "literal"); ("value", jsonOfObj o)]
            | Argument a -> [("type", jstr "argument"); ("index", jint a)]
        Json.Object (Map.ofList fields)

    let rec jsonOfStmt (stmt:Statement) =
        let fields =
            match stmt.Stmt with
            | Block b -> [("type", jstr "block"); ("body", jarr (Seq.map jsonOfStmt b))]
            | Call c -> [("type", jstr "call"); ("proc", jstr c.Proc); ("args", jarrmap jsonOfObj c.Args)]
            | Repeat r -> [("type", jstr "repeat"); ("stmt", jsonOfStmt r.Stmt); ("numtimes", jsonOfExpr r.NumTimes)]
            | Command c -> [("type", jstr "command"); ("command", jstr c)]
        Json.Object (Map.ofList (("meta", jsonOfMeta stmt.Meta) :: fields))

    let jsonOfProc name (proc:Procedure) =
        Json.Object (
            Map([
                ("arity", jint proc.Arity);
                ("body", jarrmap jsonOfStmt proc.Body);
            ])
        )

    Json.Object (Map.map jsonOfProc program.Procedures)

let ProgramOfJson (json:Json.JsonValue) =

    let parseObject j : obj =
        match j with
        | Json.Int i -> upcast i
        | Json.String s -> upcast s
        | _ -> invalidArg "j" (sprintf "cannot json parse object of type '%s'" (j.GetType().Name))

    let parseMeta (j:Json.JsonValue) =
        let jmeta = j.AsObject
        {Id=jmeta.["id"].AsInt}

    let parseExpr (j:Json.JsonValue) =
        let jexpr = j.AsObject
        match jexpr.["type"].AsString with
        | "literal" -> Literal (parseObject jexpr.["value"])
        | "argument" -> Argument jexpr.["index"].AsInt
        | t -> invalidArg "j" ("invalid expression type " + t)

    let rec parseStmt (j:Json.JsonValue) =
        let jstmt = j.AsObject
        let stmt =
            match jstmt.["type"].AsString with
            | "block" -> Block (ImmArr.ofSeq (jstmt.["body"].AsArray |> Seq.map parseStmt))
            | "call" -> Call {Proc=jstmt.["proc"].AsString; Args=ImmArr.ofSeq (jstmt.["args"].AsArray |> Seq.map parseObject)}
            | "repeat" -> Repeat {Stmt=parseStmt jstmt.["stmt"]; NumTimes=parseExpr jstmt.["numtimes"]}
            | "command" -> Command jstmt.["command"].AsString
            | t -> invalidArg "j" ("invalid statement type " + t)
        {Meta=parseMeta jstmt.["meta"]; Stmt=stmt}

    let parseProc (name:string, j:Json.JsonValue) =
        let jproc = j.AsObject
        let body = Array.map parseStmt jproc.["body"].AsArray
        (name.ToUpper (), {Arity=jproc.["arity"].AsInt; Body=ImmArr.ofSeq body})

    let jprocs = Map.toSeq json.AsObject
    {Procedures=Map(Seq.map parseProc jprocs)}

let SaveFile filename program =
    let text = Json.Format (JsonOfProgram program)
    use file = System.IO.File.OpenWrite(filename)
    use writer = new System.IO.StreamWriter(file)
    writer.Write text

let LoadFile filename =
    let text = System.IO.File.ReadAllText(filename)
    ProgramOfJson (Json.Parse text)
