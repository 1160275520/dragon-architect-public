module Ruthefjord.UnitTest.ProgramParseTest

open Xunit
open Xunit.Extensions
open FsUnit.Xunit
open System.IO

module J = Ruthefjord.Json
module P = Ruthefjord.Parser
module S = Ruthefjord.Serialization
module A = Ruthefjord.Ast.Imperative

let runParseFromFileTest filename =
    let text = File.ReadAllText filename
    let prog = P.Parse (text, filename)
    S.ProgramOfJson (S.JsonOfProgram prog) |> should equal prog

let stageParsingTests = [
    "stdlib.imperative.txt";
    "puzzle/tutorial.movement2d.txt";
    "puzzle/tutorial.arguments.txt";
    "puzzle/tutorial.placement.txt";
    "puzzle/tutorial.speed_slider.txt";
    "puzzle/up.what_is_up.txt";
    "puzzle/remove.remove_blocks.txt";
    "puzzle/repeat.repeat_fixedProgram.txt";
    "puzzle/repeat.repeat_fixedLoops.txt";
]
let stageParsingTestsSeq = stageParsingTests |> Seq.map (fun s -> [|s :> obj|])

[<Theory>]
[<PropertyData("stageParsingTestsSeq")>]
let ``Puzzle code parsing/serialization`` (filename:string) =
    runParseFromFileTest ("../../../../unity/Assets/Resources/" + filename)

