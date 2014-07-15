module Hackcraft.UnitTest.SerializationTest

open Xunit
open Xunit.Extensions
open FsUnit.Xunit
open System.IO

module J = Hackcraft.Json
module S = Hackcraft.Serialization
module A = Hackcraft.Ast.Imperative


let emptyTestProgram = """
{
"meta":{"language":"imperative_v01","version":{"major":0, "minor":1}},
"procedures":{}
}
"""

[<Fact>]
let ``Serialization empty test`` () =
    let json = J.Parse emptyTestProgram
    let prog = S.ProgramOfJson json
    prog.Procedures.Count |> should equal 0

    S.ProgramOfJson json |> should equal prog
    S.JsonOfProgram prog |> should equal json

let nopTestProgram = """
{
"meta":{"language":"imperative_v01","version":{"major":0, "minor":1}},
"procedures":{
    "MAIN":{"arity":0,"body":[]}
}
}
"""

[<Fact>]
let ``Serialization nop test`` () =
    let json = J.Parse nopTestProgram
    let prog = S.ProgramOfJson json
    prog.Procedures.Count |> should equal 1
    prog.Procedures.ContainsKey "MAIN" |> should equal true

    let main = prog.Procedures.["MAIN"]
    main.Arity |> should equal 0
    main.Body.Length |> should equal 0

    S.ProgramOfJson json |> should equal prog
    S.JsonOfProgram prog |> should equal json

let simpleTestProgram = """
{
"meta":{"language":"imperative_v01","version":{"major":0, "minor":1}},
"procedures":{
    "F1":{"arity":0,"body":[
        {"args":[{"type":"literal","value":"1"}],"meta":{"id":25},"proc":"Up","type":"call"},
        {"args":[{"type":"literal","value":"#5cab32"}],"meta":{"id":26},"proc":"PlaceBlock","type":"call"}
    ]},
    "F2":{"arity":0,"body":[]},
    "MAIN":{"arity":0,"body":[
        {"args":[{"type":"literal","value":"5"}],"meta":{"id":21},"proc":"Forward","type":"call"},
        {"numtimes":{"type":"literal","value":"10"},"meta":{"id":24},"stmt":
            {"meta":{"id":27},"body":[
                {"args":[],"meta":{"id":22},"proc":"F1","type":"call"},
                {"args":[],"meta":{"id":23},"proc":"Left","type":"call"}
            ],"type":"block"},"type":"repeat"}]}
}
}
"""

[<Fact>]
let ``Serialization simple test`` () =
    let json = J.Parse simpleTestProgram
    let prog = S.ProgramOfJson json
    prog.Procedures.Count |> should equal 3
    prog.Procedures.ContainsKey "MAIN" |> should equal true
    prog.Procedures.ContainsKey "F1" |> should equal true
    prog.Procedures.ContainsKey "F2" |> should equal true

    let main = prog.Procedures.["MAIN"]
    main.Arity |> should equal 0
    main.Body.Length |> should equal 2

    A.NewCall 21 "Forward" [A.Literal "5"] |> should equal main.Body.[0]
    main.Body.[0] |> should equal main.Body.[0]

    S.ProgramOfJson json |> should equal prog
    S.JsonOfProgram prog |> should equal json

let moduleTestProgram = """
{
"meta":{"language":"imperative_v01","version":{"major":0, "minor":1}},
"modules":{
    "foo":{
        "procedures":{
            "F1":{"arity":0,"body":[
                {"args":[{"type":"literal","value":"1"}],"meta":{"id":25},"proc":"Up","type":"call"},
                {"args":[{"type":"literal","value":"#5cab32"}],"meta":{"id":26},"proc":"PlaceBlock","type":"call"}
            ]},
            "F2":{"arity":0,"body":[]},
            "MAIN":{"arity":0,"body":[
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
    "F1":{"arity":0,"body":[
        {"args":[{"type":"literal","value":"1"}],"meta":{"id":25},"proc":"Up","type":"call"},
        {"args":[{"type":"literal","value":"#5cab32"}],"meta":{"id":26},"proc":"PlaceBlock","type":"call"}
    ]},
    "F2":{"arity":0,"body":[]},
    "MAIN":{"arity":0,"body":[
        {"args":[{"type":"literal","value":"5"}],"meta":{"id":21},"proc":"Forward","type":"call"},
        {"numtimes":{"type":"literal","value":"10"},"meta":{"id":24},"stmt":
            {"meta":{"id":27},"body":[
                {"args":[],"meta":{"id":22},"proc":"F1","type":"call"},
                {"args":[],"meta":{"id":23},"proc":"Left","type":"call"}
            ],"type":"block"},"type":"repeat"}]}
}
}
"""

[<Fact>]
let ``Serialization module test`` () =
    let json = J.Parse moduleTestProgram
    let prog = S.ProgramOfJson json
    prog.Modules.Count |> should equal 1
    prog.Modules.ContainsKey "foo" |> should equal true
    prog.Procedures.ContainsKey "F1" |> should equal true
    prog.Procedures.ContainsKey "F2" |> should equal true

    let foo = prog.Modules.["foo"]
    let main = foo.Procedures.["MAIN"]
    main.Arity |> should equal 0
    main.Body.Length |> should equal 2

    A.NewCall 21 "Forward" [A.Literal "5"] |> should equal main.Body.[0]
    main.Body.[0] |> should equal main.Body.[0]

    S.ProgramOfJson json |> should equal prog
    S.JsonOfProgram prog |> should equal json

let runSerializeFromFileTest filename =
    let json = File.ReadAllText filename |> J.Parse
    let prog = S.ProgramOfJson json
    S.ProgramOfJson (S.JsonOfProgram prog) |> should equal prog

let stageSerializationTests = [
    "level_call_01.txt";
    "level_repeat_01.txt";
    "TLMovement2D.txt";
    "TLMovement3D.txt";
    "TLMovementArgs.txt";
    "TLPlacement.txt";
]
let stageSerializationTestsSeq = stageSerializationTests |> Seq.map (fun s -> [|s :> obj|])

[<Theory>]
[<PropertyData("stageSerializationTestsSeq")>]
let ``Serialization stage test`` (filename:string) =
    runSerializeFromFileTest ("../../../../unity/Assets/Resources/" + filename)
