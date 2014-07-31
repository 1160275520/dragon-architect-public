namespace Hackcraft

open System
open System.Collections.Generic
open System.IO
module J = Hackcraft.Json

type EditMode =
| Workshop = 0
| Persistent = 1

type RunState =
| Stopped = 0
| Executing = 1
| Paused = 2
| Finished = 3

type BlockData = KeyValuePair<IntVec3, Block> []

type RobotData = {
    Position: IntVec3;
    Direction: IntVec3;
}

type WorldData = {
    Blocks: BlockData;
    Robots: RobotData [];
}

module World =

    let dataOfRobot (r:Robot.IRobot) =
        {Position=r.Position; Direction=r.Direction}

    let private ENCODE_VERSION = 1
    let private ENDIAN_SENTINEL = 0xfffffffe
    let private encoding = System.Text.Encoding.UTF8

    let private jload obj key fn = fn (J.getField obj key)

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

        // HACK assume little endian because this isn't changing systems atm
        // well okay binary encode a test int so we can at least detect it later
        let sentinel = [| ENDIAN_SENTINEL |]

        let toHexStr x = x |> Util.arrayToBytes |> Convert.ToBase64String |> J.String

        J.JsonValue.ObjectOf [
            "type", J.String "binary";
            "sentinel", toHexStr sentinel;
            "gzip", J.Bool false;
            "data", toHexStr arr;
        ] 

    let private decodeBlocks json =
        let fromHexStr x = x |> J.asString |> Convert.FromBase64String |> Util.bytesToArray

        match jload json "type" J.asString with
        | "binary" ->
            let sentinel: int[] = jload json "sentinel" fromHexStr
            let blocks: int[] = jload json "data" fromHexStr

            if sentinel.[0] <> ENDIAN_SENTINEL then invalidArg "stream" "endianess of stream is different!"
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
            raise (NotImplementedException ())
        // TODO throw a better error here
        | s -> invalidArg "json" (sprintf "invalid block encoding type '%s'" s)

    let private encodeRobot (robot: RobotData) =
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
                ];
            "blocks", encodeBlocks data.Blocks;
            "robots", Array.map encodeRobot data.Robots |> J.arrayOfArray;
        ]

    let encodeToString data = (encodeToJson data).Serialize ()

    /// Decode a blocks from a stream. Closes the stream when finished.
    let decodeFromJson json =
        let meta = J.getField json "meta"
        let version = jload meta "version" J.asInt
        if version <> ENCODE_VERSION then invalidArg "stream" "invalid version!"

        {
            Blocks = jload json "blocks" decodeBlocks;
            Robots = jload json "robots" J.arrayToArray |> Array.map decodeRobot;
        }

    let decodeFromString str = J.Parse str |> decodeFromJson
