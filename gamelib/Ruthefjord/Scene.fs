/// Types and parsing/serialization functions for the JSON data structures that represent puzzles and modules.
module Ruthefjord.Scene

open System
module J = Json

let private jload obj key fn = fn (Json.getField obj key)
let private tryJload obj key fn = Json.tryGetField obj key |> Option.map fn
let private jsonOfSet (s:Set<string>) = J.arrayOfSeq (Seq.map J.String s)
let private setOfJson j = J.arrayToArray j |> Array.map J.asString |> Set.ofArray
let inline private toJson obj =  (^a : (member ToJson : unit -> J.JsonValue) obj)
let inline private nullOrToJson o = match o with Some x -> toJson x | None -> J.Null

type Program =
/// resource name, will be loaded from file
| Resource of string
| Json of string
| Ast of Ast.Imperative.Program
with
    /// Automatically converts Ast to Json.
    member x.ToJson () =
        let fields =
            match x with
            | Resource r -> ["type", J.String "resource"; "value", J.String r]
            | Json s -> ["type", J.String "json"; "value", J.String s]
            | Ast ast -> ["type", J.String "json"; "value", Serialization.JsonOfProgram ast |> J.Serialize |> J.String]
        J.JsonValue.ObjectOf fields

    member x.Load (getResourceFn:Func<string,string>) =
        match x with
        | Resource r -> Parser.Parse (getResourceFn.Invoke r, r)
        | Json j -> Serialization.ProgramOfJson (J.Parse j)
        | _ -> invalidOp (sprintf "loading program unsupported for %A!" x)

    member x.LoadToAst getResourceFn = Ast (x.Load getResourceFn)

    member x.AsAst = match x with Ast ast -> ast | _ -> invalidOp "not an ast"

    static member Parse j =
        match jload j "type" J.asString with
        | "resource" -> Resource (jload j "value" J.asString)
        | "json" -> Json (jload j "value" J.asString)
        | s -> raise (J.TypeMismatchException (j, "Program", sprintf "illegal program type %s" s, null))

type CodeModule = {
    Name: string;
    Program: Program;
}

type Library = {
    RequiredTools: Set<string>;
    GrantedTools: Set<string>;
    RestrictedCategories: Set<string>;
    AutoImportedModules: Program list;
} with
    member x.ToJson () =
        J.JsonValue.ObjectOf [
            "required", jsonOfSet x.RequiredTools;
            "granted", jsonOfSet x.GrantedTools;
            "restricted", jsonOfSet x.RestrictedCategories;
            "autoimports", x.AutoImportedModules |> List.map (fun p -> p.ToJson ()) |> Json.arrayOfList
        ]

    static member Parse j =
        {
            RequiredTools = jload j "required" setOfJson;
            GrantedTools = jload j "granted" setOfJson;
            RestrictedCategories = defaultArg (tryJload j "restricted" setOfJson) Set.empty;
            AutoImportedModules = defaultArg (tryJload j "autoimports" Json.arrayToList) [] |> List.map Program.Parse
        }

type Instructions = {
    Summary: string;
    Detail: string;
} with
    member x.ToJson () =
        J.JsonValue.ObjectOf [
            "summary", J.String x.Summary;
            "detail", J.String x.Detail;
        ]

    static member Parse j =
        {
            Summary = jload j "summary" J.asString;
            Detail = jload j "detail" J.asString;
        }

type Tutorial = {
    HighlightedBlocks: Set<string>;
} with
    member x.ToJson () =
        J.JsonValue.ObjectOf [
            "highlighted", jsonOfSet x.HighlightedBlocks;
        ]

    static member Parse j =
        {
            HighlightedBlocks = defaultArg (tryJload j "highlighted" setOfJson) Set.empty;
        }

let FORMAT_VERSION = 1

type PuzzleInfo = {
    LoggingId: int;
    Name: string;
    Component: string option;
    Library: Library;
    Tutorial: Tutorial option;
    Instructions: Instructions option;
    StartingProgram: Program option;
    WorldData: WorldData option;
    Goals: J.JsonValue;
} with
    // need to produce the json with and without the checksum so the checksum can actually be computed
    member x.ToJson () =
        J.JsonValue.ObjectOf [
            "version", J.Int FORMAT_VERSION;
            "logging_id", J.Int x.LoggingId;
            "name", J.String x.Name;
            "component", defaultArg (Option.map J.String x.Component) J.Null;
            "library", x.Library.ToJson ();
            "tutorial", nullOrToJson x.Tutorial;
            "instructions", nullOrToJson x.Instructions;
            "program", nullOrToJson x.StartingProgram;
            "world", defaultArg (Option.map World.encodeToJson x.WorldData) J.Null;
            "goals", x.Goals;
        ]

    static member Parse j =
        {
            LoggingId = jload j "logging_id" J.asInt
            Name = jload j "name" J.asString;
            Component = tryJload j "component" J.asString;
            Library = jload j "library" Library.Parse;
            Tutorial = tryJload j "tutorial" Tutorial.Parse;
            Instructions = tryJload j "instructions" Instructions.Parse;
            StartingProgram = tryJload j "program" Program.Parse;
            WorldData = tryJload j "world" World.decodeFromJsonNoMeta;
            Goals = defaultArg (j.TryGetField "goals") J.Null;
        }

    member x.UpdateInstructions instructions = {x with Instructions=Some instructions;}

    /// Load all programs (starting and library imports) from Resources/Json into Ast.
    member x.LoadPrograms (getResourceFn:Func<string,string>) =
        let load (p:Program) = p.LoadToAst getResourceFn

        {x with
            StartingProgram = x.StartingProgram |> Option.map load;
            Library = {x.Library with AutoImportedModules = List.map load x.Library.AutoImportedModules};
        }

    /// Compute a checksum of this level info (for logging).
    member x.Checksum () =
        let hash = System.Security.Cryptography.HashAlgorithm.Create "MD5"
        // implementation relies on json library to sort keys.
        let text = x.ToJson () |> J.Serialize |> System.Text.Encoding.UTF8.GetBytes
        hash.ComputeHash text |> Util.binaryToHex
