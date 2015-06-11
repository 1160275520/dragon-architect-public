/// Implementation of the world grid, used by simulation to compute game state.
/// See Ast.fs
namespace Ruthefjord

open System
open System.Collections.Generic
open Ruthefjord.Ast.Imperative

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

module private DMath =
    // combine two rotations, represented as int vec 3
    let combineRotation2 (a:IntVec2) (b:IntVec2) =
        IntVec2 (a.X*b.X - a.Y*b.Y, a.X*b.Y + a.Y*b.X)
    // rotate the X and Z of b by the rotation given by a
    let combineRotation3 (a:IntVec2) (b:IntVec3) =
        IntVec3 (a.X*b.X - a.Y*b.Z, b.Y, a.X*b.Z + a.Y*b.X)

type CubeStatus =
| Add = 1
| Remove = 0

type CubeDelta = {
    Cube: int;
    Status: CubeStatus;
}

type BasicRobotDelta = {
    // vertical translation
    YTranslation: int;
    // how low the robot must travel for this delta to apply cleanly (since it can't go beneath Y=0)
    MinY: int;
    // translation on the X and Z axes, as a Vec2 (so GroundTranslation.Y is actually the Z translation)
    GroundTranslation: IntVec2;
    // rotation along Y axis (applied after translation), stored as a complex number
    Rotation: IntVec2;
} with
    static member Empty = {YTranslation=0; MinY=0; GroundTranslation=IntVec2.Zero; Rotation=IntVec2.UnitX}

    /// apply this delta to a 3d position (e.g., the offset for a cube delta)
    member d.ApplyToPos (p:IntVec3) =
        let p = DMath.combineRotation3 d.Rotation p
        IntVec3 (p.X + d.GroundTranslation.X, p.Y + d.YTranslation, p.Z + d.GroundTranslation.Y)

    member d.TryApplyDelta (robot:BasicRobot) =
        if robot.Position.Y + d.MinY < 0 then
            None
        else
            // extract the robot's rotation
            let rd = IntVec2 (robot.Direction.X, robot.Direction.Z)
            // chane the ground translation by the current robot rotation
            let ground = DMath.combineRotation2 rd d.GroundTranslation
            let offset = IntVec3 (ground.X, d.YTranslation, ground.Y)
            // combine rotations for the new rotation
            let newDir = DMath.combineRotation3 d.Rotation robot.Direction
            Some { Position = robot.Position + offset; Direction = newDir }

    static member Create (command:Robot.Command) =
        let e = BasicRobotDelta.Empty
        match command.Name with
        | "forward" -> {e with GroundTranslation = IntVec2 (1, 0)}
        | "up" -> {e with YTranslation = 1}
        | "down" -> {e with YTranslation = -1; MinY = -1}
        | "left" -> {e with Rotation = IntVec2 (0, 1)}
        | "right" -> {e with Rotation = IntVec2 (0, -1)}
        | _ -> e

    static member Combine (a:BasicRobotDelta) (b:BasicRobotDelta) =
        let r = DMath.combineRotation2 a.Rotation b.Rotation
        let g = a.GroundTranslation + (DMath.combineRotation2 a.Rotation b.GroundTranslation)
        let y = a.YTranslation + b.YTranslation
        let my = min a.MinY (b.MinY + a.YTranslation)
        {YTranslation=y; MinY=my; GroundTranslation=g; Rotation=r}

type BasicWorldStateDelta = {
    RobotDelta: BasicRobotDelta;
    GridDelta: (IntVec3*CubeDelta) array;
}
with
    member d.TryApplyDelta (robot:BasicRobot ref, grid:Dictionary<IntVec3,int>) : bool =
        let rob = !robot

        match d.RobotDelta.TryApplyDelta rob with
        | None -> false
        | Some bot ->
            let cubeRot = IntVec2 (rob.Direction.X, rob.Direction.Z)
            for offset, cubeDelta in d.GridDelta do
                let p = rob.Position + (DMath.combineRotation3 cubeRot offset)
                match cubeDelta.Status with
                | CubeStatus.Add -> if not (grid.ContainsKey p) then grid.Add (p, cubeDelta.Cube)
                | CubeStatus.Remove -> grid.Remove p |> ignore
                | _ -> invalidOp "unrecognized cube status"
            robot := bot
            true

    static member Empty = {RobotDelta=BasicRobotDelta.Empty; GridDelta=Array.empty}

    static member Create (command:Robot.Command) =
        match command.Name with
        | "cube" ->
            let cube = command.Args.[0] :?> int
            {RobotDelta=BasicRobotDelta.Empty; GridDelta=[|(IntVec3.Zero, {Status=CubeStatus.Add; Cube=cube})|]}
        | "remove" ->
            {RobotDelta=BasicRobotDelta.Empty; GridDelta=[|(IntVec3.Zero, {Status=CubeStatus.Remove; Cube=0})|]}
        | _ ->
            {RobotDelta=BasicRobotDelta.Create command; GridDelta=Array.empty}

    static member Combine (a:BasicWorldStateDelta) (b:BasicWorldStateDelta) =
        let cubes = Array.append a.GridDelta b.GridDelta
        for i = a.GridDelta.Length to cubes.Length - 1 do
            let delta, cubeDelta = cubes.[i]
            cubes.[i] <- a.RobotDelta.ApplyToPos delta, cubeDelta
        {RobotDelta=BasicRobotDelta.Combine a.RobotDelta b.RobotDelta; GridDelta=cubes}

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
            if delta.TryApplyDelta (bot, grid.RawCubes) then
                robot <- !bot
                true
            else
                false
