﻿namespace Hackcraft

open System.Collections
open System.Collections.Generic

[<StructAttribute>]
type ImmArr<'T> private(arr : 'T[]) =
    new(s : seq<'T>) = ImmArr (Array.ofSeq s)
    member x.Item with get idx = arr.[idx]

    interface IEnumerable with
        member x.GetEnumerator() = (arr :> IEnumerable<'T>).GetEnumerator() :> IEnumerator

    interface IEnumerable<'T> with
        member x.GetEnumerator() = (arr :> IEnumerable<'T>).GetEnumerator()

module ImmArr =
    let ofSeq (s: #seq<'a>) = ImmArr (s)