module Ruthefjord.UnitTest.OptimizeTest

open Xunit
open Xunit.Extensions
open FsUnit.Xunit
open System.IO
open Ruthefjord
open Ruthefjord.Robot

module IST = ImperativeSimulatorTest

[<Fact>]
[<Trait("tag", "opt")>]
let ``command sanity check`` () =
    let c1: Robot.Command = {Name="foo"; Args=["bar" :> obj]}
    let c2: Robot.Command = {Name="foo"; Args=["bar" :> obj]}

    c1 |> should equal c2

[<Fact>]
let ``no-op detla simulation`` () =
    let initData = IST.loadSampleProgram "line"
    let expected = Debugger.runToCannonicalState initData.Program (TreeMapGrid ()) initData.BuiltIns initData.State

    let cache = Simulator.MutableDict ()
    let simulator = Debugger.makeSimulator (TreeMapGrid ()) initData.State
    Simulator.RunOptimized initData.Program initData.BuiltIns simulator cache
    let actual = simulator.AsCanonicalState

    actual |> should equal expected

[<Fact>]
let ``detla simulation`` () =
    let initData = IST.loadSampleProgram "line"
    let expected = Debugger.runToCannonicalState initData.Program (TreeMapGrid ()) initData.BuiltIns initData.State

    let cache = Simulator.MutableDict ()
    let simulator = DeltaRobotSimulator (initData.State.Robot)
    Simulator.RunOptimized initData.Program initData.BuiltIns simulator cache
    let actual = simulator.AsCanonicalState

    actual |> should equal expected

// copy of the normal delta simulator, except Execute throw an exception.
// for testing to ensure optimized simulators actually use the deltas exclusively
type NoFallbackDeltaRobotSimulator (robot) =
    let sim = DeltaRobotSimulator(robot)
    let isim = sim :> Robot.IRobotDeltaSimulator<_,_>

    member x.AsCanonicalState = sim.AsCanonicalState

    interface Robot.IRobotDeltaSimulator<WorldState<DictGrid>, BasicWorldStateDelta> with
        member x.Execute command = invalidOp ""
        member x.Query query = isim.Query query
        member x.CurrentState = isim.CurrentState
        member x.EmptyDelta = isim.EmptyDelta
        member x.CreateDelta command = isim.CreateDelta command
        member x.CombineDelta a b = isim.CombineDelta a b
        member x.TryApplyDelta delta = isim.TryApplyDelta delta

// delta simulation on normal program should never hit the fallback code
[<Fact>]
let ``detla simulation no fallback`` () =
    let initData = IST.loadSampleProgram "line"
    let expected = Debugger.runToCannonicalState initData.Program (TreeMapGrid ()) initData.BuiltIns initData.State

    let cache = Simulator.MutableDict ()
    let simulator = NoFallbackDeltaRobotSimulator (initData.State.Robot)
    Simulator.RunOptimized initData.Program initData.BuiltIns simulator cache
    let actual = simulator.AsCanonicalState

    actual |> should equal expected

[<Fact>]
[<Trait("tag", "opt")>]
let ``yet another optimization test`` () =
    let initData = IST.loadSampleProgram "pyramid"
    let initState: BasicWorldState2 = {Robot=initData.State.Robot; Grid=Map.empty}

    let expected = Debugger.getAllCannonicalStates initData.Program (TreeMapGrid ()) initData.BuiltIns initData.State
    let endState = expected.[expected.Length - 1]
    let grid1 = MyMap.keys endState.Grid |> Array.ofSeq |> Array.sort

    let cache = Simulator.MutableDict ()
    let actual = Simulator.RunOptimized37 initData.Program initData.BuiltIns Debugger.stateFunctionsNoOp cache initState
    let grid2 = actual.Grid |> Map.toArray |> (Array.map (fun kv -> fst kv)) |> Array.sort

    actual.Robot |> should equal endState.Robot
    grid2 |> should equal grid1

[<Fact>]
[<Trait("tag", "opt")>]
let ``dictionary-based delta integration test`` () =
    let initData = IST.loadSampleProgram "pyramid"
    let initState: BasicWorldState2 = {Robot=initData.State.Robot; Grid=Map.empty}
    let initState3: BasicWorldState3 = {Robot=initData.State.Robot; Grid=System.Collections.Generic.Dictionary()}

    let expected = Debugger.getAllCannonicalStates initData.Program (TreeMapGrid ()) initData.BuiltIns initData.State
    let endState = expected.[expected.Length - 1]
    let grid1 = MyMap.keys endState.Grid |> Array.ofSeq |> Array.sort

    let cache = Simulator.MutableDict ()
    let actual = Simulator.RunOptimized37 initData.Program initData.BuiltIns Debugger.stateFunctions2 cache initState3
    let grid2 = actual.Grid |> Seq.toArray |> (Array.map (fun kv -> kv.Key)) |> Array.sort

    actual.Robot |> should equal endState.Robot
    grid2 |> should equal grid1

