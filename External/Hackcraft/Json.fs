module Hackcraft.Json

open Scripting

type JsonArray = array<JsonValue>
and JsonObject = Map<string, JsonValue>
and JsonValue =
| Null
| Int of int
| String of string
| Bool of bool
| Array of JsonArray
| Object of JsonObject

type private Parser(cs:CharacterStream) =

    let isSpace c = c = ' ' || c = '\r' || c = '\n' || c = '\t'
    let isNewline c = c = '\n'

    let skipWhitespace () = while (not cs.IsEOF) && (isSpace cs.Peek) do ignore (cs.Next ())
    let matchCharacter c =
        let p = cs.Position
        let n = cs.Next()
        if (n <> c) then syntaxError (Location(p,cs.Position,cs.Filename)) (sprintf "expected character %O, got %O" c n)

    let parseString doReadOpeningQuote =
        if doReadOpeningQuote then matchCharacter '"' 
        let start = cs.Position // not quite correct pos, but MEH
        let s =
            System.String [|
                while not (cs.Peek = '"' || isNewline cs.Peek) do
                    let c = cs.Next()
                    if c = '\\'
                    then
                        match cs.Next() with
                        | '"' -> yield '"'
                        | '\\' -> yield '\\'
                        | 'n' -> yield '\n'
                        | 't' -> yield '\t'
                        | x -> syntaxError (Location(cs.Position,cs.Position,cs.Filename)) (sprintf "invalid escape character '\%c'" x)
                    else yield c
            |]

        // if there is a newline, that's an error, otherwise skip the right quote
        let p = cs.Position
        if isNewline (cs.Next()) then syntaxError (Location(start,p,cs.Filename)) "String literals may not span multiple lines"
        s

    let rec parse () =
        let start = cs.Position

        skipWhitespace ()

        match cs.Next () with
        | '{' ->
            let values =
                [|  while not (cs.Peek = '}') do
                        skipWhitespace ()
                        let key = parseString true
                        skipWhitespace ()
                        matchCharacter ':'
                        skipWhitespace ()
                        let value = parse ()
                        yield (key, value)
                        skipWhitespace ()
                        if not (cs.Peek = '}') then matchCharacter ','
                        skipWhitespace ()
                    ignore (cs.Next ())
                |]
            Object (Map.ofArray values)
            
        | '[' ->
            Array (
                [|  while not (cs.Peek = ']') do
                        yield parse ()
                        skipWhitespace ()
                        if not (cs.Peek = ']') then matchCharacter ','
                        skipWhitespace ()
                    ignore (cs.Next ())
                |])
        | c when System.Char.IsDigit c ->
            let s = System.String [| yield c; while System.Char.IsDigit cs.Peek do yield cs.Next() |]
            Int (System.Int32.Parse s)
        | c when System.Char.IsLetter c ->
            let s = System.String [| yield c; while System.Char.IsLetter cs.Peek do yield cs.Next() |]
            match s with
            | "true" -> Bool true
            | "false" -> Bool false
            | "null" -> Null
            | _ -> syntaxError (Location(start,cs.Position,cs.Filename)) "invalid keyword"
        | '"' -> String (parseString false)
        | c -> syntaxError (Location (start,start,cs.Filename)) (sprintf "invalid character %O" c)

    member x.Parse () = parse ()

let Parse string = Parser(CharacterStream(string, "")).Parse()

let rec Format json =
    match json with
    | Null -> "null"
    | Int i -> i.ToString()
    | String s ->
        let s = s.Replace("\\", "\\\\").Replace("\n", "\\n").Replace("\t", "\\t").Replace("\"", "\\\"")
        sprintf "\"%s\"" s
    | Bool b -> if b then "true" else "false"
    | Array a ->
        sprintf "[%s]" (System.String.Join(",", Array.map Format a))
    | Object o ->
        sprintf "{%s}" (System.String.Join(",", o |> Seq.map (fun kvp -> sprintf "\"%s\":%s" kvp.Key (Format kvp.Value)) |> Array.ofSeq))

type JsonValue with
    member t.AsInt = match t with Int(x) -> x | _ -> invalidOp ((Format t) + " is not an int")
    member t.AsString = match t with String(x) -> x | Null -> null | _ -> invalidOp ((Format t) + " is not a string")
    member t.AsBool = match t with Bool(x) -> x | _ -> invalidOp ((Format t) + " is not a bool")
    member t.AsArray = match t with Array(x) -> x | _ -> invalidOp ((Format t) + " is not an array")
    member t.AsObject = match t with Object(x) -> x | _ -> invalidOp ((Format t) + " is not an object")

/// Create a JsonValue from any System.Object.
let rec fromObject (obj:obj) =
    match obj with
    | null -> Null
    | :? string as x -> String x
    | :? int as x -> Int x
    | :? bool as x -> Bool x
    | :? System.Collections.IEnumerable as x -> Seq.cast x |> Seq.map fromObject |> Array.ofSeq |> Array
    | _ -> invalidArg "obj" (sprintf "Cannot convert type '%s' to json!" (obj.GetType().Name))

