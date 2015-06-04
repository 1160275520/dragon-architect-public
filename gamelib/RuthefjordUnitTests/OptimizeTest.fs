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
    let c1: Robot.Command = {Name="foo"; Args=["bar" :> obj]}
    let c2: Robot.Command = {Name="foo"; Args=["bar" :> obj]}

    c1 |> should equal c2

let makeInitData (filename) =
    let stdlibPath = "../../../../unity/Assets/Resources/module/stdlib.txt"
    let importedModules = Simulator.import (Parser.Parse (System.IO.File.ReadAllText stdlibPath, "stdlib"))
    let text = System.IO.File.ReadAllText filename
    let program = Parser.Parse (text, filename)
    let grid = GridStateTracker Seq.empty
    let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}

    {
        Program = program;
        BuiltIns = importedModules;
        State = {Robot=robot; Grid=grid.CurrentState}
    }

[<Fact>]
[<Trait("tag", "opt")>]
let ``yet another optimization test`` () =
    let initData = makeInitData ("../../../../doc/pyramid.txt")
    let initState: BasicWorldState2 = {Robot=initData.State.Robot; Grid=Map.empty}
    let runner = BasicImperativeRobotSimulator (initData.State.Robot, GridStateTracker Seq.empty)
    let expected = Simulator.SimulateWithRobot initData.Program initData.BuiltIns runner

    let cache = Simulator.Dict ()
    let actual = Simulator.RunOptimized37 initData.Program initData.BuiltIns Debugger.stateFunctionsNoOp cache initState

    let endState = expected.States.[expected.States.Length - 1].Data.WorldState :?> BasicWorldState
    actual.Robot |> should equal endState.Robot
    let grid1 = endState.Grid |> ImmArr.toArray |> (Array.map (fun kvp -> kvp.Key)) |> Array.sort
    let grid2 = actual.Grid |> Map.toArray |> (Array.map (fun kv -> fst kv)) |> Array.sort
    grid2 |> should equal grid1

[<Fact>]
[<Trait("tag", "opt")>]
let ``dictionary-based delta integration test`` () =
    let initData = makeInitData ("../../../../doc/pyramid.txt")
    let initState: BasicWorldState2 = {Robot=initData.State.Robot; Grid=Map.empty}
    let initState3: BasicWorldState3 = {Robot=initData.State.Robot; Grid=System.Collections.Generic.Dictionary()}
    let runner = BasicImperativeRobotSimulator (initData.State.Robot, GridStateTracker Seq.empty)
    let expected = Simulator.SimulateWithRobot initData.Program initData.BuiltIns runner

    let cache = Simulator.Dict ()
    let actual = Simulator.RunOptimized37 initData.Program initData.BuiltIns Debugger.stateFunctions2 cache initState3

    let endState = expected.States.[expected.States.Length - 1].Data.WorldState :?> BasicWorldState
    actual.Robot |> should equal endState.Robot
    let grid1 = endState.Grid |> ImmArr.toArray |> (Array.map (fun kvp -> kvp.Key)) |> Array.sort
    let grid2 = actual.Grid |> Seq.toArray |> (Array.map (fun kv -> kv.Key)) |> Array.sort
    grid2 |> should equal grid1

[<Fact>]
[<Trait("tag", "opt")>]
let ``jump to state test`` () =
    let checkEqual (bws2:BasicWorldState3) (bws1:BasicWorldState) =
        bws2.Robot |> should equal bws1.Robot
        let grid1 = bws1.Grid |> ImmArr.toArray |> (Array.map (fun kvp -> kvp.Key)) |> Array.sort
        let grid2 = bws2.Grid |> Seq.toArray |> (Array.map (fun kv -> kv.Key)) |> Array.sort
        grid2 |> should equal grid1

    let initData = makeInitData ("../../../../doc/pyramid.txt")
    let initState: BasicWorldState2 = {Robot=initData.State.Robot; Grid=Map.empty}
    let initState3 () : BasicWorldState3 = {Robot=initData.State.Robot; Grid=System.Collections.Generic.Dictionary()}
    let runner = BasicImperativeRobotSimulator (initData.State.Robot, GridStateTracker Seq.empty)
    let expected = Simulator.SimulateWithRobot initData.Program initData.BuiltIns runner

    let cache = Simulator.Dict ()

    let rts n = Simulator.RunToState initData.Program initData.BuiltIns Debugger.stateFunctions2 cache (initState3 ()) n

    let endState = expected.States.[expected.States.Length - 1].Data.WorldState :?> BasicWorldState

    let checkIndex n =
        checkEqual (rts n) (expected.States.[n].Data.WorldState :?> BasicWorldState)

    (rts 0).Grid.Count |> should equal (initState3 ()).Grid.Count
    checkEqual (rts 10000000) endState
    for i = 1 to expected.States.Length - 1 do
        if i % 50 = 1 then
            checkIndex i
    checkIndex 2
    checkIndex 3
    checkIndex 4

