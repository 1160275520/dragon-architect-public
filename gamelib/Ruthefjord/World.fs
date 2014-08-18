namespace Ruthefjord

open System
open System.Collections.Generic
open System.IO
module J = Ruthefjord.Json

[<RequireQualifiedAccess>]
type EditMode =
| Workshop
| Persistent
with
    static member FromJson j =
        match J.asString j with
        | "workshop" -> Workshop
        | "persistent" -> Persistent
        | s -> raise (J.TypeMismatchException (j, "EditMode", sprintf "'%s' is not a valid edit mode" s, null))

    override x.ToString () =
        match x with
        | Workshop -> "workshop"
        | Persistent -> "persistent"

    member x.ToJson () = J.String (x.ToString ())

[<RequireQualifiedAccess>]
type RunState =
| Stopped
| Executing
| Paused
| Finished
with
    static member FromJson j =
        match J.asString j with
        | "stopped" -> Stopped
        | "executing" -> Executing
        | "paused" -> Paused
        | "finished" -> Finished
        | s -> raise (J.TypeMismatchException (j, "RunState", sprintf "'%s' is not a valid run state" s, null))

    override x.ToString () =
        match x with
        | Stopped -> "stopped"
        | Executing -> "executing"
        | Paused -> "paused"
        | Finished -> "finished"

    member x.ToJson () = J.String (x.ToString ())

type BlockData = KeyValuePair<IntVec3, Block> []

type WorldData = {
    Blocks: BlockData;
    Robots: BasicRobot[];
}

type StateData = {
    CurrentCodeElements: int[];
    ExecutionProgress: float;
    NumBlocks: int;
}
with
    member x.ToJson () =
        J.JsonValue.ObjectOf [
            "current_code_elements", J.JsonValue.ArrayOf (Array.map J.Int x.CurrentCodeElements);
            "execution_progress", J.String (string x.ExecutionProgress);
            "num_blocks", J.Int x.NumBlocks;
        ]

module World =
    let private ENCODE_VERSION = 1
    let private ENCODE_TYPE = "world"
    let private encoding = System.Text.Encoding.UTF8

    let private jload obj key fn = fn (J.getField obj key)
    let private tryJload obj key fn = Option.map fn (J.tryGetField obj key)

    let private encodeVec (v:IntVec3) =
        J.JsonValue.ArrayOf [J.Int v.X; J.Int v.Y; J.Int v.Z]

    let private decodeVec json =
        let arr = J.arrayToArray json
        // TODO throw better errors
        if arr.Length <> 3 then invalidArg "json" "vector must be a 3-length array"
        IntVec3 (arr.[0].AsInt, arr.[1].AsInt, arr.[2].AsInt)

    /// Encode a blocks to a stream.
    let private encodeBlocks (blocks: BlockData) =
        // create a big binary array of the blocks
        let arr : int[] = Array.zeroCreate (4 * blocks.Length)
        for i = 0 to blocks.Length - 1 do
            let offset = 4 * i
            let item = blocks.[i]
            arr.[offset + 0] <- item.Key.X
            arr.[offset + 1] <- item.Key.Y
            arr.[offset + 2] <- item.Key.Z
            arr.[offset + 3] <- item.Value

        // TODO gzip it

        let toHexStr x = x |> Util.arrayToBytes |> Convert.ToBase64String |> J.String

        J.JsonValue.ObjectOf [
            "type", J.String "binary";
            "little_endian", J.Bool BitConverter.IsLittleEndian;
            "gzip", J.Bool false;
            "data", toHexStr arr;
        ] 

    let private decodeBlocks json =
        let fromHexStr x = x |> J.asString |> Convert.FromBase64String |> Util.bytesToArray

        match jload json "type" J.asString with
        | "binary" ->
            let isLittleEndian = jload json "little_endian" J.asBool
            let blocks: int[] = jload json "data" fromHexStr

            if isLittleEndian <> BitConverter.IsLittleEndian then invalidArg "stream" "endianess of stream is different than machine architecture!"
            // this is really more like an assert but ah well
            // TODO throw a better error
            if blocks.Length % 4 <> 0 then invalidArg "stream" "blocks does not have correct number of elements"

            Array.init (blocks.Length / 4) (fun i ->
                let offset = 4 * i
                let cell = IntVec3 (blocks.[offset + 0], blocks.[offset + 1], blocks.[offset + 2])
                let block = blocks.[offset + 3]
                KeyValuePair (cell, block)
            )
        | "json" ->
            let blocks = jload json "data" J.arrayToArray
            blocks |> Array.map (fun b ->
                let cell = jload b "pos" decodeVec
                let block = jload b "blk" J.asInt
                KeyValuePair (cell, block)
            )
        // TODO throw a better error here
        | s -> invalidArg "json" (sprintf "invalid block encoding type '%s'" s)

    let private encodeRobot (robot: BasicRobot) =
        J.JsonValue.ObjectOf [
            "pos", encodeVec robot.Position;
            "dir", encodeVec robot.Direction;
        ]

    let private decodeRobot json =
        {
            Position = jload json "pos" decodeVec;
            Direction = jload json "dir" decodeVec;
        }

    let encodeToJson (data:WorldData) =
        // then base64 encode that
        J.JsonValue.ObjectOf [
            "meta", J.JsonValue.ObjectOf
                [
                    "version", J.Int ENCODE_VERSION;
                    "type", J.String ENCODE_TYPE;
                ];
            "blocks", encodeBlocks data.Blocks;
            "robots", Array.map encodeRobot data.Robots |> J.arrayOfArray;
        ]

    let encodeToString data = (encodeToJson data).Serialize ()

    let decodeFromJsonNoMeta json =
        {
            Blocks = defaultArg (tryJload json "blocks" decodeBlocks) Array.empty;
            Robots = defaultArg (tryJload json "robots" J.arrayToArray) Array.empty |> Array.map decodeRobot;
        }

    /// Decode a blocks from a stream. Closes the stream when finished.
    let decodeFromJson json =
        let meta = J.getField json "meta"
        if jload meta "version" J.asInt <> ENCODE_VERSION then invalidArg "json" "invalid version!"
        if jload meta "type" J.asString <> ENCODE_TYPE then invalidArg "json" "invalid data type!"
        decodeFromJsonNoMeta json

    let decodeFromString str = J.Parse str |> decodeFromJson
