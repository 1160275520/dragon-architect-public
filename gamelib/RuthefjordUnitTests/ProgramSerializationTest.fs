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
    {"type":"proc", "name":"F1", "params":[],"body":[
        {"args":[{"type":"literal","value":"1"}],"meta":{"id":25},"ident":"Up","type":"call"},
        {"args":[{"type":"literal","value":1}],"meta":{"id":26},"ident":"PlaceCube","type":"call"}
    ]},
    {"type":"proc", "name":"F2", "params":[],"body":[]},
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

[<Fact>]
let ``find statement with id`` () =
    let json = J.Parse simpleTestProgram
    let prog = S.ProgramOfJson json

    let stmt21 = A.tryFindStatement (fun s -> s.Meta.Id = 21) prog
    stmt21.IsSome |> should equal true
    stmt21.Value |> should equal (A.findStatementWithId 21 prog)
    stmt21.Value.Meta.Id |> should equal 21
    (match stmt21.Value.Stmt with A.Execute _ -> true | _ -> false) |> should equal true

    let stmt23 = A.tryFindStatement (fun s -> s.Meta.Id = 23) prog
    stmt23.IsSome |> should equal true
    stmt23.Value |> should equal (A.findStatementWithId 23 prog)
    stmt23.Value.Meta.Id |> should equal 23
    (match stmt23.Value.Stmt with A.Execute _ -> true | _ -> false) |> should equal true
