module Ruthefjord.UnitTest.WorldPuzzleSerializationTest

open Xunit
open Xunit.Extensions
open FsUnit.Xunit
open System.Collections.Generic
open System.IO
open Ruthefjord
open Ruthefjord.Scene

let newRobot () = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
let newBlock (pos, block) = KeyValuePair<IntVec3, int> (pos, block)

[<Fact>]
let ``World serialization empty test`` () =
    let world = {Cubes=[||]; Robots=[||]}

    let encoded = World.encodeToString world
    let decoded = World.decodeFromString encoded
    decoded |> should equal world

    let empty = [
        """{"meta":{"version":1,"type":"world"}}""";
        """{"meta":{"version":1,"type":"world"}, "cubes":{"type":"json", "data":[]}}""";
        """{"meta":{"version":1,"type":"world"}, "cubes":{"type":"binary", "data":"", "little_endian":true}}""";
        """{"meta":{"version":1,"type":"world"}, "robots":[]}""";
    ]
    for text in empty do
        World.decodeFromString text |> should equal world

[<Fact>]
let ``World serialization simple test`` () =
    let kvp (k, v) = KeyValuePair (k,v)

    let cubes = [| IntVec3.UnitX, 1; IntVec3.UnitY, 2; IntVec3.UnitZ, 3; |] |> Array.map kvp
    let robots = [| {Position=IntVec3(2,3,4); Direction= -IntVec3.UnitZ} |]
    let world = {Cubes=cubes; Robots=robots}

    let encoded = World.encodeToString world
    let decoded = World.decodeFromString encoded
    decoded |> should equal world

[<Fact>]
let ``World serialization repeat program test`` () =
    let prog = Parser.Parse (ImperativeSimulatorTest.repeatTestProg, "prog")
    let lib = ImperativeSimulatorTest.loadBuiltIns ()
    let robot = BasicRobotSimulator (TreeMapGrid (), newRobot ())
    let states = Simulator.CollectAllStates prog robot lib None
    let cubes = states.[states.Length - 1].State.Grid |> Array.ofSeq
    let robots = [| states.[states.Length - 1].State.Robot |]
    let world = {Cubes=cubes; Robots=robots}

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
        "logging_id": "7d8e3678-12d1-4434-9bd2-9fcbd6edad35",
        "instructions": {
            "summary": "Do a thing!",
            "detail": "Here is how"
        },
        "world": {
            "cubes": {"type":"json", "data":[
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
    puzzle.LoggingId |> should equal "7d8e3678-12d1-4434-9bd2-9fcbd6edad35"
    puzzle.Instructions |> should equal (Some {Summary="Do a thing!"; Detail="Here is how"})
    puzzle.WorldData.IsSome |> should equal true
    let world = puzzle.WorldData.Value
    world.Cubes |> should equal [| newBlock (IntVec3 (4,5,6), 76); newBlock (IntVec3(3,2,1), 44) |]
    world.Robots |> should equal [| {Position=IntVec3(2,3,4); Direction= -IntVec3.UnitZ} |]

[<Fact>]
let ``Puzzle load actual content test`` () =
    let dir = "../../../../html/content/"

    // just try to parse the modules to make sure it's valid json
    let modules = File.ReadAllText (dir + "packs.json") |> Json.Parse
    // parse puzzles into PuzzleInfo to make sure that works okay
    let puzzles =
        File.ReadAllText (dir + "puzzles.json")
        |> Json.Parse
        |> Json.objectToSeq
        |> Seq.filter (fun (k,v_) -> k <> "dummy")
        |> Seq.map snd
        |> Seq.map PuzzleInfo.Parse
        |> Seq.toArray

    ()