[<Fact>]
[<Trait("id", "delta-pos")>]
[<Trait("tag", "opt")>]
let ``delta position`` () =
    let initDir = IntVec3.UnitZ
    let initPos = IntVec3.Zero
    let robot:BasicRobot = {Position=initPos; Direction=initDir}
    let grid2 = GridStateTracker2 Seq.empty
    let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
    let commands:Command list = [
        {Name="forward"; Args=[]}
        {Name="forward"; Args=[]}
        {Name="forward"; Args=[]}
        {Name="forward"; Args=[]}
        ]
    let delta = BasicWorldStateDelta.Create commands
    runner2.Robot.Direction |> should equal initDir
    runner2.Robot.Position |> should equal initPos
    runner2.Grid.CurrentState |> should equal (GridStateTracker2 Seq.empty).CurrentState
    delta.RobotDelta.TurnCounter |> should equal 0
    BasicRobotDelta.GetNewDir initDir delta.RobotDelta.TurnCounter |> should equal initDir
    delta.RobotDelta.ParallelDelta |> should equal 4
    delta.RobotDelta.PerpenDelta |> should equal 0
    delta.RobotDelta.YDelta |> should equal 0
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
    let commands:Command list = [
        {Name="forward"; Args=[]}
        {Name="left"; Args=[]}
        {Name="forward"; Args=[]}
        {Name="left"; Args=[]}
        {Name="right"; Args=[]}
        {Name="left"; Args=[]}
        {Name="left"; Args=[]}
        {Name="right"; Args=[]}
        ]
    let delta = BasicWorldStateDelta.Create commands
    runner2.Robot.Direction |> should equal initDir
    runner2.Robot.Position |> should equal initPos
    runner2.Grid.CurrentState |> should equal (GridStateTracker2 Seq.empty).CurrentState
    delta.RobotDelta.TurnCounter |> should equal -2
    BasicRobotDelta.GetNewDir initDir delta.RobotDelta.TurnCounter |> should equal -initDir
    delta.RobotDelta.ParallelDelta |> should equal 1
    delta.RobotDelta.PerpenDelta |> should equal -1
    delta.RobotDelta.YDelta |> should equal 0
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
    let commands:Command list = [
        {Name="forward"; Args=[]}
        {Name="cube"; Args=[1]}
        {Name="right"; Args=[]}
        {Name="forward"; Args=[]}
        {Name="cube"; Args=[1]}
        ]
    let delta = BasicWorldStateDelta.Create commands
    runner2.Robot.Direction |> should equal initDir
    runner2.Robot.Position |> should equal initPos
    runner2.Grid.CurrentState |> should equal (GridStateTracker2 Seq.empty).CurrentState
    delta.RobotDelta.TurnCounter |> should equal 1
    BasicRobotDelta.GetNewDir initDir delta.RobotDelta.TurnCounter |> should equal (new IntVec3(initDir.Z, 0, -initDir.X))
    delta.RobotDelta.ParallelDelta |> should equal 1
    delta.RobotDelta.PerpenDelta |> should equal 1
    delta.RobotDelta.YDelta |> should equal 0
    (Map.toArray delta.GridDelta).Length |> should equal 2
    delta.GridDelta.ContainsKey({ParallelDelta=1;PerpenDelta=0;YDelta=0;MinY=0}) |> should equal true
    delta.GridDelta.ContainsKey({ParallelDelta=1;PerpenDelta=1;YDelta=0;MinY=0}) |> should equal true

[<Fact>]
[<Trait("id", "delta-vert-some")>]
[<Trait("tag", "opt")>]
let ``delta vertical some`` () =
    let initDir = IntVec3.UnitZ
    let initPos = IntVec3.Zero
    let robot:BasicRobot = {Position=initPos; Direction=initDir}
    let grid2 = GridStateTracker2 Seq.empty
    let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
    let commands:Command list = [
        {Name="up"; Args=[]}
        {Name="down"; Args=[]}
        {Name="up"; Args=[]}
        {Name="up"; Args=[]}
        {Name="down"; Args=[]}
        ]
    let delta = BasicWorldStateDelta.Create commands
    delta.RobotDelta.TurnCounter |> should equal 0
    BasicRobotDelta.GetNewDir initDir delta.RobotDelta.TurnCounter |> should equal initDir
    delta.RobotDelta.ParallelDelta |> should equal 0
    delta.RobotDelta.PerpenDelta |> should equal 0
    delta.RobotDelta.YDelta |> should equal 1

