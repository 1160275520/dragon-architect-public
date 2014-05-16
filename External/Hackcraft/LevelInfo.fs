namespace Hackcraft

type LevelInfo = struct
    val AvailCommands: Map<string, bool>;
    val NumHelperFuncs: int;

    new (map, funcs) = {AvailCommands = map; NumHelperFuncs = funcs}
end