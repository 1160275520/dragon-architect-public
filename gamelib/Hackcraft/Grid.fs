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
    

    let distinct (grid: GridData) =
        grid |> Seq.distinctBy (fun kvp -> kvp.Key) |> Seq.toArray


    let private ENCODE_VERSION = 1
    let private ENDIAN_SENTINEL = 0xfffffffe
    let private encoding = System.Text.Encoding.UTF8

    let private jload obj key fn = fn (Json.getField obj key)

    /// Encode a grid to a stream.
    let encodeToString (grid: GridData) =
        // create a big binary array of the blocks
        let blocks : int[] = Array.zeroCreate (4 * grid.Length)
        for i = 0 to grid.Length - 1 do
            let offset = 4 * i
            let item = grid.[i]
            blocks.[offset + 0] <- item.Key.X
            blocks.[offset + 1] <- item.Key.Y
            blocks.[offset + 2] <- item.Key.Z
            blocks.[offset + 3] <- item.Value

        // TODO gzip it

        // HACK assume little endian because this isn't changing systems atm
        // well okay binary encode a test int so we can at least detect it later
        let sentinel = [| ENDIAN_SENTINEL |]

        let toHexStr x = x |> Util.arrayToBytes |> Convert.ToBase64String |> Json.String

        // then base64 encode that
        Json.JsonValue.ObjectOf [
            "meta", Json.JsonValue.ObjectOf
                [
                    "version", Json.Int ENCODE_VERSION;
                    "sentinel", toHexStr sentinel;
                    "gzip", Json.Bool false;
                ];
            "blocks", toHexStr blocks;
        ] |> Json.Serialize

    let encodeToStream (grid: GridData) =
        let bytes = encodeToString grid |> encoding.GetBytes
        new MemoryStream(bytes) :> Stream

    /// Decode a grid from a stream. Closes the stream when finished.
    let decodeFromString str : GridData =
        let json = Json.Parse str

        let fromHexStr x = x |> Json.asString |> Convert.FromBase64String |> Util.bytesToArray

        let meta = json.GetField "meta"
        let version = jload meta "version" Json.asInt
        let sentinel: int[] = jload meta "sentinel" fromHexStr
        let blocks: int[] = jload json "blocks" fromHexStr

        if version <> ENCODE_VERSION then invalidArg "stream" "invalid version!"
        if sentinel.[0] <> ENDIAN_SENTINEL then invalidArg "stream" "endianess of stream is different!"
        // this is really more like an assert but ah well
        if blocks.Length % 4 <> 0 then invalidArg "stream" "blocks does not have correct number of elements"

        Array.init (blocks.Length / 4) (fun i ->
            let offset = 4 * i
            let cell = IntVec3 (blocks.[offset + 0], blocks.[offset + 1], blocks.[offset + 2])
            let block = blocks.[offset + 3]
            KeyValuePair (cell, block)
        )

    let decodeFromStream (stream:Stream) : GridData =
        let s =
            use reader = new StreamReader(stream, encoding)
            reader.ReadToEnd ()
        decodeFromString s
