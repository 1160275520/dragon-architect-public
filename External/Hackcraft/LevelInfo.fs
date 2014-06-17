namespace Hackcraft

type LevelInfo(qid, availCommands, numHelperFuncs, lockedProcs, highlightBlocks) =
    member x.Qid : int = qid
    member x.AvailCommands : Set<string> = Set.ofSeq availCommands
    member x.NumHelperFuncs : int = numHelperFuncs
    member x.LockedProcs : Set<string> = Set.ofSeq lockedProcs
    member x.HighlightBlocks : Set<string> = Set.ofSeq highlightBlocks

    member x.ToJson () =
        Json.objectOf [
            "qid", Json.Int x.Qid
            "commands", Json.fromObject x.AvailCommands;
            "funcs", Json.Int x.NumHelperFuncs;
            "locks", Json.fromObject x.LockedProcs;
            "highlights", Json.fromObject x.HighlightBlocks;
        ]
