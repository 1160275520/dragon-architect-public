namespace Ruthefjord.UnitTest

open Ruthefjord

// use a class, we want to abuse function overloading
[<AbstractClass; Sealed>]
type TestUtil private () =
    static member SingleToTheory seq =
        seq |> Seq.map (fun x -> [|x :> obj|])
    static member TupleToTheory seq =
        seq |> Seq.map (fun (a,b) -> [|a :> obj; b :> obj|])
    static member TupleToTheory seq =
        seq |> Seq.map (fun (a,b,c) -> [|a :> obj; b :> obj; c :> obj|])
    static member TupleToTheory seq =
        seq |> Seq.map (fun (a,b,c,d) -> [|a :> obj; b :> obj; c :> obj; d :> obj|])
