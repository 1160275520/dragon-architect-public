/// Menagerie of common types and utility functions that do not have a better home.
namespace Ruthefjord

open System
open System.Diagnostics

/// An error from the compilation/execution of the in-game language.
type CodeError (subtype: string, code: int, location: int, errorMessage: string, exn: System.Exception) =
    member x.Type = subtype
    member x.Code = code
    member x.Location = location
    member x.ErrorMessage = errorMessage
    member x.Exception = exn

    member x.FullMessage = sprintf "at id=%d: %s Error %d: %s" x.Location x.Type x.Code x.ErrorMessage

type SerializationError(c,p,m,i) = inherit CodeError("serialization",c,p,m,i)
type RuntimeError(c,p,m,i) = inherit CodeError("runtime",c,p,m,i)

type ParseError (code: int, location: TextLocation, errorMessage: string, exn: System.Exception) =
    member x.Code = code
    member x.Location = location
    member x.ErrorMessage = errorMessage
    member x.Exception = exn

    member x.FullMessage = sprintf "at %O: Syntax Error %d: %s" x.Location x.Code x.ErrorMessage

type ParseException(e: ParseError) =
    inherit Exception (e.FullMessage, e.Exception)
    member x.Error = e

type CodeException (e: CodeError) =
    inherit System.Exception(e.FullMessage, e.Exception)
    member x.Error = e

module Logger =

    let mutable logAction : Action<string> = new Action<string>(fun (s:string) -> ())

    let inline log (msg:string) =
    #if DEBUG
        logAction.Invoke msg
    #else
        ()
    #endif

[<AutoOpen>]
module Global =
    /// Debug print an object (using System.Diagnostics.Debug.WriteLine).
    let inline dprint x = Logger.log (sprintf "%A" x)
    /// Debug print a string (using System.Diagnostics.Debug.WriteLine).
    let inline dprints x = Logger.log x

module Util =
    let parseEnum<'a> s = Enum.Parse (typeof<'a>, s) :?> 'a

    let clamp lb ub x = min (max lb x) ub

    let binaryToHex (bytes:byte[]) =
        let sb = System.Text.StringBuilder (bytes.Length * 2)
        for b in bytes do
            sb.Append (b.ToString "x2") |> ignore
        sb.ToString ()

    // we have to roll this ourselves instead of using BlockCopy
    // because mono decided ints should be different sizes on different platforms.
    let intArrayToBytes (arr: int[]) =
        let bytes : byte[] = Array.zeroCreate (arr.Length * 4)
        for i = 0 to arr.Length - 1 do
            let o = 4 * i
            let x = arr.[i]
            bytes.[o + 0] <- byte ((x >>> 0) &&& 0xff)
            bytes.[o + 1] <- byte ((x >>> 8) &&& 0xff)
            bytes.[o + 2] <- byte ((x >>> 16) &&& 0xff)
            bytes.[o + 3] <- byte ((x >>> 24) &&& 0xff)
        bytes

    let bytesToIntArray (bytes: byte[]) =
        if bytes.Length % 4 <> 0 then
            invalidArg "bytes" "bytes.Length is not a multiple of 4 (sizeof int)"
        let arr : int[] = Array.zeroCreate (bytes.Length / 4)
        for i = 0 to arr.Length - 1 do
            let o = 4 * i
            arr.[i] <-
                ((int bytes.[o + 0]) <<< 0)
                ||| ((int bytes.[o + 1]) <<< 8)
                ||| ((int bytes.[o + 2]) <<< 16)
                ||| ((int bytes.[o + 3]) <<< 24)
        arr

