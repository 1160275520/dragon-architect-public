module Hackcraft.Scene

module J = Json

type LevelInfo(qid, availCommands, numHelperFuncs, lockedProcs, highlightBlocks) =
    member x.Qid : int = qid
    member x.AvailCommands : Set<string> = Set.ofSeq availCommands
    member x.NumHelperFuncs : int = numHelperFuncs
    member x.LockedProcs : Set<string> = Set.ofSeq lockedProcs
    member x.HighlightBlocks : Set<string> = Set.ofSeq highlightBlocks

    member x.ToJson () =
        Json.JsonValue.ObjectOf [
            "qid", Json.Int x.Qid;
            "commands", Json.fromObject x.AvailCommands;
            "funcs", Json.Int x.NumHelperFuncs;
            "locks", Json.fromObject x.LockedProcs;
            "highlights", Json.fromObject x.HighlightBlocks;
        ]

type Library = {
    RequiredTools: Set<string>;
    GrantedTools: Set<string>;
}

type Tutorial = {
    HighlightedBlocks: Set<string>;
}

type Program =
/// resource name, will be loaded from file
| Resource of string
/// inline program text
| Text of string

type SceneInfo = {
    SceneId: int;
    Name: string;
    Library: Library;
    Tutorial: Tutorial;
    Program: Program;
    Component: string;
}

let FORMAT_VERSION = 1

type SceneInfo with
    member x.ToJson () =
        J.JsonValue.ObjectOf [
            "version", J.Int FORMAT_VERSION;
            "levelid", J.Int x.SceneId;
        ]

    /// Compute a checksum of this level info (for logging).
    member x.Checksum () =
        let hash = System.Security.Cryptography.HashAlgorithm.Create "MD5"
        // implementation relies on json library to sort keys.
        let text = x.ToJson () |> J.Serialize |> System.Text.Encoding.UTF8.GetBytes
        hash.ComputeHash text |> Util.binaryToHex

type ModuleInfo = {
    Scenes: Set<int>;

}
