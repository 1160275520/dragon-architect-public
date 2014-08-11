module Ruthefjord.UnitTest.ImperativeSimulatorTest

open Xunit
open Xunit.Extensions
open FsUnit.Xunit
open System.Collections.Generic
open Ruthefjord

let newRobot () = Robot.BasicImperativeRobot (IntVec3.Zero, IntVec3.UnitZ)

[<Fact>]
let ``Simulator nop program test`` () =
    let prog = Serialization.Load ProgramSerializationTest.nopTestProgram
    let grid = Simulator.ExecuteFullProgram prog (GridStateTracker []) (newRobot ())

    grid.Length |> should equal 1
    grid.[0].Grid.Length |> should equal 0

[<Fact>]
let ``Simulator simple program test`` () =
    // tests Forward, Call F1, Up, PlaceBlock

    let prog = Serialization.Load ProgramSerializationTest.simpleTestProgram
    let grid = Simulator.ExecuteFullProgram prog (GridStateTracker []) (newRobot ())

    grid.Length |> should equal 36
    grid.[0].Grid.Length |> should equal 0
    grid.[grid.Length - 1].Grid.Length |> should equal 10

    let blocks = HashSet([for i in 1 .. 10 -> IntVec3 (0,i,5)])
    blocks.SetEquals (grid.[grid.Length - 1].Grid |> Seq.map (fun kvp -> kvp.Key)) |> should equal true

let repeatTestProg = """
{"meta":{"language":"imperative_v01","version":{"major":0,"minor":2}},"procedures":{"F1":{"params":[],"body":[{"args":[{"type":"literal","value":"1"}],"meta":{"id":3},"proc":"Forward","type":"call"},{"args":[],"meta":{"id":4},"proc":"Right","type":"call"},{"args":[{"type":"literal","value":"1"}],"meta":{"id":5},"proc":"Forward","type":"call"},{"args":[{"type":"literal","value":"#5cab32"}],"meta":{"id":6},"proc":"PlaceBlock","type":"call"},{"args":[{"type":"literal","value":"1"}],"meta":{"id":7},"proc":"Forward","type":"call"},{"args":[],"meta":{"id":8},"proc":"Left","type":"call"},{"args":[{"type":"literal","value":"1"}],"meta":{"id":9},"proc":"Forward","type":"call"},{"args":[{"type":"literal","value":"#5cab32"}],"meta":{"id":10},"proc":"PlaceBlock","type":"call"}]},"MAIN":{"params":[],"body":[{"numtimes":{"type":"literal","value":"10"},"meta":{"id":20},"stmt":{"meta":{"id":22},"body":[{"args":[],"meta":{"id":21},"proc":"F1","type":"call"}],"type":"block"},"type":"repeat"}]}}} 
"""

[<Fact>]
let ``Simulator repeat program test`` () =
    let prog = Serialization.Load repeatTestProg
    let grid = Simulator.ExecuteFullProgram prog (GridStateTracker []) (newRobot ())

    grid.Length |> should equal 81
    grid.[grid.Length - 1].Grid.Length |> should equal 20

    let blocks = HashSet([for i in 1 .. 20 -> IntVec3 (i,0,i)])
    blocks.SetEquals (grid.[grid.Length - 1].Grid |> Seq.map (fun kvp -> kvp.Key)) |> should equal true

let moduleTestProgram = """
{
"meta":{"language":"imperative_v01","version":{"major":0, "minor":2}},
"modules":{
    "foo":{
        "procedures":{
            "F1":{"params":[],"body":[
                {"args":[{"type":"literal","value":"1"}],"meta":{"id":25},"proc":"Up","type":"call"},
                {"args":[{"type":"literal","value":"#5cab32"}],"meta":{"id":26},"proc":"PlaceBlock","type":"call"}
            ]},
            "F2":{"params":[],"body":[]},
            "MAIN":{"params":[],"body":[
                {"args":[{"type":"literal","value":"5"}],"meta":{"id":21},"proc":"Forward","type":"call"},
                {"numtimes":{"type":"literal","value":"10"},"meta":{"id":24},"stmt":
                    {"meta":{"id":27},"body":[
                        {"args":[],"meta":{"id":22},"proc":"F1","type":"call"},
                        {"args":[],"meta":{"id":23},"proc":"Left","type":"call"}
                    ],"type":"block"},"type":"repeat"}]}
        }
    }
},
"procedures":{
    "MAIN":{"params":[],"body":[
        {"args":[],"meta":{"id":12351},"proc":"foo","type":"call"},
    ]}
}
}
"""

[<Fact>]
let ``Simulator module program test`` () =
    let prog = Serialization.Load moduleTestProgram
    let grid = Simulator.ExecuteFullProgram prog (GridStateTracker []) (newRobot ())

    grid.Length |> should equal 36
    grid.[0].Grid.Length |> should equal 0
    grid.[grid.Length - 1].Grid.Length |> should equal 10

    let blocks = HashSet([for i in 1 .. 10 -> IntVec3 (0,i,5)])
    blocks.SetEquals (grid.[grid.Length - 1].Grid |> Seq.map (fun kvp -> kvp.Key)) |> should equal true
