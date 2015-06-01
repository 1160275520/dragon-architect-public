module Ruthefjord.UnitTest.ImperativeSimulatorTest

open Xunit
open Xunit.Extensions
open FsUnit.Xunit
open System.Collections.Generic
open System.IO
open Ruthefjord

let newRobot () = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}

let loadBuiltIns () =
    let builtInsFilename = "../../../../unity/Assets/Resources/module/stdlib.txt"
    let text = File.ReadAllText builtInsFilename
    Parser.Parse (text, "stdlib") |> Simulator.import

[<Fact>]
let ``builtins import`` () =
    let lib = loadBuiltIns ()

    lib.Count |> should equal 8
    lib.ContainsKey "Forward" |> should equal true

[<Fact>]
let ``Simulator nop deserialized`` () =
    let prog = Serialization.Load ProgramSerializationTest.emptyTestProgram
    let lib = loadBuiltIns ()
    let robot = BasicImperativeRobotSimulator (newRobot (), GridStateTracker [])
    let states = (Simulator.SimulateWithRobot prog lib robot).States

    states.Length |> should equal 2
    (states.[0].Data.WorldState :?> BasicWorldState).Grid.Length |> should equal 0

[<Fact>]
let ``Simulator nop parsed`` () =
    let text = """
define foo()
    bar()

    """
    let prog = Parser.Parse (text, "prog")
    let lib = loadBuiltIns ()
    let robot = BasicImperativeRobotSimulator (newRobot (), GridStateTracker [])
    let states = (Simulator.SimulateWithRobot prog lib robot).States

    states.Length |> should equal 2
    (states.[0].Data.WorldState :?> BasicWorldState).Grid.Length |> should equal 0

[<Fact>]
let ``Simulator simple deserialized`` () =
    // tests Forward, Call F1, Up, PlaceCube

    let prog = Serialization.Load ProgramSerializationTest.simpleTestProgram
    let lib = loadBuiltIns ()
    let robot = BasicImperativeRobotSimulator (newRobot (), GridStateTracker [])
    let states = (Simulator.SimulateWithRobot prog lib robot).States

    (states.[0].Data.WorldState :?> BasicWorldState).Grid.Length |> should equal 0
    (states.[states.Length - 1].Data.WorldState :?> BasicWorldState).Grid.Length |> should equal 10

    let blocks = HashSet([for i in 1 .. 10 -> IntVec3 (0,i,5)])
    blocks.SetEquals ((states.[states.Length - 1].Data.WorldState :?> BasicWorldState).Grid |> Seq.map (fun kvp -> kvp.Key)) |> should equal true

[<Fact>]
let ``Simulator simple parsed`` () =
    let text = """
define Foo()
    Up(1)
    PlaceCube(1)

Forward(5)
repeat 10 times
    Foo()

    """
    let prog = Parser.Parse (text, "prog")
    let lib = loadBuiltIns ()
    let robot = BasicImperativeRobotSimulator (newRobot (), GridStateTracker [])
    let states = (Simulator.SimulateWithRobot prog lib robot).States

    (states.[0].Data.WorldState :?> BasicWorldState).Grid.Length |> should equal 0
    (states.[states.Length - 1].Data.WorldState :?> BasicWorldState).Grid.Length |> should equal 10

    let blocks = HashSet([for i in 1 .. 10 -> IntVec3 (0,i,5)])
    blocks.SetEquals ((states.[states.Length - 1].Data.WorldState :?> BasicWorldState).Grid |> Seq.map (fun kvp -> kvp.Key)) |> should equal true

let repeatTestProg = """
repeat 10 times
    Forward(1)
    Right()
    Forward(1)
    PlaceCube(1)
    Forward(1)
    Left()
    Forward(1)
    PlaceCube(1)
"""

[<Fact>]
let ``Simulator repeat`` () =
    let prog = Parser.Parse (repeatTestProg, "prog")
    let lib = loadBuiltIns ()
    let robot = BasicImperativeRobotSimulator (newRobot (), GridStateTracker [])
    let states = (Simulator.SimulateWithRobot prog lib robot).States

    states.Length |> should equal 82
    (states.[states.Length - 1].Data.WorldState :?> BasicWorldState).Grid.Length |> should equal 20

    let blocks = HashSet([for i in 1 .. 20 -> IntVec3 (i,0,i)])
    blocks.SetEquals ((states.[states.Length - 1].Data.WorldState :?> BasicWorldState).Grid |> Seq.map (fun kvp -> kvp.Key)) |> should equal true
