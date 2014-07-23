/// Implementation of the world grid, used by simulation to compute game state.
/// See Ast.fs
namespace Hackcraft

open System
open System.Collections.Generic
open System.IO

type Block = int

type IGrid =
    // duplicate keys are ignored
    abstract member AddObject : idx:IntVec3 -> block:Block -> unit
    // duplicate keys replaces old value
    abstract member OverwriteObject : idx:IntVec3 -> block:Block -> unit
    abstract member RemoveObject : idx:IntVec3 -> unit

type GridStateTracker(init: KeyValuePair<IntVec3, Block> seq) =
    let mutable cells = Dictionary()
    do
        for kvp in init do cells.Add (kvp.Key, kvp.Value)

    static member Empty () = GridStateTracker []

    member x.CurrentState =
        ImmArr.ofSeq cells

    interface IGrid with
        member x.AddObject idx block = if not (cells.ContainsKey idx) then cells.Add (idx, block)
        member x.OverwriteObject idx block = cells.[idx] <- block
        member x.RemoveObject idx = cells.Remove idx |> ignore

module Grid =
    type GridData = KeyValuePair<IntVec3, Block> []
    
    let private ENCODE_VERSION = 1
    let private ENDIAN_SENTINEL = 0xfffes
    let private encoding = System.Text.Encoding.UTF8

    let private jload obj key fn = fn (Json.getField obj key)

    /// Encode a grid to a stream.
    let encodeToString (grid: GridData) =
        // create a big binary array of the data
        let data : int[] = Array.zeroCreate (4 * grid.Length)
        for i = 0 to grid.Length - 1 do
            let offset = 4 * i
            let item = grid.[i]
            data.[offset + 0] <- item.Key.X
            data.[offset + 1] <- item.Key.Y
            data.[offset + 2] <- item.Key.Z
            data.[offset + 3] <- item.Value

        // TODO gzip it

        // HACK assume little endian because this isn't changing systems atm
        // well okay binary encode a test int so we can at least detect it later
        let sentinel = [| ENDIAN_SENTINEL |]

        let toHexStr x = (Util.arrayToBytes >> Convert.ToBase64String >> Json.String) x

        // then base64 encode that
        Json.JsonValue.ObjectOf [
            "version", Json.Int ENCODE_VERSION;
            "blocks", toHexStr data;
            "sentinel", toHexStr sentinel;
        ] |> Json.Serialize

    let encodeToStream (grid: GridData) =
        let bytes = encodeToString grid |> encoding.GetBytes
        new MemoryStream(bytes) :> Stream

    /// Decode a grid from a stream. Closes the stream when finished.
    let decodeFromString str : GridData =
        let json = Json.Parse str

        let fromHexStr x = (Json.asString >> Convert.FromBase64String >> Util.bytesToArray) x

        let version = jload json "version" Json.asInt
        let data: int[] = jload json "blocks" fromHexStr
        let sentinel: int16[] = jload json "sentinel" fromHexStr

        if version <> ENCODE_VERSION then invalidArg "stream" "invalid version!"
        if sentinel.[0] <> ENDIAN_SENTINEL then invalidArg "stream" "endianess of stream is different!"
        // this is really more like an assert but ah well
        if data.Length % 4 <> 0 then invalidArg "stream" "data does not have correct number of elements"

        Array.init (data.Length / 4) (fun i ->
            let offset = 4 * i
            let cell = IntVec3 (data.[offset + 0], data.[offset + 1], data.[offset + 2])
            let block = data.[offset + 3]
            KeyValuePair (cell, block)
        )

    let decodeFromStream (stream:Stream) : GridData =
        let s =
            use reader = new StreamReader(stream, encoding)
            reader.ReadToEnd ()
        decodeFromString s
