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
open System.Text

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

/// Some of the error codes used by <c>SyntaxException</c>.
type SyntaxErrorCode =
| InternalError = 1001
| UnexpectedEOF = 1002
| ExpectedCharacter = 1003
| InvalidEscapeCharacter = 1004
| MultilineString = 1005
| InvalidKeyword = 1006
| InvalidCharacter = 1007
| TrailingCharacters = 1008

/// Some of the error codes used by <c>JsonException</c>.
type JsonErrorCode =
| TypeMismatch = 9002
| KeyNotFound = 9003

// Thrown when parsing fails.
[<Sealed>]
type SyntaxException (code: int, location: TextLocation, errorMessage: string, inner: System.Exception) =
    inherit System.Exception(sprintf "%O: Error %d: %s" location code errorMessage, inner)
    /// The error code.
    member x.Code = code
    /// The location in the text where the error occurred.
    member x.Location = location
    /// The detailed message about the error. For a string message including other fields in one string, use this.Message.
    member x.ErrorMessage = errorMessage

/// Base class for any errors produced by the helper functions.
type JsonException (code: int, value: JsonValue, message: string, inner: System.Exception) =
    inherit System.Exception (message, inner)
    /// The json value that this exception references.
    member this.Value = value

/// Thrown when a requested type does not match (e.g., (String "foo").AsBool)
[<Sealed>]
type TypeMismatchException (value:JsonValue, typ:string, message:string, inner:System.Exception) =
    inherit JsonException (int JsonErrorCode.TypeMismatch, value, sprintf "Value was not of expected type '%s': %s" typ message, inner)
    /// The type that was expected.
    member this.Expected = typ

/// Thrown when a field is not present in an object
[<Sealed>]
type KeyNotFoundException (obj:JsonValue, key:string, message:string, inner:System.Exception) =
    inherit JsonException (int JsonErrorCode.KeyNotFound, obj, sprintf "Object does not contain field '%s': %s" key message, inner)
    /// The field name that was expected.
    member this.Key = key

let private typeError v t = raise (TypeMismatchException (v, t, "", null))

/// <summary>Cast this value to an int.</summary>
/// <exception cref="TypeMismatchException">If this value is not an int.</exception>
let asInt j = match j with Int(x) -> x | _ -> typeError j "int"
/// <summary>Cast this value to an string.</summary>
/// <exception cref="TypeMismatchException">If this value is not an string.</exception>
let asString j = match j with String(x) -> x | Null -> null | _ -> typeError j "string"
/// <summary>Cast this value to an bool.</summary>
/// <exception cref="TypeMismatchException">If this value is not an bool.</exception>
let asBool j = match j with Bool(x) -> x | _ -> typeError j "bool"
/// <summary>Cast this value to an json array.</summary>
/// <exception cref="TypeMismatchException">If this value is not an json array.</exception>
let asArray j = match j with Array(x) -> x | Null -> null | _ -> typeError j "array"
/// <summary>Cast this value to an json object.</summary>
/// <exception cref="TypeMismatchException">If this value is not an json object.</exception>
let asObject j = match j with Object(x) -> x | _ -> typeError j "object"
/// <summary>Try to find the given field of the given object.</summary>
/// <exception cref="TypeMismatchException">If this value is not an json object.</exception>
let tryGetField j f = (asObject j).TryFind f
/// <summary>Return the given field of the given object.</summary>
/// <exception cref="TypeMismatchException">If this value is not an json object.</exception>
/// <exception cref="KeyNotFoundException">If this object does not have the given field.</exception>
let getField j f = match tryGetField j f with Some v -> v | None -> raise (KeyNotFoundException (j, f, "", null))

