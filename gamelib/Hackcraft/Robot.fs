namespace Hackcraft.Robot

open Hackcraft

[<AllowNullLiteral>]
type Command(t,a) =
    member x.Type: string = t
    member x.Args: ImmArr<obj> = a

type IRobot =
    abstract member Position : IntVec3
    /// The unit vector pointing in the robots direction
    abstract member Direction : IntVec3

    abstract member Execute : grid:IGrid -> command:Command -> unit

    abstract member Clone : IRobot


type BasicImperativeRobot(aPos, aDir) =
    let mutable pos = aPos
    let mutable dir = aDir

    static member Colors = [| "#5cab32"; "#000000"; "#ffffff"; "#ff0000" |]

    interface IRobot with
        member x.Position = pos
        member x.Direction = dir
        member x.Execute (grid:IGrid) command =
            if command <> null then
                match command.Type with
                | "forward" -> pos <- pos + dir
                | "up" -> pos <- pos + IntVec3.UnitY
                | "down" -> pos <- if pos.Y > 0 then pos - IntVec3.UnitY else pos
                | "left" -> dir <- IntVec3 (-dir.Z, 0, dir.X)
                | "right" -> dir <- IntVec3 (dir.Z, 0, -dir.X)
                | "block" ->
                    let block = System.Array.IndexOf(BasicImperativeRobot.Colors, command.Args.[0]) + 1
                    grid.AddObject pos block
                | "remove" -> grid.RemoveObject pos
                | _ -> ()
            else ()
        member x.Clone = upcast BasicImperativeRobot (pos, dir)
