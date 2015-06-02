/// Implementation of the world grid, used by simulation to compute game state.
/// See Ast.fs
namespace Ruthefjord

open System
open System.Collections.Generic
open Ruthefjord.Ast.Imperative

type Cube = int * Robot.Command
type Cube2 = int * Robot.Command2
type CubeStatus =
| Add = 1
| Remove = 0
type CubeDelta = {
    Cube: Cube2;
    Status: CubeStatus;
} 

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

type GridStateTracker2(init: Map<IntVec3, Cube2>) =

    let MAX_CUBES = 8000

    let mutable cells = init

    static member Empty () = GridStateTracker2 []

    new (init: (IntVec3 * Cube2) seq) = GridStateTracker2 (Map.ofSeq init)

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
    MinY: int;
}
with
    static member ApplyDelta bot d = bot.Position + d.ParallelDelta * bot.Direction + d.PerpenDelta * bot.DirRightTurn + IntVec3(0, d.YDelta, 0)

    static member Empty = {ParallelDelta=0; YDelta=0; PerpenDelta=0; MinY=0}

//    static member Create (a:BasicRobot) (b:BasicRobot) miny =
//        let posDelta = b.Position - a.Position
//        {ParallelDelta=a.Direction.X * (posDelta).X + a.Direction.Z * (posDelta).Z;
//         YDelta=(b.Position - a.Position).Y;
//         PerpenDelta=a.DirRightTurn.X * (posDelta).X + a.DirRightTurn.Z * (posDelta).Z;
//         MinY=miny}
    
    static member Create (command:Robot.Command2) = 
        match command.Name with
        | "forward" -> {ParallelDelta=1; YDelta=0; PerpenDelta=0; MinY=0}
        | "up" -> {ParallelDelta=0; YDelta=1; PerpenDelta=0; MinY=0}
        | "down" -> {ParallelDelta=0; YDelta= -1; PerpenDelta=0; MinY= -1}
        | _ -> BasicRobotPositionDelta.Empty
    
    static member Combine (a:BasicRobotPositionDelta) (b:BasicRobotPositionDelta) tc =
        match tc % 4 with // tc = turn counter, +1 for every right turn, -1 for every left turn
        | (-3 | 1) -> {ParallelDelta=a.ParallelDelta + b.PerpenDelta; PerpenDelta=a.PerpenDelta + b.ParallelDelta; YDelta=a.YDelta + b.YDelta; MinY=min a.MinY b.MinY + a.YDelta}
        | (-2 | 2) -> {ParallelDelta=a.ParallelDelta - b.ParallelDelta; PerpenDelta=a.PerpenDelta - b.PerpenDelta; YDelta=a.YDelta + b.YDelta; MinY=min a.MinY b.MinY + a.YDelta}
        | (-1 | 3) -> {ParallelDelta=a.ParallelDelta - b.PerpenDelta; PerpenDelta=a.PerpenDelta - b.ParallelDelta; YDelta=a.YDelta + b.YDelta; MinY=min a.MinY b.MinY + a.YDelta}
        | _ -> {ParallelDelta=a.ParallelDelta + b.ParallelDelta; PerpenDelta=a.PerpenDelta + b.PerpenDelta; YDelta=a.YDelta + b.YDelta; MinY=min a.MinY b.MinY + a.YDelta}


type BasicRobotDelta = {
    PosDelta:BasicRobotPositionDelta
    TurnCounter: int; // -1 for each left turn, +1 for each right turn
}
with
    member x.ParallelDelta = x.PosDelta.ParallelDelta
    member x.PerpenDelta = x.PosDelta.PerpenDelta
    member x.YDelta = x.PosDelta.YDelta
    // to apply PosDelta, we move the X in the current direction and move Z in the current direction turned ot the right
    static member ApplyDelta bot d = {Position=BasicRobotPositionDelta.ApplyDelta bot d.PosDelta;
                            Direction=BasicRobotDelta.GetNewDir bot.Direction d.TurnCounter}
    
    static member private GetNewDir (dir:IntVec3) tc =
        match tc % 4 with
        | (-3 | 1) -> (new IntVec3(dir.Z, 0, -dir.X))
        | (-2 | 2) -> (new IntVec3(-dir.X, 0, -dir.Z))
        | (-1 | 3) -> (new IntVec3(-dir.Z, 0, dir.X))
        | _ -> dir
    
    static member Empty = {PosDelta={ParallelDelta=0; PerpenDelta=0; YDelta=0; MinY=0}; TurnCounter=0}

    static member Create (command:Robot.Command2) = 
        match command.Name with
        | "left" -> {PosDelta=BasicRobotPositionDelta.Create command; TurnCounter= -1}
        | "right" -> {PosDelta=BasicRobotPositionDelta.Create command; TurnCounter= 1}
        | _ -> {PosDelta=BasicRobotPositionDelta.Create command; TurnCounter= 0}
    
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
with
    static member ApplyCommand (state:BasicWorldState2) (command:Robot.Command2) = 
        let p = state.Robot.Position
        let d = state.Robot.Direction
        match command.Name with
        | "forward" -> {state with Robot={state.Robot with Position=p + d}}
        | "up" -> {state with Robot={state.Robot with Position=p + IntVec3.UnitY}}
        | "down" -> 
            if p.Y > 0 then 
                {state with Robot={state.Robot with Position=p - IntVec3.UnitY}}
            else
                state
        | "left" -> {state with Robot={state.Robot with Direction=IntVec3 (-d.Z, 0, d.X)}}
        | "right" -> {state with Robot={state.Robot with Direction=IntVec3 (d.Z, 0, -d.X)}}
        | "cube" ->
            let cube = command.Args.[0] :?> int
            {state with Grid=state.Grid.Add (state.Robot.Position, (cube, command))}
        | "remove" -> {state with Grid=state.Grid.Remove state.Robot.Position}
        | _ -> invalidOp "unrecognized command"

