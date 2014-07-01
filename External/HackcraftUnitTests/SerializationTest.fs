module Hackcraft.UnitTest.SerializationTest

open Xunit
open Xunit.Extensions
open FsUnit.Xunit
open System.IO

module J = Hackcraft.Json
module S = Hackcraft.Serialization
module A = Hackcraft.Ast.Imperative

let runSerializeFromFileTest filename =
    let json = File.ReadAllText filename |> J.Parse
    S.JsonOfProgram (S.ProgramOfJson json) |> should equal json

let testProgram = """
{
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
"""

[<Fact>]
let ``Serialization test_parse`` () =
    let json = J.Parse testProgram
    let prog = S.ProgramOfJson json
    prog.Procedures.Count |> should equal 3
    prog.Procedures.ContainsKey "MAIN" |> should equal true
    prog.Procedures.ContainsKey "F1" |> should equal true
    prog.Procedures.ContainsKey "F2" |> should equal true

    let main = prog.Procedures.["MAIN"]
    main.Arity |> should equal 0
    main.Body.Length |> should equal 2

    S.JsonOfProgram prog |> should equal json

[<Fact>]
let ``Serialization level_call_01`` () =
    runSerializeFromFileTest "../../../../Assets/Resources/level_call_01.txt"

[<Fact>]
let ``Serialization level_repeat_01`` () =
    runSerializeFromFileTest "../../../../Assets/Resources/level_repeat_01.txt"

[<Fact>]
let ``Serialization TLMovement2D`` () =
    runSerializeFromFileTest "../../../../Assets/Resources/TLMovement2D.txt"

[<Fact>]
let ``Serialization TLMovement3D`` () =
    runSerializeFromFileTest "../../../../Assets/Resources/TLMovement3D.txt"

[<Fact>]
let ``Serialization TLMovementArgs`` () =
    runSerializeFromFileTest "../../../../Assets/Resources/TLMovementArgs.txt"

[<Fact>]
let ``Serialization TLPlacement`` () =
    runSerializeFromFileTest "../../../../Assets/Resources/TLPlacement.txt"
