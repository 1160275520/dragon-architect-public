/// Implemntation of the different "robots".
/// Robots support a set of commands, and, given a command list produced by a program, change the world state.
/// See Ast.fs, Grid.fs
namespace Ruthefjord.Robot

open Ruthefjord

[<AllowNullLiteral>]
type Command(t,a) =
    member x.Type: string = t
    member x.Args: ImmArr<obj> = a

type Query = {
    Type: string;
    Args: obj list;
}

type IRobot =
    abstract member Position : IntVec3
    /// The unit vector pointing in the robots direction
    abstract member Direction : IntVec3
    abstract member Execute : grid:IGrid -> command:Command -> unit
    abstract member Query : grid:IGrid -> query:Query -> obj
    abstract member Clone : IRobot


type BasicImperativeRobot(aPos, aDir) =
    let mutable pos = aPos
    let mutable dir = aDir

    static member Colors = [| "#1ca84f"; "#a870b7"; "#ff1a6d"; "#00bcf4"; "#ffc911"; "#ff6e3d"; "#000000"; "#ffffff" |]

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
                    let block = command.Args.[0] :?> int
                    grid.AddObject pos block
                | "remove" -> grid.RemoveObject pos
                | _ -> ()
            else ()
        member x.Query (grid:IGrid) query =
            match query.Type with
            | "isblockatpos" -> upcast ((grid.GetObject pos).IsSome)
            | _ -> upcast ()
        member x.Clone = upcast BasicImperativeRobot (pos, dir)
