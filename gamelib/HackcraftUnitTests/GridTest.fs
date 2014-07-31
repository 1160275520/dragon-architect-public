module Hackcraft.UnitTest.GridTest

open Xunit
open Xunit.Extensions
open FsUnit.Xunit
open System.Collections.Generic
open System.IO
open Hackcraft

let newRobot () = Robot.BasicImperativeRobot (IntVec3.Zero, IntVec3.UnitZ)

(*
[<Fact>]
let ``Grid serialization empty test`` () =
    let grid = [||]

    let encoded = World.encodeToString grid
    let decoded = World.decodeFromString encoded 
    decoded |> should equal grid

[<Fact>]
let ``Grid serialization simple test`` () =
    let kvp (k, v) = KeyValuePair (k,v)

    let grid = [| IntVec3.UnitX, 1; IntVec3.UnitY, 2; IntVec3.UnitZ, 3; |] |> Array.map kvp

    let encoded = World.encodeToString grid
    let decoded = World.decodeFromString encoded 
    decoded |> should equal grid


let repeatTestProg = """
{"meta":{"language":"imperative_v01","version":{"major":0,"minor":1}},"procedures":{"F1":{"arity":0,"body":[{"args":[{"type":"literal","value":"1"}],"meta":{"id":3},"proc":"Forward","type":"call"},{"args":[],"meta":{"id":4},"proc":"Right","type":"call"},{"args":[{"type":"literal","value":"1"}],"meta":{"id":5},"proc":"Forward","type":"call"},{"args":[{"type":"literal","value":"#5cab32"}],"meta":{"id":6},"proc":"PlaceBlock","type":"call"},{"args":[{"type":"literal","value":"1"}],"meta":{"id":7},"proc":"Forward","type":"call"},{"args":[],"meta":{"id":8},"proc":"Left","type":"call"},{"args":[{"type":"literal","value":"1"}],"meta":{"id":9},"proc":"Forward","type":"call"},{"args":[{"type":"literal","value":"#5cab32"}],"meta":{"id":10},"proc":"PlaceBlock","type":"call"}]},"MAIN":{"arity":0,"body":[{"numtimes":{"type":"literal","value":"10"},"meta":{"id":20},"stmt":{"meta":{"id":22},"body":[{"args":[],"meta":{"id":21},"proc":"F1","type":"call"}],"type":"block"},"type":"repeat"}]}}} 
"""

[<Fact>]
let ``Grid serialization repeat program test`` () =
    let prog = Serialization.Load repeatTestProg
    let states = Simulator.ExecuteFullProgram prog (GridStateTracker []) (newRobot ())
    let grid = states.[states.Length - 1].Grid.ToArray()

    let encoded = World.encodeToString grid
    let decoded = World.decodeFromString encoded 
    decoded |> should equal grid
*)