/// Construct a json array from a sequence of json values.
let arrayOf (seq:#seq<JsonValue>) = Array (Array.ofSeq seq)
/// Construct a json object from a sequence of (field name, json value) tuples.
let objectOf (seq:#seq<string * JsonValue>) = Object (Map.ofSeq seq)

type JsonValue with
    /// <summary>Cast this value to an int.</summary>
    /// <exception cref="TypeMismatchException">If this value is not an int.</exception>
    member t.AsInt = asInt t
    /// <summary>Cast this value to an string.</summary>
    /// <exception cref="TypeMismatchException">If this value is not an string.</exception>
    member t.AsString = asString t
    /// <summary>Cast this value to an bool.</summary>
    /// <exception cref="TypeMismatchException">If this value is not an bool.</exception>
    member t.AsBool = asBool t
    /// <summary>Cast this value to an json array.</summary>
    /// <exception cref="TypeMismatchException">If this value is not an json array.</exception>
    member t.AsArray = asArray t
    /// <summary>Cast this value to an json object.</summary>
    /// <exception cref="TypeMismatchException">If this value is not an json object.</exception>
    member t.AsObject = asObject t
    /// <summary>Try to find the given field of the given object.</summary>
    /// <exception cref="TypeMismatchException">If this value is not an json object.</exception>
    member t.TryGetField f = tryGetField t f
    /// <summary>Return the given field of the given object.</summary>
    /// <exception cref="TypeMismatchException">If this value is not an json object.</exception>
    /// <exception cref="KeyNotFoundException">If this object does not have the given field.</exception>
    member t.GetField f = getField t f

/// active pattern that checks if an object implements generic IDicationay<'a,'b> for any type and if so returns it as an IEnumerable of key-value tuples
let private (|DictType|_|) (obj:obj) : seq<obj * obj> option =
    let interfaces = obj.GetType().GetInterfaces()
    let dictType = typeof<IDictionary<_,_>>.GetGenericTypeDefinition()
    if interfaces |> Array.exists (fun t -> t.IsGenericType && t.GetGenericTypeDefinition() = dictType)
    then
        let arr = obj :?> IEnumerable |> Seq.cast |> Seq.cache
        if Seq.isEmpty arr
        then Some Seq.empty
        else
            let kvpType = (Seq.head arr).GetType()
            let keyProp = kvpType.GetProperty("Key")
            let valProp = kvpType.GetProperty("Value")
            Some (arr |> Seq.map (fun o -> (keyProp.GetValue (o, null), valProp.GetValue (o, null))))
    else None

/// <summary>Create a <c>JsonValue</c> from any <c>System.Object</c>.
/// Will interpret any <c>IDictionary</c> (generic or not) as an object, any other <c>IEnumerable</c> as an array, enum types as strings, and primitive types appropriately.
/// <c>Guid</c>s are output as strings.
/// Any other objects will cause an error.</summary>
/// <remarks>Obviously pretty slow because it needs to use a lot of casting and reflection to work (especially for json objects).
/// If performance is important, prefer the direct constructors.</remarks>
let rec fromObject (obj:obj) =
    match obj with
    | null -> Null
    | :? string as x -> String x
    | :? int as x -> Int x
    | :? bool as x -> Bool x
    | :? System.Guid as g -> String (g.ToString ())
    | DictType(seq) -> seq |> Seq.map (fun (k,v) -> (k :?> string, fromObject v)) |> objectOf
    | :? IDictionary as x -> Seq.cast<DictionaryEntry> x |> Seq.map (fun kvp -> (kvp.Key :?> string, fromObject kvp.Value)) |> objectOf
    | :? IEnumerable as x -> Seq.cast x |> Seq.map fromObject |> arrayOf
    | _ when obj.GetType().IsEnum -> String (System.Enum.GetName(obj.GetType(), obj))
    | _ -> invalidArg "obj" (sprintf "Cannot convert type '%s' to json!" (obj.GetType().Name))

/// Information about a JsonValue's relation to it's parent.
[<RequireQualifiedAccess>]
type ChildType =
/// Value is a field of an object with this field name.
| Field of string
/// Value is an entry of an array with this index.
| Index of int
/// Value has no parent; it is the root.
| Root

/// Meta data associated with a JSON ast node.
/// Meta data is represented as a separated object (accessible via hashmap) in order to simplify the AST, desireable for two reasons:
/// 1) Many consumers simply won't care about the metadata so we don't want it complicating usage.
/// 2) Program-generated json is very common, and having to fabricate this data (or even fill in empty data) would complicate usage.
/// The performance penalties from needing a hash map are neglible since JSON the map will typically only be accessed for reporting errors, which is an exceptional event.
/// The map uses reference equality, so, obviously, if an AST node is replaced with an equivalent one, it will no longer work.
type Meta = {
    /// The location of this value in the concrete text.
    Location: TextLocation;
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

type private Parser (program, filename, doParseMeta) =
    let cs = TextStream (program, filename, fun loc -> upcast SyntaxException (int SyntaxErrorCode.UnexpectedEOF, loc, "Unexpected EOF.", null))
    let meta = if doParseMeta then Dictionary<JsonValue, Meta> Collections.HashIdentity.Reference else null

    let syntaxError (code:SyntaxErrorCode) (pstart,pend) message = raise (SyntaxException (int code, TextLocation (pstart, pend, cs.Filename), message, null))

    let isSpace c = c = ' ' || c = '\r' || c = '\n' || c = '\t'

    let isNewline c = c = '\n'

    let skipWhitespace () = while (not cs.IsEOF) && (isSpace cs.Peek) do ignore (cs.Next ())

    let takeWhile (c:char) f =
        let b = StringBuilder ()
        b.Append c |> ignore
        while (not cs.IsEOF) && f cs.Peek do b.Append (cs.Next ()) |> ignore
        b.ToString ()

    let matchCharacter c =
        let p = cs.Position
        let n = cs.Next()
        if (n <> c) then syntaxError SyntaxErrorCode.ExpectedCharacter (p,cs.Position) (sprintf "expected character %O, got %O" c n)
        skipWhitespace ()

    let parseString doReadOpeningQuote =
        if doReadOpeningQuote then matchCharacter '"' 
        let start = cs.Position // not quite correct pos, but MEH
        let b = StringBuilder ()
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
                b.Append ec |> ignore
            else b.Append c |> ignore
        let s = b.ToString ()
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
                Object (items.ToArray () |> Map.ofArray), Seq.map snd items
            | '[' ->
                let values = List()
                let mutable counter = 0
                while not (cs.Peek = ']') do
                    values.Add (parse (ChildType.Index counter)) |> ignore
                    counter <- counter + 1
                    if not (cs.Peek = ']') then matchCharacter ','
                cs.Next () |> ignore // skip final ]
                Array (values.ToArray ()), upcast values
            | c when System.Char.IsDigit c ->
                Int (System.Int32.Parse (takeWhile c System.Char.IsDigit)), Seq.empty
            | c when System.Char.IsLetter c ->
                let value =
                    match takeWhile c System.Char.IsLetter with
                    | "true" -> Bool true
                    | "false" -> Bool false
                    | "null" -> Null
                    | _ -> syntaxError SyntaxErrorCode.InvalidKeyword (start,cs.Position) "invalid keyword"
                value, Seq.empty
            | '"' -> String (parseString false), Seq.empty
            | c -> syntaxError SyntaxErrorCode.InvalidCharacter (start,start) (sprintf "invalid character %O" c)

        skipWhitespace ()

        let lend = cs.Position
        if doParseMeta then
            // generate meta (but with no parent; we don't know the parent yet since it hasn't been parsed!)
            meta.Add (value, {Location=TextLocation(start, lend, cs.Filename); ChildType=childType; Parent=None;})
            // update all children's meta now that we have the parent object
            for child in children do
                meta.[child] <- {meta.[child] with Parent=Some value}

        value

    member x.Parse () =
        try
            let ast = parse ChildType.Root
            if not cs.IsEOF then syntaxError SyntaxErrorCode.TrailingCharacters (cs.Position, cs.Position) ("Unepxcted trailing characters")
            {Ast=ast; Meta=meta}
        with
        | :? SyntaxException -> reraise ()
        | e -> raise (SyntaxException (int SyntaxErrorCode.InternalError, TextLocation.Empty, "Internal parser error.", e))

/// <summary>Parse a string into a <c>JsonValue</c> returning both the parsed json and meta information about the parse tree.
/// This information can be used to, for example, map json values back to locations in the original text.</summary>
/// <exception cref="SyntaxException">If the string is malformed.</exception>
let ParseWithMeta string filename = Parser(string, filename, true).Parse()

/// <summary>Parse a string into a <c>JsonValue</c></summary>
/// <exception cref="SyntaxException">If the string is malformed.</exception>
let Parse string = Parser(string, "", false).Parse().Ast

let rec EncodeTo (writer:System.IO.TextWriter) value =
    match value with
    | Null -> writer.Write "null"
    | Int i -> writer.Write i
    | String s ->
        let s = s.Replace("\\", "\\\\").Replace("\n", "\\n").Replace("\t", "\\t").Replace("\"", "\\\"")
        writer.Write '\"'
        writer.Write s
        writer.Write '\"'
    | Bool b -> writer.Write (if b then "true" else "false")
    | Array a ->
        writer.Write '['
        for i = 0 to a.Length - 1 do
            if i > 0 then writer.Write ", "
            EncodeTo writer a.[i]
        writer.Write ']'
    | Object o ->
        let a = Map.toArray o
        writer.Write '{'
        for i = 0 to a.Length - 1 do
            if i > 0 then writer.Write ", "
            let k,v = a.[i]
            writer.Write '"'
            writer.Write k
            writer.Write '"'
            writer.Write ':'
            EncodeTo writer v
        writer.Write '}'

/// Format json with little wasted space. There's still spaces after ',' though.
let rec Format json =
    let sb = StringBuilder ()
    use sw = new System.IO.StringWriter(sb)
    EncodeTo sw json
    sb.ToString ()

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

