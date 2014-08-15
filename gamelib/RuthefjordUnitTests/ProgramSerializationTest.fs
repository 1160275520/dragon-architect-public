module Ruthefjord.UnitTest.ProgramSerializationTest

open Xunit
open Xunit.Extensions
open FsUnit.Xunit
open System.IO

module J = Ruthefjord.Json
module S = Ruthefjord.Serialization
module A = Ruthefjord.Ast.Imperative


let emptyTestProgram = """
{
"meta":{"language":"imperative_v02","version":{"major":1, "minor":0}},
"body":[]
}
"""

[<Fact>]
let ``Serialization empty test`` () =
    let json = J.Parse emptyTestProgram
    let prog = S.ProgramOfJson json
    S.ProgramOfJson (S.JsonOfProgram prog) |> should equal prog

let simpleTestProgram = """
{
"meta":{"language":"imperative_v02","version":{"major":1, "minor":0}},
"body":[
    {"type":"define", "name":"F1", "params":[],"body":[
        {"args":[{"type":"literal","value":"1"}],"meta":{"id":25},"ident":"Up","type":"call"},
        {"args":[{"type":"literal","value":1}],"meta":{"id":26},"ident":"PlaceBlock","type":"call"}
    ]},
    {"type":"define", "name":"F2", "params":[],"body":[]},
    {"args":[{"type":"literal","value":"5"}],"meta":{"id":21},"ident":"Forward","type":"call"},
    {"numtimes":{"type":"literal","value":"10"},"meta":{"id":24},"body":[
        {"args":[],"meta":{"id":22},"ident":"F1","type":"call"},
        {"args":[],"meta":{"id":23},"ident":"Left","type":"call"}
    ],"type":"repeat"}
]}
"""

[<Fact>]
let ``Serialization simple test`` () =
    let json = J.Parse simpleTestProgram
    let prog = S.ProgramOfJson json
    S.ProgramOfJson (S.JsonOfProgram prog) |> should equal prog
