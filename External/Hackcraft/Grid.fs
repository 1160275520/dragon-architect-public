namespace Hackcraft

open System.Collections.Generic

type IGrid =
    abstract member AddObject : idx:IntVec3 -> unit
    abstract member RemoveObject : idx:IntVec3 -> unit


type GridStateTracker() =
    let mutable cells = Dictionary()

    member x.CurrentState =
        ImmArr.ofSeq cells.Keys 

    interface IGrid with
        member x.AddObject idx = cells.[idx] <- ()
        member x.RemoveObject idx = ignore (cells.Remove idx)
