/// Implementation of the world grid, used by simulation to compute game state.
/// See Ast.fs
namespace Ruthefjord

open System
open System.Collections.Generic
open Ruthefjord.Ast.Imperative

type Cube = int * Robot.CommandOLD
type Cube2 = int * Robot.Command
type CubeStatus =
| Add = 1
| Remove = 0
type CubeDelta = {
    Cube: Cube2;
    Status: CubeStatus;
}

module private Impl =
    let MAX_CUBES = 100000
    let kvp2pair (kvp:KeyValuePair<_,_>) = (kvp.Key, kvp.Value)
    let pair2kvp (a, b) = KeyValuePair (a, b)

type BasicRobot = {
    Position: IntVec3;
    Direction: IntVec3;
}
with
    member r.DirRightTurn = IntVec3(r.Direction.Z, 0, -r.Direction.X)

type WorldState<'Grid> = {
    Robot: BasicRobot;
    Grid: 'Grid;
}

// Representation of the world state that is intended for unit tests and equality comparisions,
// it's not very efficient and not what the robots use internally.
type CanonicalGrid = Map<IntVec3, int>
type CanonicalWorldState = WorldState<CanonicalGrid>
type DictGrid = Dictionary<IntVec3,int>

type IGrid<'Grid> =
    abstract AddObject : IntVec3 -> int -> unit
    abstract RemoveObject : IntVec3 -> unit
    abstract Current: 'Grid
    abstract SetFromCanonical : CanonicalGrid -> unit
    abstract Set: 'Grid -> unit
    // convert the given state (probably returned by this.Current) to canonical form
    abstract ConvertToCanonical : 'Grid -> CanonicalGrid

[<Sealed>]
type HashTableGrid() =
    let mutable cubes = Dictionary ()
    member x.RawCubes = cubes

    interface IGrid<DictGrid> with
        member x.AddObject idx cube = if cubes.Count < Impl.MAX_CUBES && not (cubes.ContainsKey idx) then cubes.Add (idx, cube)
        member x.RemoveObject idx = cubes.Remove idx |> ignore
        member x.Current = Dictionary cubes
        member x.SetFromCanonical grid = cubes <- Dictionary grid
        member x.Set grid = cubes <- Dictionary grid
        member x.ConvertToCanonical cubes = Seq.map Impl.kvp2pair cubes |> Map.ofSeq

[<Sealed>]
type TreeMapGrid() =
    let mutable cubes = Map.empty
    interface IGrid<CanonicalGrid> with
        member x.AddObject idx cube = if cubes.Count < Impl.MAX_CUBES && not (cubes.ContainsKey idx) then cubes <- cubes.Add (idx, cube)
        member x.RemoveObject idx = cubes <- cubes.Remove idx
        member x.Current = cubes
        member x.SetFromCanonical grid = cubes <- grid
        member x.Set grid = cubes <- grid
        member x.ConvertToCanonical cubes = cubes

type IGridWorldSimulator<'Grid, 'Delta> =
    inherit Robot.IRobotDeltaSimulator<WorldState<'Grid>, 'Delta>
    abstract AsCanonicalState : CanonicalWorldState

