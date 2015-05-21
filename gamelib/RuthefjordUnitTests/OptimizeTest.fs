﻿module Ruthefjord.UnitTest.OptimizeTest

open Xunit
open Xunit.Extensions
open FsUnit.Xunit
open System.IO
open Ruthefjord
open Ruthefjord.Robot

[<Fact>]
[<Trait("tag", "opt")>]
let ``command sanity check`` () =
    let c1: Robot.Command2 = {Name="foo"; Args=["bar" :> obj]}
    let c2: Robot.Command2 = {Name="foo"; Args=["bar" :> obj]}

    c1 |> should equal c2

[<Fact>]
[<Trait("tag", "opt")>]
let ``command sanity check 2`` () =
    let filename = "../../../../doc/castle_decomp.txt"
    let stdlibPath = "../../../../unity/Assets/Resources/module/stdlib.txt"
    let importedModules = Simulator.import (Parser.Parse (System.IO.File.ReadAllText stdlibPath, "stdlib"))
    let text = System.IO.File.ReadAllText filename
    let program = Parser.Parse (text, filename)

    let r1 = Simulator.SimulateWithoutRobot program importedModules
    let r2 = Simulator.SimulateWithoutRobot program importedModules

    r1 |> should equal r2

[<Fact>]
[<Trait("tag", "opt")>]
let ``optimize correctness`` () =
    let filename = "../../../../doc/castle_decomp.txt"
    let stdlibPath = "../../../../unity/Assets/Resources/module/stdlib.txt"
    let importedModules = Simulator.import (Parser.Parse (System.IO.File.ReadAllText stdlibPath, "stdlib"))
    let text = System.IO.File.ReadAllText filename
    let program = Parser.Parse (text, filename)

    let r1 = List.ofArray <| Simulator.SimulateWithoutRobotOptimized program importedModules
    let r2 = List.ofArray <| Simulator.SimulateWithoutRobot program importedModules

    //let r1 = r1 |> Seq.skip 40 |> Seq.take 3 |> List.ofSeq
    //let r2 = r2 |> Seq.skip 40 |> Seq.take 3 |> List.ofSeq

    r1 |> should equal r2

[<Fact>]
[<Trait("id", "gridasmap")>]
[<Trait("tag", "opt")>]
let ``grid as map correctness`` () =
    let filename = "../../../../doc/castle_decomp.txt"
    let stdlibPath = "../../../../unity/Assets/Resources/module/stdlib.txt"
    let importedModules = Simulator.import (Parser.Parse (System.IO.File.ReadAllText stdlibPath, "stdlib"))
    let text = System.IO.File.ReadAllText filename
    let program = Parser.Parse (text, filename)
    let grid = GridStateTracker Seq.empty
    let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
    let runner = BasicImperativeRobotSimulator (robot, grid)
    let grid2 = GridStateTracker2 Seq.empty
    let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)

    let r1 = Simulator.SimulateWithRobot program importedModules runner
    let r2 = Simulator.SimulateWithRobot2 program importedModules runner2

    r1.States.Length |> should equal (r2.States.Length + 1) // runner 2 doesn't include the initial state
    let final1 = r1.States.[r1.States.Length - 1]
    let final2 = r2.States.[r2.States.Length - 1]
    let state1 = final1.Data.WorldState :?> BasicWorldState
    let state2 = final2.Data.WorldState :?> BasicWorldState2
    state1.Robot |> should equal state2.Robot
    let grid1 = state1.Grid |> ImmArr.toArray |> (Array.map (fun kvp -> kvp.Key)) |> Array.sort
    let grid2 = state2.Grid |> Map.toArray |> (Array.map (fun kv -> fst kv)) |> Array.sort
    grid1.Length |> should equal grid2.Length
    grid1 |> should equal grid2


