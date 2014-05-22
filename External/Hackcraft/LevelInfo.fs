namespace Hackcraft

type LevelInfo = struct
    val AvailCommands: Map<string, bool>;
    val NumHelperFuncs: int;
    val LockedProcs: Set<string>;
    val HighlightBlocks: Set<string>;

    new (map, funcs, locks, blocks) = {AvailCommands = map; NumHelperFuncs = funcs; LockedProcs = locks; HighlightBlocks = blocks;}
end