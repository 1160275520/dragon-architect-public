module Hackcraft.UnitTest.SerializationTest

open Xunit
open Xunit.Extensions
open FsUnit.Xunit
open System.IO

module J = Hackcraft.Json
module S = Hackcraft.Serialization

let runSerializeFromFileTest filename =
    let json = File.ReadAllText filename |> J.Parse
    S.JsonOfProgram (S.ProgramOfJson json) |> should equal json

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