[<Fact>]
[<Trait("id", "delta-pos")>]
[<Trait("tag", "opt")>]
let ``delta position`` () =
    let initDir = IntVec3.UnitZ
    let initPos = IntVec3.Zero
    let robot:BasicRobot = {Position=initPos; Direction=initDir}
    let grid2 = GridStateTracker2 Seq.empty
    let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
    let commands:Command2 list = [
        {Name="forward"; Args=[]}
        {Name="forward"; Args=[]}
        {Name="forward"; Args=[]}
        {Name="forward"; Args=[]}
        ]
    let deltaOption = (runner2 :> IRobotSimulator2).GetDelta commands
    runner2.Robot.Direction |> should equal initDir
    runner2.Robot.Position |> should equal initPos 
    runner2.Grid.CurrentState |> should equal (GridStateTracker2 Seq.empty).CurrentState
    deltaOption.IsSome |> should equal true
    let delta = deltaOption.Value :?> BasicWorldStateDelta
    delta.RobotDelta.TurnCounter |> should equal 0
    delta.RobotDelta.GetNewDir initDir |> should equal initDir
    delta.RobotDelta.PosDelta |> should equal (new IntVec3(0, 0, 4))
    delta.GridDelta.IsEmpty |> should equal true

[<Fact>]
[<Trait("id", "delta-dir")>]
[<Trait("tag", "opt")>]
let ``delta direction`` () =
    let initDir = IntVec3.UnitZ
    let initPos = IntVec3.Zero
    let robot:BasicRobot = {Position=initPos; Direction=initDir}
    let grid2 = GridStateTracker2 Seq.empty
    let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
    let commands:Command2 list = [
        {Name="forward"; Args=[]}
        {Name="left"; Args=[]}
        {Name="forward"; Args=[]}
        {Name="left"; Args=[]}
        {Name="right"; Args=[]}
        {Name="left"; Args=[]}
        {Name="left"; Args=[]}
        {Name="right"; Args=[]}
        ]
    let deltaOption = (runner2 :> IRobotSimulator2).GetDelta commands
    runner2.Robot.Direction |> should equal initDir
    runner2.Robot.Position |> should equal initPos
    runner2.Grid.CurrentState |> should equal (GridStateTracker2 Seq.empty).CurrentState
    deltaOption.IsSome |> should equal true
    let delta = deltaOption.Value :?> BasicWorldStateDelta
    delta.RobotDelta.TurnCounter |> should equal -2
    delta.RobotDelta.GetNewDir initDir |> should equal -initDir
    delta.RobotDelta.PosDelta |> should equal (new IntVec3(-1, 0, 1))
    delta.GridDelta.IsEmpty |> should equal true

[<Fact>]
[<Trait("id", "delta-cube")>]
[<Trait("tag", "opt")>]
let ``delta cube`` () =
    let initDir = IntVec3.UnitZ
    let initPos = IntVec3.Zero
    let robot:BasicRobot = {Position=initPos; Direction=initDir}
    let grid2 = GridStateTracker2 Seq.empty
    let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
    let commands:Command2 list = [
        {Name="forward"; Args=[]}
        {Name="cube"; Args=[1]}
        {Name="right"; Args=[]}
        {Name="forward"; Args=[]}
        {Name="cube"; Args=[1]}
        ]
    let deltaOption = (runner2 :> IRobotSimulator2).GetDelta commands
    runner2.Robot.Direction |> should equal initDir
    runner2.Robot.Position |> should equal initPos
    runner2.Grid.CurrentState |> should equal (GridStateTracker2 Seq.empty).CurrentState
    deltaOption.IsSome |> should equal true
    let delta = deltaOption.Value :?> BasicWorldStateDelta
    delta.RobotDelta.TurnCounter |> should equal 1
    delta.RobotDelta.GetNewDir initDir |> should equal (new IntVec3(initDir.Z, 0, -initDir.X))
    delta.RobotDelta.PosDelta |> should equal (new IntVec3(1, 0, 1))
    (Map.toArray delta.GridDelta).Length |> should equal 2
    delta.GridDelta.ContainsKey((new IntVec3(0, 0, 1))) |> should equal true
    delta.GridDelta.ContainsKey((new IntVec3(1, 0, 1))) |> should equal true

