// Copyright (C) 2014 Eric Butler (zantifon@gmail.com)

/// <summary>
/// A lightweight JSON parser/formatter and related tools for processing JSON data.
/// </summary>
/// <remarks>
/// This module's goal is a lightweight JSON lib with a F# discriminated untion AST representation that doesn't have external dependencies (other than F# 2.0).
/// This is only a partial implementation of the JSON spec: e.g., it supports integers rather than numbers, some escape codes may be unsupported.
/// It also aims to allow for simple parsing of data structures from JSON ast (for use with storing data files) without using schemas.
/// The json processing functions that come with the AST throw exceptions which can be paired with meta data to allow tools to pinpoint problematic data, without a significant burden on the external code that processes JSON.
/// </remarks>
module Hackcraft.Json

open System.Collections
open System.Collections.Generic

/// json arrays are mutable, which I don't like, but I don't want to drag in depedencies to get efficient immutable array types >_>
type JsonArray = array<JsonValue>
and JsonObject = Map<string, JsonValue>
/// the Json AST.
and JsonValue =
| Null
| Int of int
| String of string
| Bool of bool
| Array of JsonArray
| Object of JsonObject

type JsonErrorCode =
| TypeMismatch = 51
| KeyNotFound = 52

/// Base class for any errors produced by the helper functions.
type JsonError(value: JsonValue, code: int, message: string, inner: System.Exception) =
    inherit ScriptingError(message, inner)
    member this.Value = value

/// Thrown when a requested type does not match (e.g., (String "foo").AsBool)
type TypeMismatchError(value:JsonValue, typ:string, message:string, inner:System.Exception) =
    inherit JsonError(value, int JsonErrorCode.TypeMismatch, sprintf "Value was not of expected type '%s': %s" typ message, inner)
    member this.Type = typ

/// Thrown when a field is not present in an object
type KeyNotFoundError(obj:JsonValue, key:string, message:string, inner:System.Exception) =
    inherit JsonError(obj, int JsonErrorCode.KeyNotFound, sprintf "Object does not contain field '%s': %s" key message, inner)
    member this.Key = key

let private typeError v t = raise (TypeMismatchError (v, t, "", null))

