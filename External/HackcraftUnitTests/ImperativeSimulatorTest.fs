module Hackcraft.UnitTest.ImperativeSimulatorTest

open Xunit
open Xunit.Extensions
open FsUnit.Xunit
open System.Collections.Generic
open Hackcraft

let newRobot () = Robot.BasicImperativeRobot (IntVec3.Zero, IntVec3.UnitZ)

[<Fact>]
let ``Simulator nop program test`` () =
    let prog = Serialization.Load SerializationTest.nopTestProgram
    let grid = Simulator.ExecuteFullProgram prog "MAIN" (GridStateTracker []) (newRobot ())

    grid.Length |> should equal 1
    grid.[0].Grid.Length |> should equal 0

[<Fact>]
let ``Simulator simple program test`` () =
    // tests Forward, Call F1, Up, PlaceBlock

    let prog = Serialization.Load SerializationTest.simpleTestProgram
    let grid = Simulator.ExecuteFullProgram prog "MAIN" (GridStateTracker []) (newRobot ())

    grid.Length |> should equal 36
    grid.[0].Grid.Length |> should equal 0
    grid.[grid.Length - 1].Grid.Length |> should equal 10

    let blocks = HashSet([for i in 1 .. 10 -> IntVec3 (0,i,5)])
    blocks.SetEquals (grid.[grid.Length - 1].Grid |> Seq.map (fun kvp -> kvp.Key)) |> should equal true

let repeatTestProg = """
{"meta":{"language":"imperative_v01","version":{"major":0,"minor":1}},"procedures":{"F1":{"arity":0,"body":[{"args":[{"type":"literal","value":"1"}],"meta":{"id":3},"proc":"Forward","type":"call"},{"args":[],"meta":{"id":4},"proc":"Right","type":"call"},{"args":[{"type":"literal","value":"1"}],"meta":{"id":5},"proc":"Forward","type":"call"},{"args":[{"type":"literal","value":"#5cab32"}],"meta":{"id":6},"proc":"PlaceBlock","type":"call"},{"args":[{"type":"literal","value":"1"}],"meta":{"id":7},"proc":"Forward","type":"call"},{"args":[],"meta":{"id":8},"proc":"Left","type":"call"},{"args":[{"type":"literal","value":"1"}],"meta":{"id":9},"proc":"Forward","type":"call"},{"args":[{"type":"literal","value":"#5cab32"}],"meta":{"id":10},"proc":"PlaceBlock","type":"call"}]},"MAIN":{"arity":0,"body":[{"numtimes":{"type":"literal","value":"10"},"meta":{"id":20},"stmt":{"meta":{"id":22},"body":[{"args":[],"meta":{"id":21},"proc":"F1","type":"call"}],"type":"block"},"type":"repeat"}]}}} 
"""

[<Fact>]
let ``Simulator repeat program test`` () =
    let prog = Serialization.Load repeatTestProg
    let grid = Simulator.ExecuteFullProgram prog "MAIN" (GridStateTracker []) (newRobot ())

    grid.Length |> should equal 81
    grid.[grid.Length - 1].Grid.Length |> should equal 20

    let blocks = HashSet([for i in 1 .. 20 -> IntVec3 (i,0,i)])
    blocks.SetEquals (grid.[grid.Length - 1].Grid |> Seq.map (fun kvp -> kvp.Key)) |> should equal true