[<Fact>]
[<Trait("id", "delta-vert-some2")>]
[<Trait("tag", "opt")>]
let ``delta vertical some 2`` () =
    let initDir = IntVec3.UnitZ
    let initPos = new IntVec3(0, 5, 0)
    let robot:BasicRobot = {Position=initPos; Direction=initDir}
    let grid2 = GridStateTracker2 Seq.empty
    let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
    let commands:Command list = [
        {Name="down"; Args=[]}
        {Name="down"; Args=[]}
        {Name="down"; Args=[]}
        {Name="down"; Args=[]}
        {Name="down"; Args=[]}
        ]
    let delta = BasicWorldStateDelta.Create commands
    delta.RobotDelta.TurnCounter |> should equal 0
    BasicRobotDelta.GetNewDir initDir delta.RobotDelta.TurnCounter |> should equal initDir
    delta.RobotDelta.ParallelDelta |> should equal 0
    delta.RobotDelta.PerpenDelta |> should equal 0
    delta.RobotDelta.YDelta |> should equal -5

[<Fact>]
[<Trait("id", "delta-robot-combine")>]
[<Trait("tag", "opt")>]
let ``delta robot combine`` () =
    let initDir = IntVec3.UnitZ
    let initPos = IntVec3.Zero
    let robot:BasicRobot = {Position=initPos; Direction=initDir}
    let grid2 = GridStateTracker2 Seq.empty
    let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
    let commands:Command list = [
        {Name="forward"; Args=[]}
        {Name="up"; Args=[]}
        {Name="down"; Args=[]}
        {Name="up"; Args=[]}
        {Name="left"; Args=[]}
        {Name="right"; Args=[]}

        ]
    let delta = BasicWorldStateDelta.Create commands

    let robot:BasicRobot = {Position=initPos; Direction=initDir}
    let grid2 = GridStateTracker2 Seq.empty
    let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
    let commands:Command list = [
        {Name="left"; Args=[]}
        {Name="forward"; Args=[]}
        {Name="left"; Args=[]}
        {Name="right"; Args=[]}
        {Name="left"; Args=[]}
        {Name="up"; Args=[]}
        {Name="down"; Args=[]}
        ]
    let delta2 = BasicWorldStateDelta.Create commands

    let combine = BasicWorldStateDelta.Combine delta delta2
    combine.RobotDelta.TurnCounter |> should equal -2
    BasicRobotDelta.GetNewDir initDir combine.RobotDelta.TurnCounter |> should equal -initDir
    combine.RobotDelta.ParallelDelta |> should equal 1
    combine.RobotDelta.YDelta |> should equal 1
    combine.RobotDelta.PerpenDelta |> should equal -1
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
    let commands:Command list = [
        {Name="forward"; Args=[]}
        {Name="cube"; Args=[1]}
        {Name="up"; Args=[]}
        {Name="cube"; Args=[1]}
        {Name="down"; Args=[]}
        {Name="up"; Args=[]}
        {Name="left"; Args=[]}
        {Name="right"; Args=[]}
        ]
    let delta = BasicWorldStateDelta.Create commands

    let robot:BasicRobot = {Position=initPos; Direction=initDir}
    let grid2 = GridStateTracker2 Seq.empty
    let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
    let commands:Command list = [
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
    let delta2 = BasicWorldStateDelta.Create commands

    let combine = BasicWorldStateDelta.Combine delta delta2
    combine.RobotDelta.TurnCounter |> should equal -2
    BasicRobotDelta.GetNewDir initDir combine.RobotDelta.TurnCounter |> should equal -initDir
    combine.RobotDelta.ParallelDelta |> should equal 0
    combine.RobotDelta.PerpenDelta |> should equal -1
    combine.RobotDelta.YDelta |> should equal 1
    (Map.toArray combine.GridDelta).Length |> should equal 4
    combine.GridDelta.ContainsKey({ParallelDelta=1;PerpenDelta=0;YDelta=0;MinY=0}) |> should equal true
    combine.GridDelta.ContainsKey({ParallelDelta=1;PerpenDelta=0;YDelta=1;MinY=0}) |> should equal true
    combine.GridDelta.ContainsKey({ParallelDelta=1;PerpenDelta= -1;YDelta=1;MinY=0}) |> should equal true
    combine.GridDelta.ContainsKey({ParallelDelta=0;PerpenDelta= -1;YDelta=2;MinY=0}) |> should equal true
