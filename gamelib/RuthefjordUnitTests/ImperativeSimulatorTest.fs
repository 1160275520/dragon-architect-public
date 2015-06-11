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
    lib.ContainsKey "Up" |> should equal true
    lib.ContainsKey "PlaceCube" |> should equal true

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

let checkReferenceProgram (runSim:DebuggerInitialData -> CanonicalWorldState) (text, start:CanonicalWorldState, expected:CanonicalWorldState) =
    let prog = Parser.Parse (text, "prog")
    let lib = loadBuiltIns ()
    let actual = runSim {Program=prog; BuiltIns=lib; State=start}
    actual.Grid |> should equal expected.Grid
    actual.Robot |> should equal expected.Robot

let loadSampleProgram progName : DebuggerInitialData =
    let text = System.IO.File.ReadAllText (sprintf "../../../../doc/%s.txt" progName)
    let program = Parser.Parse (text, progName)
    let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
    {Program=program; BuiltIns=loadBuiltIns(); State={Robot=robot; Grid=Map.empty}}

let samplePrograms = [
    "empty";
    "line";
    "AARON";
    "pyramid";
    "smile";
    "castle_decomp";
    "castle_updated";
    "colorful_simple_house";
    "twisty-tower"
]

let sampleProgramsTheory = TestUtil.SingleToTheory samplePrograms

[<Theory>]
[<PropertyData("referenceProgramsTheory")>]
let ``Reference Test HashTable`` (text, start, expected) =
    (text, start, expected) |> checkReferenceProgram (fun init ->
        Debugger.runToCannonicalState (HashTableGrid ()) init
    )

[<Theory>]
[<PropertyData("referenceProgramsTheory")>]
let ``Reference Test TreeMap`` (text, start, expected) =
    (text, start, expected) |> checkReferenceProgram (fun init ->
        Debugger.runToCannonicalState (TreeMapGrid ()) init
    )

[<Theory>]
[<PropertyData("referenceProgramsTheory")>]
let ``All States Reference TreeMap`` (text, start, expected:CanonicalWorldState) =
    (text, start, expected) |> checkReferenceProgram (fun init ->
        MyArray.last (Debugger.getAllCannonicalStates (TreeMapGrid ()) init)
    )

[<Fact>]
let ``All States Test`` () =
    let text = """
Forward(6)
"""
    let init = {
        Program = Parser.Parse (text, "prog");
        BuiltIns = loadBuiltIns ();
        State = {Robot={Position=IntVec3.Zero; Direction=IntVec3.UnitZ}; Grid=Map.empty};
    }
    let states = Debugger.getAllCannonicalStates (TreeMapGrid ()) init

    let expected: CanonicalWorldState list = [for i in 1 .. 6 -> {Robot={Position=IntVec3 (0,0,i); Direction=IntVec3.UnitZ}; Grid=Map.empty}]
    let expected = init.State :: expected @ [Seq.last expected]

    states.Length |> should equal expected.Length
    states |> List.ofArray |> should equal expected

[<Theory>]
[<PropertyData("sampleProgramsTheory")>]
let ``Final State All States Equivalence On Sample Programs`` (progName:string) =
    let init = loadSampleProgram progName
    let states = Debugger.getAllCannonicalStates (TreeMapGrid ()) init
    let final = Debugger.runToCannonicalState (TreeMapGrid ()) init
    states.[0].Grid.Count |> should equal 0
    states.Length |> should greaterThanOrEqualTo 2
    Seq.last states |> should equal final

[<Fact>]
let ``Equivalent castle programs`` () =
    let lib = loadBuiltIns ()
    let init1 = loadSampleProgram "castle_decomp"
    let init2 = loadSampleProgram "castle_updated"
    let final1 = Debugger.runToCannonicalState (HashTableGrid ()) init1
    let final2 = Debugger.runToCannonicalState (HashTableGrid ()) init2
    final1 |> should equal final2
