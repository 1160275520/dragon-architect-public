module Ruthefjord.UnitTest.ProgramParseTest

open Xunit
open Xunit.Extensions
open FsUnit.Xunit
open System.IO
open System
open Ruthefjord
module J = Ruthefjord.Json
module P = Ruthefjord.Parser
module S = Ruthefjord.Serialization
module A = Ruthefjord.Ast.Imperative
module SIM = Ruthefjord.Simulator

let runParseFromFileTest filename =
    let text = File.ReadAllText filename
    let prog = P.Parse (text, filename)
    S.ProgramOfJson (S.JsonOfProgram prog) |> should equal prog

let runPrettyPrintFromFileTest filename =
    let text = File.ReadAllText filename
    let prog = P.Parse (text, filename)
    use w = new StringWriter ()
    P.PrettyPrintTo w prog
    P.Parse (w.ToString (), filename) |> should equal prog

let stageParsingTests = [
    "module/stdlib.txt";
    "puzzle/tutorial.movement2d.txt";
    "puzzle/tutorial.arguments.txt";
    "puzzle/tutorial.placement.txt";
    "puzzle/repeat.speed_slider.txt";
    "puzzle/up.what_is_up.txt";
    "puzzle/remove.remove_cubes.txt";
    "puzzle/repeat.repeat_fixedProgram.txt";
    "puzzle/repeat.repeat_fixedLoops.txt";
]
let stageParsingTestsSeq = stageParsingTests |> TestUtil.SingleToTheory

[<Theory>]
[<PropertyData("stageParsingTestsSeq")>]
let ``Puzzle code parsing/serialization`` (filename:string) =
    runParseFromFileTest ("../../../../unity/Assets/Resources/" + filename)

[<Theory>]
[<PropertyData("stageParsingTestsSeq")>]
let ``Puzzle code pretty printing`` (filename:string) =
    runPrettyPrintFromFileTest ("../../../../unity/Assets/Resources/" + filename)