let asInt t = match t with Int(x) -> x | _ -> typeError t "int"
let asString t = match t with String(x) -> x | Null -> null | _ -> typeError t "string"
let asBool t = match t with Bool(x) -> x | _ -> typeError t "bool"
let asArray t = match t with Array(x) -> x | Null -> null | _ -> typeError t "array"
let asObject t = match t with Object(x) -> x | _ -> typeError t "object"
let tryGetField t f = (asObject t).TryFind f
let getField t f = match tryGetField t f with Some v -> v | None -> raise (KeyNotFoundError (t, f, "", null))
let arrayOf (seq:#seq<JsonValue>) = Array (Array.ofSeq seq)
let objectOf (seq:#seq<string * JsonValue>) = Object (Map.ofSeq seq)

type JsonValue with
    member t.AsInt = asInt t
    member t.AsString = asString t
    member t.AsBool = asBool t
    member t.AsArray = asArray t
    member t.AsObject = asObject t
    member t.TryGetField f = tryGetField t f
    member t.GetField f = getField t f

/// Create a JsonValue from any System.Object.
/// Will intepret any IDictionary<string,obj> as an object, any other IEnumerable as an array, and primitive types appropriately.
/// Any other objects will cause an error.
/// Unfortuantely generic IDictionarys have to be string -> obj, I can't figure out how to easily check for other generic ones. :[
/// It works with non-generic IDictionary, though!
let rec fromObject (obj:obj) =
    match obj with
    | null -> Null
    | :? string as x -> String x
    | :? int as x -> Int x
    | :? bool as x -> Bool x
    | :? IDictionary<string,obj> as x -> x |> Seq.map (fun kvp -> (kvp.Key, fromObject kvp.Value)) |> objectOf
    | :? IDictionary as x -> Seq.cast<DictionaryEntry> x |> Seq.map (fun kvp -> (kvp.Key :?> string, fromObject kvp.Value)) |> objectOf
    | :? IEnumerable as x -> Seq.cast x |> Seq.map fromObject |> arrayOf
    | _ -> invalidArg "obj" (sprintf "Cannot convert type '%s' to json!" (obj.GetType().Name))

/// Information about a JsonValue's relation to it's parent.
[<RequireQualifiedAccess>]
type ChildType =
/// Value is a field of an object with this field name.
| Field of string
/// Value is an entry of an array with this index.
| Index of int
/// Value has no parent; is the root.
| Root

/// Meta data associated with a JSON ast node.
/// Meta data is represented as a separated object (accessible via hashmap) in order to simplify the AST, desireable for two reasons:
/// 1) Many consumers simply won't care about the metadata so we don't want it complicating usage.
/// 2) Program-generated json is very common, and having to fabricate this data (or even fill in empty data) would complicate usage.
/// The performance penalties from needing a hash map are neglible since JSON the map will typically only be accessed for reporting errors, which is an exceptional event.
/// The map uses reference equality, so, obviously, if an AST node is replaced with an equivalent one, it will no longer work.
type Meta = {
    /// The location of this value in the concrete text.
    Location: Location;
    /// How this value is referenced from its immediate ancestor.
    /// Field(str) means it's the "str" field on a JsonObject,
    /// Index(n) means it's the nth entry of a JsonArray,
    /// while Root means it's at the root of the hierarchy.
    ChildType: ChildType;
    /// The parent of this json object, will be either an array or object (none if root).
    Parent: JsonValue option;
}

type ParseResult = {
    Ast: JsonValue;
    // we have to use a mutable dictionary since Map doesn't let you override equality and we need reference equality >_> (and we're stuck with .NET 3.5... and I'm too lazy to find/write an immutable map)
    Meta: Dictionary<JsonValue, Meta>;
}

type SyntaxErrorCode =
| InternalCompilerError = 1
| ExpectedCharacter = 2
| InvalidEscapeCharacter = 3
| MultilineString = 4
| InvalidKeyword = 5
| InvalidCharacter = 6
| UnexpectedEOF = 7

type private Parser(program, filename) =
    let cs = CharStream (program, filename, fun loc -> upcast SyntaxError ("json", int SyntaxErrorCode.UnexpectedEOF, loc, "Unexpected EOF.", null))
    let meta = Dictionary<JsonValue, Meta>(Collections.HashIdentity.Reference)

    let syntaxError (code:SyntaxErrorCode) (pstart,pend) message = raise (SyntaxError ("json", int code, Location (pstart, pend, cs.Filename), message, null))

    let isSpace c = c = ' ' || c = '\r' || c = '\n' || c = '\t'

    let isNewline c = c = '\n'

    let skipWhitespace () = while (not cs.IsEOF) && (isSpace cs.Peek) do ignore (cs.Next ())

    let matchCharacter c =
        let p = cs.Position
        let n = cs.Next()
        if (n <> c) then syntaxError SyntaxErrorCode.ExpectedCharacter (p,cs.Position) (sprintf "expected character %O, got %O" c n)
        skipWhitespace ()

    let parseString doReadOpeningQuote =
        if doReadOpeningQuote then matchCharacter '"' 
        let start = cs.Position // not quite correct pos, but MEH
        let builder = System.Text.StringBuilder ()
        while not (cs.Peek = '"' || isNewline cs.Peek) do
            let c = cs.Next()
            if c = '\\'
            then
                let ec =
                    match cs.Next() with
                    | 'n' -> '\n'
                    | 't' -> '\t'
                    | '"' -> '"'
                    | '\\' -> '\\'
                    | x -> syntaxError SyntaxErrorCode.InvalidEscapeCharacter (cs.Position,cs.Position) (sprintf "invalid escape character '\%c'" x)
                builder.Append ec |> ignore
            else builder.Append c |> ignore
        let s = builder.ToString ()
        // if there is a newline, that's an error, otherwise skip the right quote
        let p = cs.Position
        if isNewline (cs.Next()) then syntaxError SyntaxErrorCode.MultilineString (start,p) "String literals may not span multiple lines"
        skipWhitespace ()
        s

    // recursively parse the json value, generating the meta data as we go
    let rec parse (childType: ChildType) =
        let start = cs.Position

        skipWhitespace ()

        let value, children =
            match cs.Next () with
            | '{' ->
                skipWhitespace ()
                let items = List()
                while not (cs.Peek = '}') do
                    let key = parseString true
                    matchCharacter ':'
                    let value = parse (ChildType.Field key)
                    items.Add ((key, value)) |> ignore
                    if not (cs.Peek = '}') then matchCharacter ','
                cs.Next () |> ignore // skip final }
                Object (Map.ofSeq items), Seq.map snd items
            | '[' ->
                let values = List()
                let mutable counter = 0
                while not (cs.Peek = ']') do
                    values.Add (parse (ChildType.Index counter)) |> ignore
                    counter <- counter + 1
                    if not (cs.Peek = ']') then matchCharacter ','
                cs.Next () |> ignore // skip final ]
                arrayOf values, upcast values
            | c when System.Char.IsDigit c ->
                let s = System.String [| yield c; while System.Char.IsDigit cs.Peek do yield cs.Next() |]
                Int (System.Int32.Parse s), Seq.empty
            | c when System.Char.IsLetter c ->
                let s = System.String [| yield c; while System.Char.IsLetter cs.Peek do yield cs.Next() |]
                let value =
                    match s with
                    | "true" -> Bool true
                    | "false" -> Bool false
                    | "null" -> Null
                    | _ -> syntaxError SyntaxErrorCode.InvalidKeyword (start,cs.Position) "invalid keyword"
                value, Seq.empty
            | '"' -> String (parseString false), Seq.empty
            | c -> syntaxError SyntaxErrorCode.InvalidCharacter (start,start) (sprintf "invalid character %O" c)

        skipWhitespace ()

        let lend = cs.Position
        // generate meta (but with no parent; we don't know the parent yet since it hasn't been parsed!)
        meta.Add (value, {Location=Location(start, lend, cs.Filename); ChildType=childType; Parent=None;})
        // update all children's meta now that we have the parent object
        for child in children do
            meta.[child] <- {meta.[child] with Parent=Some value}

        value

    member x.Parse () =
        let ast = parse ChildType.Root
        {Ast=ast; Meta=meta}

let ParseWithMeta string filename =
    try Parser(string, filename).Parse()
    with
    | :? CompilerError -> reraise ()
    | e -> raise (SyntaxError ("json", int SyntaxErrorCode.InternalCompilerError, Location.Empty, "Internal compiler error.", e))

let Parse string = (ParseWithMeta string "").Ast

/// Format json with little wasted space. There's still spaces after ':' and ',' though.
let rec Format json =
    match json with
    | Null -> "null"
    | Int i -> i.ToString()
    | String s ->
        let s = s.Replace("\\", "\\\\").Replace("\n", "\\n").Replace("\t", "\\t").Replace("\"", "\\\"")
        sprintf "\"%s\"" s
    | Bool b -> if b then "true" else "false"
    | Array a ->
        sprintf "[%s]" (System.String.Join(", ", Array.map Format a))
    | Object o ->
        sprintf "{%s}" (System.String.Join(", ", o |> Seq.map (fun kvp -> sprintf "\"%s\":%s" kvp.Key (Format kvp.Value)) |> Array.ofSeq))

/// Formats json in the following way:
/// the top level object has each field on a new line,
/// sub objects up to maxIndent levels deep are pretty-printed with 4-space indent, everything on new line,
/// past maxIndent levels, everything else is smashed together without newlines.
let PrettyFormat maxIndent json =
    let rec formatVal indent jval =
        let indentStr = new System.String(' ', 4 * indent)
        let indentStr2 = new System.String(' ', 4 * (max 0 (indent - 1)))
        match jval with
        | Object o when indent < maxIndent && not o.IsEmpty ->
            let x = Map.toArray o |> Array.map (fun (k,v) -> sprintf "%s\"%s\": %s" indentStr k (formatVal (indent + 1) v))
            sprintf "{\n%s\n%s}" (System.String.Join (",\n", x)) indentStr2
        | Array a when indent < maxIndent && a.Length > 0 ->
            let x = a |> Array.map (fun v -> sprintf "%s%s" indentStr (formatVal (indent + 1) v))
            sprintf "[\n%s\n%s]" (System.String.Join (",\n", x)) indentStr2
        | _ ->
            Format jval

    formatVal 0 json

