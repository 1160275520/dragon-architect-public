/// Implementation of the world grid, used by simulation to compute game state.
/// See Ast.fs
namespace Ruthefjord

open System
open System.Collections.Generic
open Ruthefjord.Ast.Imperative

type Cube = int * Robot.Command
type Cube2 = int * Robot.Command2

type GridStateTracker(init: KeyValuePair<IntVec3, Cube> seq) =

    let MAX_CUBES = 8000

    let mutable cells = Dictionary()
    do
        for kvp in init do cells.Add (kvp.Key, kvp.Value)

    static member Empty () = GridStateTracker []

    member x.CurrentState =
        ImmArr.ofSeq cells

    member x.AddObject idx cube = if cells.Count < MAX_CUBES && not (cells.ContainsKey idx) then cells.Add (idx, cube)
    member x.OverwriteObject idx cube = cells.[idx] <- cube
    member x.RemoveObject idx = cells.Remove idx |> ignore
    member x.GetObject idx =
        let v = ref (0,null)
        if cells.TryGetValue (idx, v) then Some !v else None

type GridStateTracker2(init: (IntVec3 * Cube2) seq) =

    let MAX_CUBES = 8000

    let mutable cells = Seq.fold (fun (m:Map<IntVec3, Cube2>) (i, c) -> m.Add (i, c)) Map.empty init

    static member Empty () = GridStateTracker2 []

    member x.CurrentState = cells

    member x.AddObject idx cube = if cells.Count < MAX_CUBES && not (cells.ContainsKey idx) then cells <- cells.Add (idx, cube)
    member x.OverwriteObject idx cube = cells <- cells.Add (idx, cube)
    member x.RemoveObject idx = cells <- cells.Remove idx
    member x.GetObject idx = cells.TryFind idx

type BasicRobot = {
    Position: IntVec3;
    Direction: IntVec3;
}

type BasicRobotDelta = {
    PosDelta: IntVec3;
    TurnCounter: int; // -1 for each left turn, +1 for each right turn
}
with
    member x.ApplyTo bot = {Position=bot.Position + x.PosDelta; Direction=x.GetNewDir bot.Direction}
    member x.GetNewDir (dir:IntVec3) =
        match x.TurnCounter % 4 with
        | (-3 | 1) -> (new IntVec3(dir.Z, 0, -dir.X))
        | (-2 | 2) -> (new IntVec3(-dir.X, 0, -dir.Z))
        | (-1 | 3) -> (new IntVec3(-dir.Z, 0, dir.X))
        | 0 -> dir
    static member Combine a b = {PosDelta=a.PosDelta + b.PosDelta; TurnCounter=a.TurnCounter + b.TurnCounter}

type BasicWorldState = {
    Robot: BasicRobot;
    Grid: ImmArr<KeyValuePair<IntVec3,Cube>>;
}

type BasicWorldState2 = {
    Robot: BasicRobot;
    Grid: Map<IntVec3,Cube2>;
}

type BasicWorldStateDelta = {
    RobotDelta:BasicRobotDelta;
    GridDelta:Map<IntVec3,Cube2>;
}
with
    member x.ApplyTo(state:BasicWorldState2) =
        let newGrid = Map.fold (fun (grid:Map<IntVec3, Cube2>) delta cube -> grid.Add ((state.Robot.Position + delta), cube)) Map.empty x.GridDelta
        {Robot=x.RobotDelta.ApplyTo(state.Robot); Grid=MyMap.merge newGrid state.Grid}
    static member Combine a b =
        let gridB = Map.fold (fun (grid:Map<IntVec3, Cube2>) delta cube -> grid.Add ((a.RobotDelta.PosDelta + delta), cube)) Map.empty b.GridDelta
        {RobotDelta=BasicRobotDelta.Combine a.RobotDelta b.RobotDelta; GridDelta=MyMap.merge a.GridDelta gridB}