[<Fact>]
[<Trait("id", "delta-vert-some")>]
[<Trait("tag", "opt")>]
let ``delta vertical some`` () =
    let initDir = IntVec3.UnitZ
    let initPos = IntVec3.Zero
    let robot:BasicRobot = {Position=initPos; Direction=initDir}
    let grid2 = GridStateTracker2 Seq.empty
    let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
    let commands:Command2 list = [
        {Name="up"; Args=[]}
        {Name="down"; Args=[]}
        {Name="up"; Args=[]}
        {Name="up"; Args=[]}
        {Name="down"; Args=[]}
        ]
    let deltaOption = (runner2 :> IRobotSimulator2).GetDelta commands
    deltaOption.IsSome |> should equal true
    let delta = deltaOption.Value :?> BasicWorldStateDelta
    delta.RobotDelta.TurnCounter |> should equal 0
    delta.RobotDelta.GetNewDir initDir |> should equal initDir
    delta.RobotDelta.PosDelta |> should equal (new IntVec3(0, 1, 0))

[<Fact>]
[<Trait("id", "delta-vert-some2")>]
[<Trait("tag", "opt")>]
let ``delta vertical some 2`` () =
    let initDir = IntVec3.UnitZ
    let initPos = new IntVec3(0, 5, 0)
    let robot:BasicRobot = {Position=initPos; Direction=initDir}
    let grid2 = GridStateTracker2 Seq.empty
    let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
    let commands:Command2 list = [
        {Name="down"; Args=[]}
        {Name="down"; Args=[]}
        {Name="down"; Args=[]}
        {Name="down"; Args=[]}
        {Name="down"; Args=[]}
        ]
    let deltaOption = (runner2 :> IRobotSimulator2).GetDelta commands
    deltaOption.IsSome |> should equal true
    let delta = deltaOption.Value :?> BasicWorldStateDelta
    delta.RobotDelta.TurnCounter |> should equal 0
    delta.RobotDelta.GetNewDir initDir |> should equal initDir
    delta.RobotDelta.PosDelta |> should equal (new IntVec3(0, -5, 0))

[<Fact>]
[<Trait("id", "delta-vert-none")>]
[<Trait("tag", "opt")>]
let ``delta vertical none`` () =
    let initDir = IntVec3.UnitZ
    let initPos = IntVec3.Zero
    let robot:BasicRobot = {Position=initPos; Direction=initDir}
    let grid2 = GridStateTracker2 Seq.empty
    let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
    let commands:Command2 list = [
        {Name="up"; Args=[]}
        {Name="down"; Args=[]}
        {Name="up"; Args=[]}
        {Name="down"; Args=[]}
        {Name="down"; Args=[]}
        ]
    let deltaOption = (runner2 :> IRobotSimulator2).GetDelta commands
    deltaOption.IsSome |> should equal false

