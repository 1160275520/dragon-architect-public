/// Implementation of the world grid, used by simulation to compute game state.
/// See Ast.fs
namespace Ruthefjord

open System
open System.Collections.Generic

type Block = int

type IGrid =
    // duplicate keys are ignored
    abstract member AddObject : idx:IntVec3 -> block:Block -> unit
    // duplicate keys replaces old value
    abstract member OverwriteObject : idx:IntVec3 -> block:Block -> unit
    abstract member RemoveObject : idx:IntVec3 -> unit
    abstract member GetObject : idx:IntVec3 -> Block option

type GridStateTracker(init: KeyValuePair<IntVec3, Block> seq) =

    let MAX_BLOCKS = 8000

    let mutable cells = Dictionary()
    do
        for kvp in init do cells.Add (kvp.Key, kvp.Value)

    static member Empty () = GridStateTracker []

    member x.CurrentState =
        ImmArr.ofSeq cells

    interface IGrid with
        member x.AddObject idx block = if cells.Count < MAX_BLOCKS && not (cells.ContainsKey idx) then cells.Add (idx, block)
        member x.OverwriteObject idx block = cells.[idx] <- block
        member x.RemoveObject idx = cells.Remove idx |> ignore
        member x.GetObject idx =
            let v = ref 0
            if cells.TryGetValue (idx, v) then Some !v else None
