/// Miscellaneous collection types and utility functions.
namespace Ruthefjord

open System.Collections
open System.Collections.Generic

/// Wrapper for an array that prevents modification, i.e., an immutable array.
type ImmArr<[<EqualityConditionalOn>] 'T> private(arr : 'T[]) =
    new(s : seq<'T>) = ImmArr (Array.ofSeq s)
    member x.Item with get idx = arr.[idx]
    member x.Length = arr.Length

    member private x._Array = arr

    member x.Map f = ImmArr (Array.map f arr)

    member x.ToArray () = Array.copy x._Array

    override x.Equals (other:obj) : bool =
        match other with
        | :? ImmArr<'T> as y -> Unchecked.equals x._Array y._Array
        | _ -> false

    override x.GetHashCode () = Unchecked.hash x._Array

    interface IEnumerable with
        member x.GetEnumerator() = (arr :> IEnumerable<'T>).GetEnumerator() :> IEnumerator

    interface IEnumerable<'T> with
        member x.GetEnumerator() = (arr :> IEnumerable<'T>).GetEnumerator()

module ImmArr =
    let ofSeq (s: #seq<'a>) = ImmArr (s)
    let ofArray (s: 'a[]) = ImmArr (Array.copy s)
    let empty<'a> : ImmArr<'a> = ofSeq []
    let map f (x:ImmArr<'a>) = x.Map f
    let toArray (x:ImmArr<'a>) = x.ToArray ()

module MyArray =
    let last (arr:'a[]) =
        arr.[arr.Length - 1]

    let repeat<'a> nTimes (arr: 'a[]) =
        let lst = System.Collections.Generic.List ()
        for i = 1 to nTimes do
            lst.AddRange arr
        lst.ToArray ()

module MyList =
    let rec skip n (list:'a list) =
        if n <= 0 then list else skip (n - 1) list.Tail

module MyMap =
    let keys (map:Map<'a,'b>) =
        map |> Seq.map (fun kvp -> kvp.Key)

    /// combine two maps, where any conflicting keys are overriden by the second map
    let merge m1 m2 =
        m2 |> Map.fold (fun acc k v -> Map.add k v acc) m1