[<Fact>]
[<Trait("id", "integ")>]
[<Trait("tag", "opt")>]
let ``integration test`` () =
    let initData = makeInitData ("../../../../doc/AARON.txt")
    let initState: BasicWorldState2 = {Robot=initData.State.Robot; Grid=Map.empty}
    let runner = BasicImperativeRobotSimulator (initData.State.Robot, GridStateTracker Seq.empty)
    let expected = Simulator.SimulateWithRobot initData.Program initData.BuiltIns runner

    let cache = Simulator.Dict ()
    let actual = Simulator.RunOptimized37 initData.Program initData.BuiltIns Debugger.stateFunctions cache initState

    let endState = expected.States.[expected.States.Length - 1].Data.WorldState :?> BasicWorldState
    actual.Robot |> should equal endState.Robot
    let grid1 = endState.Grid |> ImmArr.toArray |> (Array.map (fun kvp -> kvp.Key)) |> Array.sort
    let grid2 = actual.Grid |> Map.toArray |> (Array.map (fun kv -> fst kv)) |> Array.sort
    grid2 |> should equal grid1

    let initData = makeInitData ("../../../../doc/pyramid.txt")
    let initState: BasicWorldState2 = {Robot=initData.State.Robot; Grid=Map.empty}
    let runner = BasicImperativeRobotSimulator (initData.State.Robot, GridStateTracker Seq.empty)
    let expected = Simulator.SimulateWithRobot initData.Program initData.BuiltIns runner

    let cache = Simulator.Dict ()
    let actual = Simulator.RunOptimized37 initData.Program initData.BuiltIns Debugger.stateFunctions cache initState

    let endState = expected.States.[expected.States.Length - 1].Data.WorldState :?> BasicWorldState
    actual.Robot |> should equal endState.Robot
    let grid1 = endState.Grid |> ImmArr.toArray |> (Array.map (fun kvp -> kvp.Key)) |> Array.sort
    let grid2 = actual.Grid |> Map.toArray |> (Array.map (fun kv -> fst kv)) |> Array.sort
    grid2 |> should equal grid1

    let initData = makeInitData ("../../../../doc/castle_decomp.txt")
    let initState: BasicWorldState2 = {Robot=initData.State.Robot; Grid=Map.empty}
    let runner = BasicImperativeRobotSimulator (initData.State.Robot, GridStateTracker Seq.empty)
    let expected = Simulator.SimulateWithRobot initData.Program initData.BuiltIns runner

    let cache = Simulator.Dict ()
    let actual = Simulator.RunOptimized37 initData.Program initData.BuiltIns Debugger.stateFunctions cache initState

    let endState = expected.States.[expected.States.Length - 1].Data.WorldState :?> BasicWorldState
    actual.Robot |> should equal endState.Robot
    let grid1 = endState.Grid |> ImmArr.toArray |> (Array.map (fun kvp -> kvp.Key)) |> Array.sort
    let grid2 = actual.Grid |> Map.toArray |> (Array.map (fun kv -> fst kv)) |> Array.sort
    grid2 |> should equal grid1

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

    r1.States.Length |> should equal (r2.States.Length + 2) // runner 2 doesn't include the initial state, runner adds dummy state at the end
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
[<Trait("id", "delta-turn-around")>]
[<Trait("tag", "opt")>]
let ``delta turn around`` () =
    let initDir = IntVec3.UnitZ
    let initPos = IntVec3.Zero
    let robot:BasicRobot = {Position=initPos; Direction=initDir}
    let grid2 = GridStateTracker2 Seq.empty
    let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
    let commands:Command list = [
        {Name="forward"; Args=[]}
        {Name="forward"; Args=[]}
        {Name="forward"; Args=[]}
        {Name="right"; Args=[]}
        {Name="right"; Args=[]}
        ]
    let delta = BasicWorldStateDelta.Create commands
    delta.RobotDelta.TurnCounter |> should equal 2
    BasicRobotDelta.GetNewDir initDir delta.RobotDelta.TurnCounter |> should equal (new IntVec3(-initDir.X, 0, -initDir.Z))
    delta.RobotDelta.ParallelDelta |> should equal 3
    delta.RobotDelta.PerpenDelta |> should equal 0
    delta.RobotDelta.YDelta |> should equal 0
    let startState = {Robot={Position=initPos; Direction=initDir}; Grid=grid2.CurrentState}:BasicWorldState2
    let es = BasicWorldStateDelta.ApplyDelta startState delta
    es.IsSome |> should equal true
    let endState = es.Value
    endState |> should equal {startState with Robot={Position=IntVec3(0,0,3); Direction= -initDir}}

