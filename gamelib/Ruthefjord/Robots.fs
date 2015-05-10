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

type GridStateTracker2(init: KeyValuePair<IntVec3, Cube2> seq) =

    let MAX_CUBES = 8000

    let mutable cells = Seq.fold (fun (m:Map<IntVec3, Cube2>) (kvp:KeyValuePair<IntVec3, Cube2>) -> m.Add (kvp.Key, kvp.Value)) Map.empty init

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
    Delta: BasicRobot;
}
with
    member x.ApplyTo(bot:BasicRobot) = {Position=bot.Position + x.Delta.Position; Direction=bot.Direction + x.Delta.Direction}
    static member GetDelta (a:BasicRobot) (b:BasicRobot) = {Delta={Position=b.Position - a.Position; Direction=b.Direction - a.Direction}}

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
    member x.ApplyTo(state:BasicWorldState2) = {Robot=x.RobotDelta.ApplyTo(state.Robot); Grid=MyMap.merge x.GridDelta state.Grid}

type BasicImperativeRobotSimulator(initialRobot, initialGrid) =
    let mutable robot = initialRobot
    let mutable grid : GridStateTracker = initialGrid

    let pos() = robot.Position
    let dir() = robot.Direction

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
            let gridStart = grid
            let gridDelta = GridStateTracker2.Empty()
            let exec (pretendY, low) (c:Robot.Command2) = 
                (x :> Robot.IRobotSimulator2).Execute c
                match c.Name with
                | "down" -> (pretendY - 1, min low (pretendY - 1))
                | "up" -> (pretendY + 1, low)
                | "cube" -> 
                    let cube = c.Args.[0] :?> int
                    gridDelta.AddObject robot.Position (cube, c)
                    (pretendY, low)
                | _ -> (pretendY, low)
            let low = snd (List.fold exec (robot.Position.Y, 0) commands)
            match low >= 0 with
            | false -> None
            | true -> 
                let delta = {RobotDelta=(BasicRobotDelta.GetDelta robotStart robot); GridDelta=gridDelta.CurrentState}
                robot <- robotStart
                grid <- gridStart
                Some(upcast delta)

type LazyProgramRunner (program, builtIns, initialGrid:GridStateTracker, initialRobot:BasicRobot) =

    let MAX_ITER = 20000

    let runner = BasicImperativeRobotSimulator (initialRobot, initialGrid)
    let simulator = Simulator.LazySimulator (program, builtIns, runner)
    let mutable numSteps = 0

    member x.InitialState = simulator.InitialState

    member x.IsDone = simulator.IsDone || numSteps >= MAX_ITER

    member x.UpdateOneStep (grid:GridStateTracker) =
        runner.Grid <- grid
        numSteps <- numSteps + 1
        simulator.StepUntilSomething ()
