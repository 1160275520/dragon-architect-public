module Ruthefjord.UnitTest.OptimizeTest

open Xunit
open Xunit.Extensions
open FsUnit.Xunit
open System.Collections.Generic
open System.IO
open Ruthefjord

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
