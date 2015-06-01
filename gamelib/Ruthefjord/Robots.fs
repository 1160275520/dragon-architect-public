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
with
    member r.DirRightTurn = IntVec3(r.Direction.Z, 0, -r.Direction.X)

type BasicRobotPositionDelta = {
    ParallelDelta: int;
    PerpenDelta: int;
    YDelta: int;
}
with
    member d.ApplyTo bot = bot.Position + d.ParallelDelta * bot.Direction + d.PerpenDelta * bot.DirRightTurn + IntVec3(0, d.YDelta, 0)
    static member Create (a:BasicRobot) (b:BasicRobot) =
        let posDelta = b.Position - a.Position
        {ParallelDelta=a.Direction.X * (posDelta).X + a.Direction.Z * (posDelta).Z;
         YDelta=(b.Position - a.Position).Y;
         PerpenDelta=a.DirRightTurn.X * (posDelta).X + a.DirRightTurn.Z * (posDelta).Z}
    static member Combine (a:BasicRobotPositionDelta) (b:BasicRobotPositionDelta) tc =
        match tc % 4 with
        | (-3 | 1) -> {ParallelDelta=a.ParallelDelta + b.PerpenDelta; PerpenDelta=a.PerpenDelta + b.ParallelDelta; YDelta=a.YDelta + b.YDelta}
        | (-2 | 2) -> {ParallelDelta=a.ParallelDelta - b.ParallelDelta; PerpenDelta=a.PerpenDelta - b.PerpenDelta; YDelta=a.YDelta + b.YDelta}
        | (-1 | 3) -> {ParallelDelta=a.ParallelDelta - b.PerpenDelta; PerpenDelta=a.PerpenDelta - b.ParallelDelta; YDelta=a.YDelta + b.YDelta}
        | _ -> {ParallelDelta=a.ParallelDelta + b.ParallelDelta; PerpenDelta=a.PerpenDelta + b.PerpenDelta; YDelta=a.YDelta + b.YDelta}


type BasicRobotDelta = {
    PosDelta:BasicRobotPositionDelta
    TurnCounter: int; // -1 for each left turn, +1 for each right turn
}
with
    static member Empty = {PosDelta={ParallelDelta=0; PerpenDelta=0; YDelta=0}; TurnCounter=0}

    member x.ParallelDelta = x.PosDelta.ParallelDelta
    member x.PerpenDelta = x.PosDelta.PerpenDelta
    member x.YDelta = x.PosDelta.YDelta
    // to apply PosDelta, we move the X in the current direction and move Z in the current direction turned ot the right
    member d.ApplyTo bot = {Position=d.PosDelta.ApplyTo bot;
                            Direction=d.GetNewDir bot.Direction}
    member x.GetNewDir (dir:IntVec3) =
        match x.TurnCounter % 4 with
        | (-3 | 1) -> (new IntVec3(dir.Z, 0, -dir.X))
        | (-2 | 2) -> (new IntVec3(-dir.X, 0, -dir.Z))
        | (-1 | 3) -> (new IntVec3(-dir.Z, 0, dir.X))
        | _ -> dir
    static member Combine (a:BasicRobotDelta) (b:BasicRobotDelta) =
        {PosDelta=BasicRobotPositionDelta.Combine a.PosDelta b.PosDelta a.TurnCounter; TurnCounter=a.TurnCounter + b.TurnCounter}



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
    GridDelta:Map<BasicRobotPositionDelta,Cube2>;
}
with
    static member Empty = {RobotDelta=BasicRobotDelta.Empty; GridDelta=Map.empty}

    member x.ApplyTo(state:BasicWorldState2) =
        let newGrid = Map.fold (fun (grid:Map<IntVec3, Cube2>) (delta:BasicRobotPositionDelta) cube ->
            grid.Add ((delta.ApplyTo state.Robot), cube)) Map.empty x.GridDelta
        {Robot=x.RobotDelta.ApplyTo(state.Robot); Grid=MyMap.merge newGrid state.Grid}
    static member Combine a b =
        let gridB = Map.fold (fun (grid:Map<BasicRobotPositionDelta, Cube2>) (delta:BasicRobotPositionDelta) cube ->
            grid.Add ((BasicRobotPositionDelta.Combine a.RobotDelta.PosDelta delta a.RobotDelta.TurnCounter), cube)) Map.empty b.GridDelta
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
            let exec (pretendY, low, turnCounter, (gridDelta:Map<BasicRobotPositionDelta, Cube2>)) (c:Robot.Command2) =
                (x :> Robot.IRobotSimulator2).Execute c
                match c.Name with
                | "down" -> (pretendY - 1, min low (pretendY - 1), turnCounter, gridDelta)
                | "up" -> (pretendY + 1, low, turnCounter, gridDelta)
                | "left" -> (pretendY, low, turnCounter - 1, gridDelta)
                | "right" -> (pretendY, low, turnCounter + 1, gridDelta)
                | "cube" ->
                    let cube = c.Args.[0] :?> int
                    (pretendY, low, turnCounter, (gridDelta.Add (BasicRobotPositionDelta.Create robotStart robot, (cube, c))))
                | _ -> (pretendY, low, turnCounter, gridDelta)
            let r = (List.fold exec (robot.Position.Y, 0, 0, Map.empty) commands)
            match r with
            | (low, _, _, _) when low < 0 -> None
            | (_, _, turnCounter, gridDelta) ->
                let delta = {RobotDelta={PosDelta=BasicRobotPositionDelta.Create robotStart robot;
                                         TurnCounter=turnCounter}; GridDelta=gridDelta}
                robot <- robotStart
                grid <- GridStateTracker2 (Map.toSeq gridStart)
                Some(upcast delta)

        member x.ApplyDelta delta =
            let result = (delta :?> BasicWorldStateDelta).ApplyTo((x :> Robot.IRobotSimulator2).CurrentState :?> BasicWorldState2)
            robot <- result.Robot
            grid <- GridStateTracker2 (Map.toSeq result.Grid)
