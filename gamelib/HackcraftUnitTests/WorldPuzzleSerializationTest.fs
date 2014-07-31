module Hackcraft.UnitTest.WorldPuzzleSerializationTest

open Xunit
open Xunit.Extensions
open FsUnit.Xunit
open System.Collections.Generic
open System.IO
open Hackcraft
open Hackcraft.Scene

let newRobot () = Robot.BasicImperativeRobot (IntVec3.Zero, IntVec3.UnitZ)
let newBlock (pos, block) = KeyValuePair<IntVec3, int> (pos, block)

[<Fact>]
let ``World serialization empty test`` () =
    let world = {Blocks=[||]; Robots=[||]}

    let encoded = World.encodeToString world
    let decoded = World.decodeFromString encoded 
    decoded |> should equal world

    let empty = [
        """{"meta":{"version":1,"type":"world"}}""";
        """{"meta":{"version":1,"type":"world"}, "blocks":{"type":"json", "data":[]}}""";
        """{"meta":{"version":1,"type":"world"}, "blocks":{"type":"binary", "data":"", "little_endian":true}}""";
        """{"meta":{"version":1,"type":"world"}, "robots":[]}""";
    ]
    for text in empty do
        World.decodeFromString text |> should equal world

[<Fact>]
let ``World serialization simple test`` () =
    let kvp (k, v) = KeyValuePair (k,v)

    let blocks = [| IntVec3.UnitX, 1; IntVec3.UnitY, 2; IntVec3.UnitZ, 3; |] |> Array.map kvp
    let robots = [| {Position=IntVec3(2,3,4); Direction= -IntVec3.UnitZ} |]
    let world = {Blocks=blocks; Robots=robots}

    let encoded = World.encodeToString world
    let decoded = World.decodeFromString encoded 
    decoded |> should equal world

let repeatTestProg = """
{"meta":{"language":"imperative_v01","version":{"major":0,"minor":1}},"procedures":{"F1":{"arity":0,"body":[{"args":[{"type":"literal","value":"1"}],"meta":{"id":3},"proc":"Forward","type":"call"},{"args":[],"meta":{"id":4},"proc":"Right","type":"call"},{"args":[{"type":"literal","value":"1"}],"meta":{"id":5},"proc":"Forward","type":"call"},{"args":[{"type":"literal","value":"#5cab32"}],"meta":{"id":6},"proc":"PlaceBlock","type":"call"},{"args":[{"type":"literal","value":"1"}],"meta":{"id":7},"proc":"Forward","type":"call"},{"args":[],"meta":{"id":8},"proc":"Left","type":"call"},{"args":[{"type":"literal","value":"1"}],"meta":{"id":9},"proc":"Forward","type":"call"},{"args":[{"type":"literal","value":"#5cab32"}],"meta":{"id":10},"proc":"PlaceBlock","type":"call"}]},"MAIN":{"arity":0,"body":[{"numtimes":{"type":"literal","value":"10"},"meta":{"id":20},"stmt":{"meta":{"id":22},"body":[{"args":[],"meta":{"id":21},"proc":"F1","type":"call"}],"type":"block"},"type":"repeat"}]}}} 
"""

[<Fact>]
let ``World serialization repeat program test`` () =
    let prog = Serialization.Load repeatTestProg
    let states = Simulator.ExecuteFullProgram prog (GridStateTracker []) (newRobot ())
    let blocks = states.[states.Length - 1].Grid.ToArray()
    let robots = [| World.dataOfRobot states.[states.Length - 1].Robot |]
    let world = {Blocks=blocks; Robots=robots}

    let encoded = World.encodeToString world 
    let decoded = World.decodeFromString encoded 
    decoded |> should equal world

[<Fact>]
let ``Puzzle simple load test`` () =
    let text = """
    {
        "meta": {"version":1, "type":"puzzle"},
        "name": "foo",
        "component": "SomeClass",
        "library": {
            "required": ["happy"],
            "granted": ["joy"]
        },
        "logging_id": 1,
        "instructions": {
            "summary": "Do a thing!",
            "detail": "Here is how"
        },
        "world": {
            "blocks": {"type":"json", "data":[
                {"pos": [4,5,6], "blk": 76},
                {"pos": [3,2,1], "blk": 44}
            ]},
            "robots": [{"pos":[2,3,4], "dir":[0,0,-1]}]
        }
    }
    """

    let puzzle = text |> Json.Parse |> PuzzleInfo.Parse

    puzzle.Name |> should equal "foo"
    puzzle.Component |> should equal (Some "SomeClass")
    puzzle.Library.RequiredTools |> should equal (Set [ "happy" ])
    puzzle.Library.GrantedTools |> should equal (Set [ "joy" ])
    puzzle.LoggingId |> should equal 1
    puzzle.Instructions |> should equal (Some {Summary="Do a thing!"; Detail="Here is how"})
    puzzle.WorldData.IsSome |> should equal true
    let world = puzzle.WorldData.Value
    world.Blocks |> should equal [| newBlock (IntVec3 (4,5,6), 76); newBlock (IntVec3(3,2,1), 44) |]
    world.Robots |> should equal [| {Position=IntVec3(2,3,4); Direction= -IntVec3.UnitZ} |]

[<Fact>]
let ``Puzzle load actual content test`` () =
    let dir = "../../../../html/content/"

    // just try to parse the modules to make sure it's valid json
    let modules = File.ReadAllText (dir + "modules.json") |> Json.Parse
    // parse puzzles into PuzzleInfo to make sure that works okay
    let puzzles =
        File.ReadAllText (dir + "puzzles.json")
        |> Json.Parse
        |> Json.objectToSeq
        |> Seq.map snd
        |> Seq.map PuzzleInfo.Parse
        |> Seq.toArray

    ()
