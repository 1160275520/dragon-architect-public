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

let referencePrograms : (string * CanonicalWorldState * CanonicalWorldState) list = [
    // procedure
    ("""
define Foo()
    Up(1)
    PlaceCube(1)

Forward(5)
repeat 10 times
    Foo()

    """, {
        Robot={Position=IntVec3.Zero; Direction=IntVec3.UnitZ};
        Grid=Map.empty;
    }, {
        Robot={Position=IntVec3 (0, 10, 5); Direction=IntVec3.UnitZ};
        Grid=[for i in 1 .. 10 -> (IntVec3 (0,i,5), 1)] |> Map.ofSeq;
    });

    // basic repeat
    (repeatTestProg, {
        Robot={Position=IntVec3.Zero; Direction=IntVec3.UnitZ};
        Grid=Map.empty;
    }, {
        Robot={Position=IntVec3 (20, 0, 20); Direction=IntVec3.UnitZ}
        Grid=[for i in 1 .. 20 -> (IntVec3 (i,0,i), 1)] |> Map.ofSeq;
    });

    // repeat with translated robot
    (repeatTestProg, {
        Robot={Position=IntVec3 (1, 1, 0); Direction=IntVec3.UnitZ};
        Grid=Map.empty;
    }, {
        Robot={Position=IntVec3 (21, 1, 20); Direction=IntVec3.UnitZ}
        Grid=[for i in 1 .. 20 -> (IntVec3 (i+1,1,i), 1)] |> Map.ofSeq;
    });

    // repeat with rotated robot
    (repeatTestProg, {
        Robot={Position=IntVec3.Zero; Direction=IntVec3.UnitX};
        Grid=Map.empty;
    }, {
        Robot={Position=IntVec3 (20, 0, -20); Direction=IntVec3.UnitX}
        Grid=[for i in 1 .. 20 -> (IntVec3 (i,0,-i), 1)] |> Map.ofSeq;
    });

    // repeat with starting grid
    (repeatTestProg, {
        Robot={Position=IntVec3.Zero; Direction=IntVec3.UnitZ};
        Grid=[(IntVec3 (0,30,0), 1)] |> Map.ofSeq;
    }, {
        Robot={Position=IntVec3 (20, 0, 20); Direction=IntVec3.UnitZ}
        Grid=List.append [(IntVec3 (0,30,0), 1)] [for i in 1 .. 20 -> (IntVec3 (i,0,i), 1)] |> Map.ofSeq;
    });

    // repeat with redundant starting grid
    (repeatTestProg, {
        Robot={Position=IntVec3.Zero; Direction=IntVec3.UnitZ};
        Grid=[for i in 1 .. 20 -> (IntVec3 (i,0,i), 1)] |> Map.ofSeq;
    }, {
        Robot={Position=IntVec3 (20, 0, 20); Direction=IntVec3.UnitZ}
        Grid=[for i in 1 .. 20 -> (IntVec3 (i,0,i), 1)] |> Map.ofSeq;
    });
]

let referenceProgramsTheory = TestUtil.TupleToTheory referencePrograms

let checkReferenceProgram (text, start:CanonicalWorldState, expected:CanonicalWorldState, grid:IGrid<_>) =
    let prog = Parser.Parse (text, "prog")
    let lib = loadBuiltIns ()
    let actual = Debugger.runToCannonicalState prog grid lib start
    actual.Grid |> should equal expected.Grid
    actual.Robot |> should equal expected.Robot

let loadSampleProgram (progName) : Ast.Imperative.Program * CanonicalWorldState =
    let text = System.IO.File.ReadAllText (sprintf "../../../../doc/%s.txt" progName)
    let program = Parser.Parse (text, progName)
    let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
    (program, {Robot=robot; Grid=Map.empty})

let samplePrograms = [
    "AARON";
    "pyramid";
    "smile";
    "castle_decomp";
    "colorful_simple_house";
    "twisty-tower"
]

let sampleProgramsSeq = TestUtil.SingleToTheory samplePrograms

[<Theory>]
[<PropertyData("referenceProgramsTheory")>]
let ``Simulator Reference Test HashTable`` (text, start, expected) =
    checkReferenceProgram (text, start, expected, HashTableGrid ())

[<Theory>]
[<PropertyData("referenceProgramsTheory")>]
let ``Simulator Reference Test TreeMap`` (text, start, expected) =
    checkReferenceProgram (text, start, expected, TreeMapGrid ())

let runAllStatesAndGetFinal prog grid lib start =
    let states = Debugger.getAllCannonicalStates prog grid lib start
    states.[states.Length - 1]

[<Theory>]
[<PropertyData("referenceProgramsTheory")>]
let ``Simulator All States Reference TreeMap`` (text, start, expected:CanonicalWorldState) =
    let prog = Parser.Parse (text, "prog")
    let lib = loadBuiltIns ()
    let actual = runAllStatesAndGetFinal prog (TreeMapGrid ()) lib start

    actual.Grid |> should equal expected.Grid
    actual.Robot |> should equal expected.Robot

[<Fact>]
let ``Simulator All States Test`` () =
    let text = """
Forward(6)
"""
    let start:CanonicalWorldState = {Robot={Position=IntVec3.Zero; Direction=IntVec3.UnitZ}; Grid=Map.empty}
    let prog = Parser.Parse (text, "prog")
    let lib = loadBuiltIns ()
    let states = Debugger.getAllCannonicalStates prog (TreeMapGrid ()) lib start

    let expected: CanonicalWorldState list = [for i in 1 .. 6 -> {Robot={Position=IntVec3 (0,0,i); Direction=IntVec3.UnitZ}; Grid=Map.empty}]
    let expected = start :: expected @ [Seq.last expected]

    states.Length |> should equal expected.Length
    states |> List.ofArray |> should equal expected

[<Theory>]
[<PropertyData("sampleProgramsSeq")>]
let ``Simulator Final State All States Equivalence On Sample Programs`` (progName:string) =
    let lib = loadBuiltIns ()
    let prog, start = loadSampleProgram progName
    let states = Debugger.getAllCannonicalStates prog (TreeMapGrid ()) lib start
    let final = Debugger.runToCannonicalState prog (TreeMapGrid ()) lib start
    states.[0].Grid.Count |> should equal 0
    states.Length |> should greaterThan 2
    Seq.last states |> should equal final

[<Fact>]
let ``OLD Simulator simple parsed`` () =
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

[<Fact>]
let ``OLD Simulator repeat`` () =
    let prog = Parser.Parse (repeatTestProg, "prog")
    let lib = loadBuiltIns ()
    let robot = BasicImperativeRobotSimulator (newRobot (), GridStateTracker [])
    let states = (Simulator.SimulateWithRobot prog lib robot).States

    states.Length |> should equal 82
    (states.[states.Length - 1].Data.WorldState :?> BasicWorldState).Grid.Length |> should equal 20

    let blocks = HashSet([for i in 1 .. 20 -> IntVec3 (i,0,i)])
    blocks.SetEquals ((states.[states.Length - 1].Data.WorldState :?> BasicWorldState).Grid |> Seq.map (fun kvp -> kvp.Key)) |> should equal true
