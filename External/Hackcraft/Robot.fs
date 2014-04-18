namespace Hackcraft.Robot

open Hackcraft

type IRobot =
    abstract member Position : IntVec3
    /// The unit vector pointing in the robots direction
    abstract member Direction : IntVec3

    abstract member Execute : grid:IGrid -> command:string -> unit

    abstract member Clone : IRobot


type BasicImperativeRobot(aPos, aDir) =
    let mutable pos = aPos
    let mutable dir = aDir

    interface IRobot with
        member x.Position = pos
        member x.Direction = dir
        member x.Execute (grid:IGrid) command =
            match command with
            | "forward" -> pos <- pos + dir
            | "up" -> pos <- pos + IntVec3.UnitY
            | "down" -> pos <- pos - IntVec3.UnitY
            | "left" -> dir <- IntVec3 (-dir.Z, 0, dir.X)
            | "right" -> dir <- IntVec3 (dir.Z, 0, -dir.X)
            | "block" -> grid.AddObject pos
            | "remove" -> grid.RemoveObject pos
            | _ -> ()
        member x.Clone = upcast BasicImperativeRobot (pos, dir)