type BasicWorldStateDelta = {
    RobotDelta:BasicRobotDelta;
    GridDelta:Map<BasicRobotPositionDelta,CubeDelta>;
}
with
    static member ApplyDelta (state:BasicWorldState2) d =
        let newGrid = Map.fold (fun (grid:Map<IntVec3, Cube2>) (delta:BasicRobotPositionDelta) (cubeDelta:CubeDelta) ->
                                    match cubeDelta.Status with
                                    | CubeStatus.Add -> grid.Add ((BasicRobotPositionDelta.ApplyDelta state.Robot delta), cubeDelta.Cube)
                                    | CubeStatus.Remove -> grid.Remove (BasicRobotPositionDelta.ApplyDelta state.Robot delta)
                                    | _ -> invalidOp "unrecognized cube status"
                                )
                                state.Grid d.GridDelta
        {Robot=BasicRobotDelta.ApplyDelta state.Robot d.RobotDelta; Grid=newGrid}

    static member Empty = {RobotDelta=BasicRobotDelta.Empty; GridDelta=Map.empty}

    static member Create (command:Robot.Command2) =
        match command.Name with
        | "cube" -> 
            let cube = command.Args.[0] :?> int
            {RobotDelta=BasicRobotDelta.Create command; GridDelta=(Map.empty).Add (BasicRobotPositionDelta.Create command, {Status=CubeStatus.Add; Cube=(cube, command)})}
        | "remove" -> 
            let cube = command.Args.[0] :?> int
            {RobotDelta=BasicRobotDelta.Create command; GridDelta=(Map.empty).Add (BasicRobotPositionDelta.Create command, {Status=CubeStatus.Remove; Cube=(cube, command)})}
        | _ -> {RobotDelta=BasicRobotDelta.Create command; GridDelta=Map.empty}

    static member Combine a b =
        let gridB = Map.fold (fun (grid:Map<BasicRobotPositionDelta, CubeDelta>) (delta:BasicRobotPositionDelta) (cubeDelta:CubeDelta) ->
            grid.Add ((BasicRobotPositionDelta.Combine a.RobotDelta.PosDelta delta a.RobotDelta.TurnCounter), cubeDelta)) Map.empty b.GridDelta
        {RobotDelta=BasicRobotDelta.Combine a.RobotDelta b.RobotDelta; GridDelta=BasicWorldStateDelta.MergeGridDelta a.GridDelta gridB}

    static member private MergeGridDelta a b =
        Map.fold (fun delta pd cd -> 
                    match cd.Status with
                    | CubeStatus.Add -> 
                        if delta.ContainsKey pd then
                            delta
                        else
                            delta.Add (pd, cd)
                    | CubeStatus.Remove ->
                        delta.Remove pd
                    | _ -> invalidOp "unrecognized cube status") a b

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

    static member FromWorldState (ws:BasicWorldState2) =
        BasicImperativeRobotSimulator2 (ws.Robot, GridStateTracker2 ws.Grid)

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

        member x.ApplyDelta delta =
            let result = BasicWorldStateDelta.ApplyDelta ((x :> Robot.IRobotSimulator2).CurrentState :?> BasicWorldState2) (delta :?> BasicWorldStateDelta)
            robot <- result.Robot
            grid <- GridStateTracker2 (Map.toSeq result.Grid)