type BasicImperativeRobotSimulator(initialRobot, initialGrid) =
    let mutable robot = initialRobot
    let mutable grid : GridStateTracker = initialGrid

    let pos() = robot.Position
    let dir() = robot.Direction

    static member FromWorldState (ws:BasicWorldState) =
        BasicImperativeRobotSimulator (ws.Robot, GridStateTracker ws.Grid)

    static member Colors = [| "#1ca84f"; "#a870b7"; "#ff1a6d"; "#00bcf4"; "#ffc911"; "#ff6e3d"; "#000000"; "#ffffff" |]

    member x.Grid with get () = grid and set g = grid <- g

    interface Robot.IRobotSimulator with
        member x.Execute command =
            if command <> null then
                let p = robot.Position
                let d = robot.Direction
                match command.Name with
                | "forward" -> robot <- {robot with Position=p + d}
                | "up" -> robot <- {robot with Position=p + IntVec3.UnitY}
                | "down" -> if p.Y > 0 then robot <- {robot with Position=p - IntVec3.UnitY}
                | "left" -> robot <- {robot with Direction=IntVec3 (-d.Z, 0, d.X)}
                | "right" -> robot <- {robot with Direction=IntVec3 (d.Z, 0, -d.X)}
                | "cube" ->
                    let cube = command.Args.[0] :?> int
                    grid.AddObject p (cube, command)
                | "remove" -> grid.RemoveObject p
                | _ -> ()
            else ()

        member x.Query query =
            match query.Name with
            | "isblockatpos" -> upcast ((grid.GetObject robot.Position).IsSome)
            | _ -> upcast ()

        member x.CurrentState =
            let state:BasicWorldState = {Robot=robot; Grid=grid.CurrentState}
            upcast state

type BasicImperativeRobotSimulator2(initialRobot, initialGrid) =
    let mutable robot = initialRobot
    let mutable grid : GridStateTracker2 = initialGrid

    let pos() = robot.Position
    let dir() = robot.Direction

    static member Colors = [| "#1ca84f"; "#a870b7"; "#ff1a6d"; "#00bcf4"; "#ffc911"; "#ff6e3d"; "#000000"; "#ffffff" |]

    member x.Grid with get () = grid and set g = grid <- g
    member x.Robot with get () = robot and set r = robot <- r

    interface Robot.IRobotSimulator2 with
        member x.Execute command =
            let p = robot.Position
            let d = robot.Direction
            match command.Name with
            | "forward" -> robot <- {robot with Position=p + d}
            | "up" -> robot <- {robot with Position=p + IntVec3.UnitY}
            | "down" -> if p.Y > 0 then robot <- {robot with Position=p - IntVec3.UnitY}
            | "left" -> robot <- {robot with Direction=IntVec3 (-d.Z, 0, d.X)}
            | "right" -> robot <- {robot with Direction=IntVec3 (d.Z, 0, -d.X)}
            | "cube" ->
                let cube = command.Args.[0] :?> int
                grid.AddObject p (cube, command)
            | "remove" -> grid.RemoveObject p
            | _ -> ()

        member x.Query query =
            match query.Name with
            | "isblockatpos" -> upcast ((grid.GetObject robot.Position).IsSome)
            | _ -> upcast ()

        member x.CurrentState =
            let state:BasicWorldState2 = {Robot=robot; Grid=grid.CurrentState}
            upcast state

        member x.GetDelta commands =
            let robotStart = robot
            let gridStart = grid.CurrentState
            let gridDelta = GridStateTracker2.Empty()
            let exec (pretendY, low, turnCounter) (c:Robot.Command2) =
                (x :> Robot.IRobotSimulator2).Execute c
                match c.Name with
                | "down" -> (pretendY - 1, min low (pretendY - 1), turnCounter)
                | "up" -> (pretendY + 1, low, turnCounter)
                | "left" -> (pretendY, low, turnCounter - 1)
                | "right" -> (pretendY, low, turnCounter + 1)
                | "cube" ->
                    let cube = c.Args.[0] :?> int
                    gridDelta.AddObject (robot.Position - robotStart.Position) (cube, c)
                    (pretendY, low, turnCounter)
                | _ -> (pretendY, low, turnCounter)
            let r = (List.fold exec (robot.Position.Y, 0, 0) commands)
            match r with
            | (low, _, _) when low < 0 -> None
            | (_, _, turnCounter) ->
                let delta = {RobotDelta={PosDelta=robot.Position - robotStart.Position; TurnCounter=turnCounter}; GridDelta=gridDelta.CurrentState}
                robot <- robotStart
                grid <- GridStateTracker2 (Map.toSeq gridStart)
                Some(upcast delta)
