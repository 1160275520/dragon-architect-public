module Ruthefjord.UnitTest.OptimizeTest

open Xunit
open Xunit.Extensions
open FsUnit.Xunit
open System.Collections.Generic
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
    deltaOption.IsSome |> should equal true
    let delta = deltaOption.Value :?> BasicWorldStateDelta
    delta.RobotDelta.Delta.Direction + initDir |> should equal initDir
    delta.RobotDelta.Delta.Position |> should equal (new IntVec3(0, 0, 4))
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
        ]
    let deltaOption = (runner2 :> IRobotSimulator2).GetDelta commands
    deltaOption.IsSome |> should equal true
    let delta = deltaOption.Value :?> BasicWorldStateDelta
    delta.RobotDelta.Delta.Direction + initDir |> should equal -initDir
    delta.RobotDelta.Delta.Position |> should equal (new IntVec3(-1, 0, 1))
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
    deltaOption.IsSome |> should equal true
    let delta = deltaOption.Value :?> BasicWorldStateDelta
    delta.RobotDelta.Delta.Direction + initDir |> should equal (new IntVec3(initDir.Z, 0, -initDir.X))
    delta.RobotDelta.Delta.Position |> should equal (new IntVec3(1, 0, 1))
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
    delta.RobotDelta.Delta.Direction + initDir |> should equal initDir
    delta.RobotDelta.Delta.Position |> should equal (new IntVec3(0, 1, 0))

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
    delta.RobotDelta.Delta.Direction + initDir |> should equal initDir
    delta.RobotDelta.Delta.Position |> should equal (new IntVec3(0, -5, 0))

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
