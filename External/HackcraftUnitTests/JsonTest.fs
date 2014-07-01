module Hackcraft.UnitTest.JsonTest

open Xunit
open Xunit.Extensions
open FsUnit.Xunit

module J = Hackcraft.Json

// basic parsing tests

let tupleSeqToPropertyList seq =
    seq |> Seq.map (fun (x,y) -> [|x :> obj; y :> obj|])

let trivialParseTests = [
    ("[]", J.Array Array.empty);
    ("{}", J.Object Map.empty);
    ("\"\"", J.String "");
    ("4", J.Int 4);
]
let trivialParseTestsSeq = tupleSeqToPropertyList trivialParseTests

[<Theory>]
[<PropertyData("trivialParseTestsSeq")>]
let ``JSON trivial parse test`` string (jobj: J.JsonValue) =
    J.Parse string |> should equal jobj

let simpleParseTests = [
    ("23", J.Int 23);
    ("4", J.Int 4);
    ("""[2, "pancake", {}, []]""", J.Array [| J.Int 2; J.String "pancake"; J.Object Map.empty; J.Array Array.empty |]);
    ("""{"a":2, "b":"pancake", "c":{}, "d":[]}""", J.Object (Map.ofSeq ["a", J.Int 2; "b", J.String "pancake"; "c", J.Object Map.empty; "d", J.Array Array.empty]));
]
let simpleParseTestsSeq = tupleSeqToPropertyList simpleParseTests

[<Theory>]
[<PropertyData("simpleParseTestsSeq")>]
let ``JSON simple parse test`` string (jobj: J.JsonValue) =
    J.Parse string |> should equal jobj

// basic parsing error tests

[<Fact>]
let ``JSON illegal string test`` () =
    (fun () -> J.Parse "\"asdf" |> ignore) |> should throw typeof<Hackcraft.SyntaxError>

[<Fact>]
let ``JSON trailing text test`` () =
    (fun () -> J.Parse "2f" |> ignore) |> should throw typeof<Hackcraft.SyntaxError>

[<Fact>]
let ``JSON illegal object test`` () =
    (fun () -> J.Parse "{whoops:2}" |> ignore) |> should throw typeof<Hackcraft.SyntaxError>

// formatting

[<Theory>]
[<PropertyData("trivialParseTestsSeq")>]
let ``JSON trivial format test`` string (jobj: J.JsonValue) =
    J.Format jobj |> should equal string

[<Theory>]
[<PropertyData("simpleParseTestsSeq")>]
let ``JSON simple format test`` string (jobj: J.JsonValue) =
    J.Format jobj |> should equal string

// from object tests

let fromObjectTests = [
    (2 :> obj, J.Int 2);
    ("happy" :> obj, J.String "happy");
    ([|3; 4; 5|] :> obj, J.Array [| J.Int 3; J.Int 4; J.Int 5 |]);
    ([] :> obj, J.Array Array.empty);
    (["asdf" :> obj; 5 :> obj] :> obj, J.Array [| J.String "asdf"; J.Int 5 |]);
    (Map.empty :> obj, J.Object Map.empty);
    (Map.ofSeq [| "a", 2; "b", 3 |] :> obj, J.Object (Map.ofSeq [| "a", J.Int 2; "b", J.Int 3 |]));
]
let fromObjectTestsSeq = tupleSeqToPropertyList fromObjectTests

[<Theory>]
[<PropertyData("fromObjectTestsSeq")>]
let ``JSON fromObject test`` value (jobj: J.JsonValue) =
    J.fromObject value |> should equal jobj