[<Fact>]
[<Trait("id", "delta-L")>]
[<Trait("tag", "opt")>]
let ``delta L`` () =
    let initDir = IntVec3.UnitZ
    let initPos = IntVec3.Zero
    let robot:BasicRobot = {Position=initPos; Direction=initDir}
    let grid2 = GridStateTracker2 Seq.empty
    let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
    let commands:Command list = [
        {Name="left"; Args=[]}
        {Name="forward"; Args=[]}
        {Name="forward"; Args=[]}
        {Name="forward"; Args=[]}
        {Name="forward"; Args=[]}
        ]
    let deltaIter = BasicWorldStateDelta.Create commands
    let delta = BasicWorldStateDelta.Combine deltaIter deltaIter
    delta.RobotDelta.TurnCounter |> should equal -2
    BasicRobotDelta.GetNewDir initDir delta.RobotDelta.TurnCounter |> should equal (new IntVec3(-initDir.X, 0, -initDir.Z))
    delta.RobotDelta.ParallelDelta |> should equal -4
    delta.RobotDelta.PerpenDelta |> should equal -4
    delta.RobotDelta.YDelta |> should equal 0
    let startState = {Robot={Position=initPos; Direction=initDir}; Grid=grid2.CurrentState}:BasicWorldState2
    let es = BasicWorldStateDelta.ApplyDelta startState delta
    es.IsSome |> should equal true
    let endState = es.Value
    endState |> should equal {startState with Robot={Position=IntVec3(-4,0,-4); Direction= -initDir}}

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
    let commands:Command list = [
        {Name="up"; Args=[]}
        {Name="forward"; Args=[]}
        {Name="cube"; Args=[1]}
        {Name="right"; Args=[]}
        {Name="forward"; Args=[]}
        {Name="cube"; Args=[1]}
        ]
    let delta = BasicWorldStateDelta.Create commands
    let startState = {Robot={Position=initPos; Direction=initDir}; Grid=(GridStateTracker2 gridInit).CurrentState}:BasicWorldState2
    let es = BasicWorldStateDelta.ApplyDelta startState delta
    es.IsSome |> should equal true
    let endState = es.Value
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

[<Fact>]
[<Trait("id", "delta-combine-apply")>]
[<Trait("tag", "opt")>]
let ``delta combine apply`` () =
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
    let startState = {Robot={Position=initPos; Direction=initDir}; Grid=(GridStateTracker2 Seq.empty).CurrentState}:BasicWorldState2
    let es = BasicWorldStateDelta.ApplyDelta startState combine
    es.IsSome |> should equal true
    let endState = es.Value
    endState.Robot.Position |> should equal (new IntVec3(-1,1,0))
    endState.Robot.Direction |> should equal -initDir
    (Map.toArray endState.Grid).Length |> should equal 4
    endState.Grid.ContainsKey((new IntVec3(0, 0, 1))) |> should equal true
    endState.Grid.ContainsKey((new IntVec3(0, 1, 1))) |> should equal true
    endState.Grid.ContainsKey((new IntVec3(-1, 1, 1))) |> should equal true
    endState.Grid.ContainsKey((new IntVec3(-1, 2, 0))) |> should equal true