[<Sealed>]
type BasicRobotSimulator<'Grid> (grid: IGrid<'Grid>, startRobot:BasicRobot) =
    let mutable robot = startRobot
    let mutable numCommands = 0

    static member Colors = [| "#1ca84f"; "#a870b7"; "#ff1a6d"; "#00bcf4"; "#ffc911"; "#ff6e3d"; "#000000"; "#ffffff" |]

    member x.ConvertToCanonical (state:WorldState<'Grid>) = {Robot=state.Robot; Grid=grid.ConvertToCanonical state.Grid}

    member x.NumberOfCommandsExecuted = numCommands
    member x.AsCanonicalState = {Robot=robot; Grid=grid.ConvertToCanonical grid.Current}

    interface IGridWorldSimulator<'Grid, int> with
        member x.AsCanonicalState = x.AsCanonicalState

        member x.Execute command =
            numCommands <- numCommands + 1
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

        member x.Query query = raise (System.NotSupportedException ())

        member x.CurrentState = {Robot=robot; Grid=grid.Current}

        member x.EmptyDelta = 0
        member x.CreateDelta _ = 0
        member x.CombineDelta _ _  = 0
        member x.TryApplyDelta _ = false

type BasicRobotPositionDelta = {
    ParallelDelta: int;
    PerpenDelta: int;
    YDelta: int;
    MinY: int;
}
with
    static member ApplyDelta bot d =
        if bot.Position.Y + d.MinY < 0 then
            None
        else
            Some (bot.Position + d.ParallelDelta * bot.Direction + d.PerpenDelta * bot.DirRightTurn + IntVec3(0, d.YDelta, 0))

    static member Empty = {ParallelDelta=0; YDelta=0; PerpenDelta=0; MinY=0}

    static member Create (command:Robot.Command) =
        match command.Name with
        | "forward" -> {ParallelDelta=1; YDelta=0; PerpenDelta=0; MinY=0}
        | "up" -> {ParallelDelta=0; YDelta=1; PerpenDelta=0; MinY=0}
        | "down" -> {ParallelDelta=0; YDelta= -1; PerpenDelta=0; MinY= -1}
        | _ -> BasicRobotPositionDelta.Empty

    static member Combine (a:BasicRobotPositionDelta) (b:BasicRobotPositionDelta) tc =
        match tc % 4 with // tc = turn counter, +1 for every right turn, -1 for every left turn
        | (-3 | 1) -> {ParallelDelta=a.ParallelDelta - b.PerpenDelta; PerpenDelta=a.PerpenDelta + b.ParallelDelta; YDelta=a.YDelta + b.YDelta; MinY=min a.MinY (b.MinY + a.YDelta)}
        | (-2 | 2) -> {ParallelDelta=a.ParallelDelta - b.ParallelDelta; PerpenDelta=a.PerpenDelta - b.PerpenDelta; YDelta=a.YDelta + b.YDelta; MinY=min a.MinY (b.MinY + a.YDelta)}
        | (-1 | 3) -> {ParallelDelta=a.ParallelDelta + b.PerpenDelta; PerpenDelta=a.PerpenDelta - b.ParallelDelta; YDelta=a.YDelta + b.YDelta; MinY=min a.MinY (b.MinY + a.YDelta)}
        | _ -> {ParallelDelta=a.ParallelDelta + b.ParallelDelta; PerpenDelta=a.PerpenDelta + b.PerpenDelta; YDelta=a.YDelta + b.YDelta; MinY=min a.MinY (b.MinY + a.YDelta)}


type BasicRobotDelta = {
    PosDelta:BasicRobotPositionDelta
    TurnCounter: int; // -1 for each left turn, +1 for each right turn
}
with
    member x.ParallelDelta = x.PosDelta.ParallelDelta
    member x.PerpenDelta = x.PosDelta.PerpenDelta
    member x.YDelta = x.PosDelta.YDelta
    // to apply PosDelta, we move the X in the current direction and move Z in the current direction turned ot the right
    static member ApplyDelta bot d =
        match BasicRobotPositionDelta.ApplyDelta bot d.PosDelta with
        | None -> None
        | Some delta -> Some ({Position=delta; Direction=BasicRobotDelta.GetNewDir bot.Direction d.TurnCounter})

    static member GetNewDir (dir:IntVec3) tc =
        match tc % 4 with
        | (-3 | 1) -> (new IntVec3(dir.Z, 0, -dir.X))
        | (-2 | 2) -> (new IntVec3(-dir.X, 0, -dir.Z))
        | (-1 | 3) -> (new IntVec3(-dir.Z, 0, dir.X))
        | _ -> dir

    static member Empty = {PosDelta={ParallelDelta=0; PerpenDelta=0; YDelta=0; MinY=0}; TurnCounter=0}

    static member Create (command:Robot.Command) =
        match command.Name with
        | "left" -> {PosDelta=BasicRobotPositionDelta.Create command; TurnCounter= -1}
        | "right" -> {PosDelta=BasicRobotPositionDelta.Create command; TurnCounter= 1}
        | _ -> {PosDelta=BasicRobotPositionDelta.Create command; TurnCounter= 0}

    static member Combine (a:BasicRobotDelta) (b:BasicRobotDelta) =
        {PosDelta=BasicRobotPositionDelta.Combine a.PosDelta b.PosDelta a.TurnCounter; TurnCounter=a.TurnCounter + b.TurnCounter}



type BasicWorldState = {
    Robot: BasicRobot;
    Grid: ImmArr<KeyValuePair<IntVec3,Cube>>;
} with
    static member FromCanonical (s:CanonicalWorldState) : BasicWorldState =
        {
            Robot=s.Robot;
            Grid=s.Grid |> Seq.map (fun kvp -> KeyValuePair (kvp.Key, (kvp.Value, null))) |> ImmArr.ofSeq
        }

    member s.AsCanonical : CanonicalWorldState =
        {
            Robot=s.Robot;
            Grid=s.Grid |> Seq.map (fun kvp -> (kvp.Key, fst kvp.Value)) |> Map.ofSeq
        }

type BasicWorldStateDelta = {
    RobotDelta:BasicRobotDelta;
    GridDelta:Map<BasicRobotPositionDelta,CubeDelta>;
}
with

    static member TryApplyDelta (robot:BasicRobot ref, grid:Dictionary<IntVec3,int>) (d:BasicWorldStateDelta) : bool =
        let newCubes = System.Collections.Generic.List (d.GridDelta.Count)
        let rob = !robot

        let isValid = ref true
        d.GridDelta |> Map.iter (fun delta cubeDelta ->
            match BasicRobotPositionDelta.ApplyDelta rob delta with
            | None -> isValid := false
            | Some p -> newCubes.Add (p, cubeDelta)
        )
        if !isValid then
            match BasicRobotDelta.ApplyDelta rob d.RobotDelta with
            | None -> false
            | Some bot ->
                for p, c in newCubes do
                    match c.Status with
                    | CubeStatus.Add -> if not (grid.ContainsKey p) then grid.Add (p, fst c.Cube)
                    | CubeStatus.Remove -> grid.Remove p |> ignore
                    | _ -> invalidOp "unrecognized cube status"

                robot := bot
                true
        else
            false

    static member Empty = {RobotDelta=BasicRobotDelta.Empty; GridDelta=Map.empty}

    static member Create (command:Robot.Command) =
        match command.Name with
        | "cube" ->
            let cube = command.Args.[0] :?> int
            {RobotDelta=BasicRobotDelta.Create command; GridDelta=(Map.empty).Add (BasicRobotPositionDelta.Create command, {Status=CubeStatus.Add; Cube=(cube, command)})}
        | "remove" ->
            let cube = command.Args.[0] :?> int
            {RobotDelta=BasicRobotDelta.Create command; GridDelta=(Map.empty).Add (BasicRobotPositionDelta.Create command, {Status=CubeStatus.Remove; Cube=(cube, command)})}
        | _ -> {RobotDelta=BasicRobotDelta.Create command; GridDelta=Map.empty}

    static member Create (commands:Robot.Command list) =
        let f = fun delta (c:Robot.Command) -> BasicWorldStateDelta.Combine delta (BasicWorldStateDelta.Create c)
        List.fold f BasicWorldStateDelta.Empty commands

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

[<Sealed>]
type DeltaRobotSimulator (startGrid: CanonicalGrid, startRobot:BasicRobot) =
    let mutable robot = startRobot
    let mutable numCommands = 0
    let grid = HashTableGrid ()
    do (grid:>IGrid<_>).SetFromCanonical startGrid

    static member Colors = [| "#1ca84f"; "#a870b7"; "#ff1a6d"; "#00bcf4"; "#ffc911"; "#ff6e3d"; "#000000"; "#ffffff" |]


    member x.NumberOfCommandsExecuted = numCommands

    interface IGridWorldSimulator<DictGrid, BasicWorldStateDelta> with
        member x.AsCanonicalState : CanonicalWorldState = {Robot=robot; Grid=(grid:>IGrid<_>).ConvertToCanonical (grid:>IGrid<_>).Current}

        member x.Execute command =
            numCommands <- numCommands + 1
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
                (grid:>IGrid<_>).AddObject p cube
            | "remove" -> (grid:>IGrid<_>).RemoveObject p
            | _ -> ()

        member x.Query query = raise (System.NotSupportedException ())

        member x.CurrentState = {Robot=robot; Grid=(grid:>IGrid<_>).Current}

        member x.EmptyDelta = BasicWorldStateDelta.Empty
        member x.CreateDelta command = BasicWorldStateDelta.Create command
        member x.CombineDelta a b = BasicWorldStateDelta.Combine a b
        member x.TryApplyDelta delta =
            let bot = ref robot
            if BasicWorldStateDelta.TryApplyDelta (bot, grid.RawCubes) delta then
                robot <- !bot
                true
            else
                false


// NEW DELTA ATTEMPT
////////////////////////////////////////////////////////////////////////////////////////////////////

type BasicRobotPositionDelta2 = {
    ParallelDelta: int;
    PerpenDelta: int;
    YDelta: int;
    MinY: int;
}
with
    static member ApplyDeltaNoCheck bot d =
        bot.Position + d.ParallelDelta * bot.Direction + d.PerpenDelta * bot.DirRightTurn + IntVec3(0, d.YDelta, 0)

    static member ApplyDelta bot d =
        if bot.Position.Y + d.MinY < 0 then
            None
        else
            Some (bot.Position + d.ParallelDelta * bot.Direction + d.PerpenDelta * bot.DirRightTurn + IntVec3(0, d.YDelta, 0))

    static member Empty = {ParallelDelta=0; YDelta=0; PerpenDelta=0; MinY=0}

    static member Create (command:Robot.Command) =
        match command.Name with
        | "forward" -> {ParallelDelta=1; YDelta=0; PerpenDelta=0; MinY=0}
        | "up" -> {ParallelDelta=0; YDelta=1; PerpenDelta=0; MinY=0}
        | "down" -> {ParallelDelta=0; YDelta= -1; PerpenDelta=0; MinY= -1}
        | _ -> BasicRobotPositionDelta2.Empty

    static member Combine (a:BasicRobotPositionDelta2) (b:BasicRobotPositionDelta2) tc =
        match tc % 4 with // tc = turn counter, +1 for every right turn, -1 for every left turn
        | (-3 | 1) -> {ParallelDelta=a.ParallelDelta - b.PerpenDelta; PerpenDelta=a.PerpenDelta + b.ParallelDelta; YDelta=a.YDelta + b.YDelta; MinY=min a.MinY (b.MinY + a.YDelta)}
        | (-2 | 2) -> {ParallelDelta=a.ParallelDelta - b.ParallelDelta; PerpenDelta=a.PerpenDelta - b.PerpenDelta; YDelta=a.YDelta + b.YDelta; MinY=min a.MinY (b.MinY + a.YDelta)}
        | (-1 | 3) -> {ParallelDelta=a.ParallelDelta + b.PerpenDelta; PerpenDelta=a.PerpenDelta - b.ParallelDelta; YDelta=a.YDelta + b.YDelta; MinY=min a.MinY (b.MinY + a.YDelta)}
        | _ -> {ParallelDelta=a.ParallelDelta + b.ParallelDelta; PerpenDelta=a.PerpenDelta + b.PerpenDelta; YDelta=a.YDelta + b.YDelta; MinY=min a.MinY (b.MinY + a.YDelta)}


type BasicRobotDelta2 = {
    PosDelta:BasicRobotPositionDelta2;
    TurnCounter: int; // -1 for each left turn, +1 for each right turn
}
with
    member x.ParallelDelta = x.PosDelta.ParallelDelta
    member x.PerpenDelta = x.PosDelta.PerpenDelta
    member x.YDelta = x.PosDelta.YDelta
    // to apply PosDelta, we move the X in the current direction and move Z in the current direction turned ot the right
    static member ApplyDelta bot d =
        match BasicRobotPositionDelta2.ApplyDelta bot d.PosDelta with
        | None -> None
        | Some delta -> Some ({Position=delta; Direction=BasicRobotDelta.GetNewDir bot.Direction d.TurnCounter})

    static member GetNewDir (dir:IntVec3) tc =
        match tc % 4 with
        | (-3 | 1) -> (new IntVec3(dir.Z, 0, -dir.X))
        | (-2 | 2) -> (new IntVec3(-dir.X, 0, -dir.Z))
        | (-1 | 3) -> (new IntVec3(-dir.Z, 0, dir.X))
        | _ -> dir

    static member Empty = {PosDelta={ParallelDelta=0; PerpenDelta=0; YDelta=0; MinY=0}; TurnCounter=0}

    static member Create (command:Robot.Command) =
        match command.Name with
        | "left" -> {PosDelta=BasicRobotPositionDelta2.Empty; TurnCounter= -1}
        | "right" -> {PosDelta=BasicRobotPositionDelta2.Empty; TurnCounter= 1}
        | _ -> {PosDelta=BasicRobotPositionDelta2.Create command; TurnCounter= 0}

    static member Combine (a:BasicRobotDelta2) (b:BasicRobotDelta2) =
        {PosDelta=BasicRobotPositionDelta2.Combine a.PosDelta b.PosDelta a.TurnCounter; TurnCounter=a.TurnCounter + b.TurnCounter}

type BasicWorldStateDelta2 = {
    RobotDelta: BasicRobotDelta2;
    GridDelta: (BasicRobotPositionDelta2*CubeDelta) array;
}
with

    static member TryApplyDelta (robot:BasicRobot ref, grid:Dictionary<IntVec3,int>) (d:BasicWorldStateDelta2) : bool =
        let rob = !robot

        match BasicRobotDelta2.ApplyDelta rob d.RobotDelta with
        | None -> false
        | Some bot ->
            robot := bot
            for delta, cubeDelta in d.GridDelta do
                let p = BasicRobotPositionDelta2.ApplyDeltaNoCheck rob delta
                match cubeDelta.Status with
                | CubeStatus.Add -> if not (grid.ContainsKey p) then grid.Add (p, fst cubeDelta.Cube)
                | CubeStatus.Remove -> grid.Remove p |> ignore
                | _ -> invalidOp "unrecognized cube status"
            true

    static member Empty = {RobotDelta=BasicRobotDelta2.Empty; GridDelta=Array.empty}

    static member Create (command:Robot.Command) =
        match command.Name with
        | "cube" ->
            let cube = command.Args.[0] :?> int
            {RobotDelta=BasicRobotDelta2.Empty; GridDelta=[|(BasicRobotPositionDelta2.Create command, {Status=CubeStatus.Add; Cube=(cube, command)})|]}
        | "remove" ->
            let cube = command.Args.[0] :?> int
            {RobotDelta=BasicRobotDelta2.Empty; GridDelta=[|(BasicRobotPositionDelta2.Create command, {Status=CubeStatus.Remove; Cube=(cube, command)})|]}
        | _ -> {RobotDelta=BasicRobotDelta2.Create command; GridDelta=Array.empty}

    static member Create (commands:Robot.Command list) =
        let f = fun delta (c:Robot.Command) -> BasicWorldStateDelta.Combine delta (BasicWorldStateDelta.Create c)
        List.fold f BasicWorldStateDelta.Empty commands

    static member Combine (a:BasicWorldStateDelta2) (b:BasicWorldStateDelta2) =
        let cubes =
            b.GridDelta |> Array.map (fun (delta, cubeDelta) ->
                (BasicRobotPositionDelta2.Combine a.RobotDelta.PosDelta delta a.RobotDelta.TurnCounter), cubeDelta
            )
        let grid = Array.append a.GridDelta cubes
        {RobotDelta=BasicRobotDelta2.Combine a.RobotDelta b.RobotDelta; GridDelta=grid}

[<Sealed>]
type DeltaRobotSimulator2 (startGrid: CanonicalGrid, startRobot:BasicRobot) =
    let mutable robot = startRobot
    let mutable numCommands = 0
    let grid = HashTableGrid ()
    do (grid:>IGrid<_>).SetFromCanonical startGrid

    static member Colors = [| "#1ca84f"; "#a870b7"; "#ff1a6d"; "#00bcf4"; "#ffc911"; "#ff6e3d"; "#000000"; "#ffffff" |]


    member x.NumberOfCommandsExecuted = numCommands

    interface IGridWorldSimulator<DictGrid, BasicWorldStateDelta2> with
        member x.AsCanonicalState : CanonicalWorldState = {Robot=robot; Grid=(grid:>IGrid<_>).ConvertToCanonical (grid:>IGrid<_>).Current}

        member x.Execute command =
            numCommands <- numCommands + 1
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
                (grid:>IGrid<_>).AddObject p cube
            | "remove" -> (grid:>IGrid<_>).RemoveObject p
            | _ -> ()

        member x.Query query = raise (System.NotSupportedException ())

        member x.CurrentState = {Robot=robot; Grid=(grid:>IGrid<_>).Current}

        member x.EmptyDelta = BasicWorldStateDelta2.Empty
        member x.CreateDelta command = BasicWorldStateDelta2.Create command
        member x.CombineDelta a b = BasicWorldStateDelta2.Combine a b
        member x.TryApplyDelta delta =
            let bot = ref robot
            if BasicWorldStateDelta2.TryApplyDelta (bot, grid.RawCubes) delta then
                robot <- !bot
                true
            else
                false
