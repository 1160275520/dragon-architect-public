module Ruthefjord.UnitTest.OptimizeTest

open Xunit
open Xunit.Extensions
open FsUnit.Xunit
open System.Collections.Generic
open System.IO
open Ruthefjord

[<Fact>]
let ``command sanity check`` () =
    let c1: Robot.Command2 = {Name="foo"; Args=["bar" :> obj]}
    let c2: Robot.Command2 = {Name="foo"; Args=["bar" :> obj]}

    c1 |> should equal c2

[<Fact>]
let ``command sanity check 2`` () =
    let filename = "../../../../doc/castle_decomp.txt"
    let stdlibPath = "../../../../unity/Assets/Resources/module/stdlib.txt"
    let importedModules = Simulator.import (Parser.Parse (System.IO.File.ReadAllText stdlibPath, "stdlib"))
    let text = System.IO.File.ReadAllText filename
    let program = Parser.Parse (text, filename)

    let r1 = Simulator.SimulateWithoutRobot program importedModules
    let r2 = Simulator.SimulateWithoutRobot program importedModules

    r1 |> should equal r2

[<Fact>]
let ``optimize correctness`` () =
    let filename = "../../../../doc/castle_decomp.txt"
    let stdlibPath = "../../../../unity/Assets/Resources/module/stdlib.txt"
    let importedModules = Simulator.import (Parser.Parse (System.IO.File.ReadAllText stdlibPath, "stdlib"))
    let text = System.IO.File.ReadAllText filename
    let program = Parser.Parse (text, filename)

    let r1 = List.ofArray <| Simulator.SimulateWithoutRobotOptimized program importedModules
    let r2 = List.ofArray <| Simulator.SimulateWithoutRobot program importedModules

    //let r1 = r1 |> Seq.skip 40 |> Seq.take 3 |> List.ofSeq
    //let r2 = r2 |> Seq.skip 40 |> Seq.take 3 |> List.ofSeq

    r1 |> should equal r2