[<Fact>]
[<Trait("id", "delta-apply")>]
[<Trait("tag", "opt")>]
let ``delta apply`` () =
    let initDir = IntVec3.UnitX
    let initPos = new IntVec3(1,1,1)
    let robot:BasicRobot = {Position=initPos; Direction=initDir}
    let gridInit:(IntVec3 * Cube2) list = [
        ((new IntVec3(2,2,1)), (1, {Name="cube"; Args=[1]}))
        ((new IntVec3(0,0,0)), (1, {Name="cube"; Args=[1]}))
    ]
    let grid2 = GridStateTracker2 gridInit
    let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
    let commands:Command2 list = [
        {Name="up"; Args=[]}
        {Name="forward"; Args=[]}
        {Name="cube"; Args=[1]}
        {Name="right"; Args=[]}
        {Name="forward"; Args=[]}
        {Name="cube"; Args=[1]}
        ]
    let deltaOption = (runner2 :> IRobotSimulator2).GetDelta commands
    deltaOption.IsSome |> should equal true
    let delta = deltaOption.Value :?> BasicWorldStateDelta
    let startState = {Robot={Position=initPos; Direction=initDir}; Grid=(GridStateTracker2 gridInit).CurrentState}:BasicWorldState2
    let endState = delta.ApplyTo(startState)
    endState.Robot.Position |> should equal (new IntVec3(2,2,0))
    endState.Robot.Direction |> should equal -IntVec3.UnitZ
    (Map.toArray endState.Grid).Length |> should equal 3
    endState.Grid.ContainsKey((new IntVec3(0, 0, 0))) |> should equal true
    endState.Grid.ContainsKey((new IntVec3(2, 2, 1))) |> should equal true
    endState.Grid.ContainsKey((new IntVec3(2, 2, 0))) |> should equal true

[<Fact>]
[<Trait("id", "delta-robot-combine")>]
[<Trait("tag", "opt")>]
let ``delta robot combine`` () =
    let initDir = IntVec3.UnitZ
    let initPos = IntVec3.Zero
    let robot:BasicRobot = {Position=initPos; Direction=initDir}
    let grid2 = GridStateTracker2 Seq.empty
    let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
    let commands:Command2 list = [
        {Name="forward"; Args=[]}
        {Name="up"; Args=[]}
        {Name="down"; Args=[]}
        {Name="up"; Args=[]}
        {Name="left"; Args=[]}
        {Name="right"; Args=[]}

        ]
    let deltaOption = (runner2 :> IRobotSimulator2).GetDelta commands
    deltaOption.IsSome |> should equal true
    let delta = deltaOption.Value :?> BasicWorldStateDelta

    let robot:BasicRobot = {Position=initPos; Direction=initDir}
    let grid2 = GridStateTracker2 Seq.empty
    let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
    let commands:Command2 list = [
        {Name="left"; Args=[]}
        {Name="forward"; Args=[]}
        {Name="left"; Args=[]}
        {Name="right"; Args=[]}
        {Name="left"; Args=[]}
        {Name="up"; Args=[]}
        {Name="down"; Args=[]}
        ]
    let deltaOption = (runner2 :> IRobotSimulator2).GetDelta commands
    deltaOption.IsSome |> should equal true
    let delta2 = deltaOption.Value :?> BasicWorldStateDelta

    let combine = BasicWorldStateDelta.Combine delta delta2
    combine.RobotDelta.TurnCounter |> should equal -2
    combine.RobotDelta.GetNewDir initDir |> should equal -initDir
    combine.RobotDelta.PosDelta |> should equal (new IntVec3(-1, 1, 1))
    combine.GridDelta.IsEmpty |> should equal true

