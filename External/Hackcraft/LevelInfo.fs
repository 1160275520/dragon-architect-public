namespace Hackcraft

type LevelInfo = struct
    val AvailCommands: Map<string, bool>;
    val NumHelperFuncs: int;
    val LockedProcs: Set<string>;

    new (map, funcs, locks) = {AvailCommands = map; NumHelperFuncs = funcs; LockedProcs = locks}
end