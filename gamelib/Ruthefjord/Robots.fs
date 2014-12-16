/// Implementation of the world grid, used by simulation to compute game state.
/// See Ast.fs
namespace Ruthefjord

open System
open System.Collections.Generic

type Block = int

type GridStateTracker(init: KeyValuePair<IntVec3, Block> seq) =

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
        let v = ref 0
        if cells.TryGetValue (idx, v) then Some !v else None

type BasicRobot = {
    Position: IntVec3;
    Direction: IntVec3;
}

type BasicWorldState = {
    Robot: BasicRobot;
    Grid: ImmArr<KeyValuePair<IntVec3,Block>>;
}

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
                    grid.AddObject p cube
                | "remove" -> grid.RemoveObject p
                | _ -> ()
            else ()

        member x.Query query =
            match query.Name with
            | "isblockatpos" -> upcast ((grid.GetObject robot.Position).IsSome)
            | _ -> upcast ()

        member x.CurrentState = upcast {Robot=robot; Grid=grid.CurrentState}

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