[<Fact>]
[<Trait("id", "delta-combine")>]
[<Trait("tag", "opt")>]
let ``delta combine`` () =
    let initDir = IntVec3.UnitZ
    let initPos = IntVec3.Zero
    let robot:BasicRobot = {Position=initPos; Direction=initDir}
    let grid2 = GridStateTracker2 Seq.empty
    let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
    let commands:Command2 list = [
        {Name="forward"; Args=[]}
        {Name="cube"; Args=[1]}
        {Name="up"; Args=[]}
        {Name="cube"; Args=[1]}
        {Name="down"; Args=[]}
        {Name="up"; Args=[]}
        {Name="left"; Args=[]}
        {Name="right"; Args=[]}
        ]
    let deltaOption = (runner2 :> IRobotSimulator2).GetDelta commands
    deltaOption.IsSome |> should equal true
    let delta = deltaOption.Value :?> BasicWorldStateDelta

    let robot:BasicRobot = {Position=initPos; Direction=initDir}
    let grid2 = GridStateTracker2 Seq.empty
    let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
    let commands:Command2 list = [
        {Name="cube"; Args=[1]}
        {Name="left"; Args=[]}
        {Name="forward"; Args=[]}
        {Name="cube"; Args=[1]}
        {Name="left"; Args=[]}
        {Name="up"; Args=[]}
        {Name="forward"; Args=[]}
        {Name="cube"; Args=[1]}
        {Name="down"; Args=[]}
        ]
    let deltaOption = (runner2 :> IRobotSimulator2).GetDelta commands
    deltaOption.IsSome |> should equal true
    let delta2 = deltaOption.Value :?> BasicWorldStateDelta

    let combine = BasicWorldStateDelta.Combine delta delta2
    combine.RobotDelta.TurnCounter |> should equal -2
    combine.RobotDelta.GetNewDir initDir |> should equal -initDir
    combine.RobotDelta.PosDelta |> should equal (new IntVec3(-1, 1, 0))
    (Map.toArray combine.GridDelta).Length |> should equal 4
    combine.GridDelta.ContainsKey((new IntVec3(0, 0, 1))) |> should equal true
    combine.GridDelta.ContainsKey((new IntVec3(0, 1, 1))) |> should equal true
    combine.GridDelta.ContainsKey((new IntVec3(-1, 1, 1))) |> should equal true
    combine.GridDelta.ContainsKey((new IntVec3(-1, 2, 0))) |> should equal true

[<Fact>]
[<Trait("id", "delta-combine-apply")>]
[<Trait("tag", "opt")>]
let ``delta combine apply`` () =
    let initDir = IntVec3.UnitZ
    let initPos = IntVec3.Zero
    let robot:BasicRobot = {Position=initPos; Direction=initDir}
    let grid2 = GridStateTracker2 Seq.empty
    let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
    let commands:Command2 list = [
        {Name="forward"; Args=[]}
        {Name="cube"; Args=[1]}
        {Name="up"; Args=[]}
        {Name="cube"; Args=[1]}
        {Name="down"; Args=[]}
        {Name="up"; Args=[]}
        {Name="left"; Args=[]}
        {Name="right"; Args=[]}
        ]
    let deltaOption = (runner2 :> IRobotSimulator2).GetDelta commands
    deltaOption.IsSome |> should equal true
    let delta = deltaOption.Value :?> BasicWorldStateDelta

    let robot:BasicRobot = {Position=initPos; Direction=initDir}
    let grid2 = GridStateTracker2 Seq.empty
    let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
    let commands:Command2 list = [
        {Name="cube"; Args=[1]}
        {Name="left"; Args=[]}
        {Name="forward"; Args=[]}
        {Name="cube"; Args=[1]}
        {Name="left"; Args=[]}
        {Name="up"; Args=[]}
        {Name="forward"; Args=[]}
        {Name="cube"; Args=[1]}
        {Name="down"; Args=[]}
        ]
    let deltaOption = (runner2 :> IRobotSimulator2).GetDelta commands
    deltaOption.IsSome |> should equal true
    let delta2 = deltaOption.Value :?> BasicWorldStateDelta

    let combine = BasicWorldStateDelta.Combine delta delta2
    let startState = {Robot={Position=initPos; Direction=initDir}; Grid=(GridStateTracker2 Seq.empty).CurrentState}:BasicWorldState2
    let endState = combine.ApplyTo(startState)
    endState.Robot.Position |> should equal (new IntVec3(-1,1,0))
    endState.Robot.Direction |> should equal -initDir
    (Map.toArray endState.Grid).Length |> should equal 4
    endState.Grid.ContainsKey((new IntVec3(0, 0, 1))) |> should equal true
    endState.Grid.ContainsKey((new IntVec3(0, 1, 1))) |> should equal true
    endState.Grid.ContainsKey((new IntVec3(-1, 1, 1))) |> should equal true
    endState.Grid.ContainsKey((new IntVec3(-1, 2, 0))) |> should equal true
