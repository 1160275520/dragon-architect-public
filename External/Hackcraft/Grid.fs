namespace Hackcraft

open System.Collections.Generic

type IGrid =
    abstract member AddObject : idx:IntVec3 -> unit
    abstract member RemoveObject : idx:IntVec3 -> unit


type GridStateTracker(init:IntVec3 seq) =
    let mutable cells = HashSet(init)

    member x.CurrentState =
        ImmArr.ofSeq cells

    interface IGrid with
        member x.AddObject idx = cells.Add(idx) |> ignore
        member x.RemoveObject idx = ignore (cells.Remove idx)
