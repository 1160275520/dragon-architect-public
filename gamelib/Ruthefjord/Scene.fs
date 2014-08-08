/// Types and parsing/serialization functions for the JSON data structures that represent puzzles and modules.
module Ruthefjord.Scene

module J = Json

let private jload obj key fn = fn (Json.getField obj key)
let private tryJload obj key fn = Json.tryGetField obj key |> Option.map fn
let private jsonOfSet (s:Set<string>) = J.arrayOfSeq (Seq.map J.String s)
let private setOfJson j = J.arrayToArray j |> Array.map J.asString |> Set.ofArray
let inline private toJson obj =  (^a : (member ToJson : unit -> J.JsonValue) obj)
let inline private nullOrToJson o = match o with Some x -> toJson x | None -> J.Null

type Library = {
    RequiredTools: Set<string>;
    GrantedTools: Set<string>;
} with
    member x.ToJson () =
        J.JsonValue.ObjectOf [
            "required", jsonOfSet x.RequiredTools;
            "granted", jsonOfSet x.GrantedTools;
        ]

    static member Parse j =
        {
            RequiredTools = jload j "required" setOfJson;
            GrantedTools = jload j "granted" setOfJson;
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

type Program =
/// resource name, will be loaded from file
| Resource of string
/// inline program text
| Text of string
/// leave the old program around
| Preserve
with
    member x.ToJson () =
        let fields =
            match x with
            | Resource r -> ["type", J.String "resource"; "value", J.String r]
            | Text t -> ["type", J.String "text"; "value", J.String t]
            | Preserve -> ["type", J.String "preserve"]
        J.JsonValue.ObjectOf fields

    static member Parse j =
        match jload j "type" J.asString with
        | "resource" -> Resource (jload j "value" J.asString)
        | "text" -> Text (jload j "value" J.asString)
        | "preserve" -> Preserve
        | s -> raise (J.TypeMismatchException (j, "Program", sprintf "illegal program type %s" s, null))

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
    member x.UpdateStartingProgram program = {x with StartingProgram=Some (Text program);}
    member x.UpdateStartingProgramToPreserve = {x with StartingProgram=Some Preserve;}

    /// Compute a checksum of this level info (for logging).
    member x.Checksum () =
        let hash = System.Security.Cryptography.HashAlgorithm.Create "MD5"
        // implementation relies on json library to sort keys.
        let text = x.ToJson () |> J.Serialize |> System.Text.Encoding.UTF8.GetBytes
        hash.ComputeHash text |> Util.binaryToHex