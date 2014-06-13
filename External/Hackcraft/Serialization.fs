module Hackcraft.Serialization

open Hackcraft.Ast.Imperative

let private jstr s = Json.String s
let private jint i = Json.Int i
let private jarr x = Json.Array (Array.ofSeq x)
let private jbool b = Json.Bool b

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
        match expr with
        | Literal o -> [("type", jstr "literal"); ("value", jsonOfObj o)] |> Map.ofList |> Json.Object
        | Argument a -> [("type", jstr "argument"); ("index", jint a)] |> Map.ofList |> Json.Object

    let rec jsonOfStmt (stmt:Statement) =
        let fields =
            match stmt.Stmt with
            | Block b -> [("type", jstr "block"); ("body", jarr (Seq.map jsonOfStmt b))]
            | Call c -> [("type", jstr "call"); ("proc", jstr c.Proc); ("args", jarrmap jsonOfExpr c.Args)]
            | Repeat r -> [("type", jstr "repeat"); ("stmt", jsonOfStmt r.Stmt); ("numtimes", jsonOfExpr r.NumTimes)]
            | Command (c, a) -> [("type", jstr "command"); ("command", jstr c); ("args", jarrmap jsonOfExpr a)]
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

    let argexn (e:System.Exception) jvalue msg = raise (System.ArgumentException(sprintf "Error processing '%s': %s" (Json.Format jvalue) msg, e))

    let parseObject j : obj =
        match j with
        | Json.Int i -> upcast i
        | Json.String s -> upcast s
        | _ -> invalidArg "j" (sprintf "cannot json parse object of type '%s'" (j.GetType().Name))

    let parseMeta (j:Json.JsonValue) =
        try
            let jmeta = j.AsObject
            {Id=jmeta.["id"].AsInt}
        with
            :? System.ArgumentException -> reraise ()
            | e -> argexn e j "cannot parse meta"

    let parseExpr (j:Json.JsonValue) =
        try
            let jexpr = j.AsObject
            match jexpr.["type"].AsString with
            | "literal" -> Literal (parseObject jexpr.["value"])
            | "argument" -> Argument jexpr.["index"].AsInt
            | t -> invalidArg "j" ("invalid expression type " + t)
        with
            :? System.ArgumentException -> reraise ()
            | e -> argexn e j "cannot parse expr"

    let rec parseStmt (j:Json.JsonValue) =
        try
            let jstmt = j.AsObject
            let stmt =
                match jstmt.["type"].AsString with
                | "block" -> Block (ImmArr.ofSeq (jstmt.["body"].AsArray |> Seq.map parseStmt))
                | "call" -> Call {Proc=jstmt.["proc"].AsString; Args=ImmArr.ofSeq (jstmt.["args"].AsArray |> Seq.map parseExpr)}
                | "repeat" -> Repeat {Stmt=parseStmt jstmt.["stmt"]; NumTimes=parseExpr jstmt.["numtimes"]}
                | "command" -> Command (jstmt.["command"].AsString, ImmArr.ofSeq (jstmt.["args"].AsArray |> Seq.map parseExpr))
                | t -> invalidArg "j" ("invalid statement type " + t)
            {Meta=parseMeta jstmt.["meta"]; Stmt=stmt}
        with
            :? System.ArgumentException -> reraise ()
            | e -> argexn e j "cannot parse stmt"

    let parseProc (name:string, j:Json.JsonValue) =
        try
            let jproc = j.AsObject
            let body = Array.map parseStmt jproc.["body"].AsArray
            (name.ToUpper (), {Arity=jproc.["arity"].AsInt; Body=ImmArr.ofSeq body})
        with
            :? System.ArgumentException -> reraise ()
            | e -> argexn e j "cannot parse proc"

    try
        let jprocs = Map.toSeq json.AsObject
        {Procedures=Map(Seq.map parseProc jprocs)}
    with
        :? System.ArgumentException -> reraise ()
        | e -> argexn e json "cannot parse program"

(*
let SaveFile filename program =
    let text = Json.Format (JsonOfProgram program)
    use file = System.IO.File.OpenWrite(filename)
    use writer = new System.IO.StreamWriter(file)
    writer.Write text
*)

let Load text = ProgramOfJson (Json.Parse text)

let JsonOfLevel(level:LevelInfo) = 
    let jsonOfAvail commands b = 
        jbool b
    Json.Object (
        Map([
            ("commands", Json.Object (Map.map jsonOfAvail level.AvailCommands)); 
            ("funcs", jint level.NumHelperFuncs);
            ("locks", jarrmap jstr level.LockedProcs);
            ("highlights", jarrmap jstr level.HighlightBlocks);
        ])
    )