module Hackcraft.UnitTest.Test

open Xunit
open FsUnit.Xunit

[<Fact>]
let ``sample test`` () =
    1 |> should equal 1
