/// Menagerie of common types and utility functions that do not have a better home.
namespace Ruthefjord

open System
open System.Diagnostics

[<AutoOpen>]
module Global =
    /// Debug print an object (using System.Diagnostics.Debug.WriteLine).
    let inline dprint x = Debug.WriteLine (sprintf "%A" x)
    /// Debug print a string (using System.Diagnostics.Debug.WriteLine).
    let inline dprints x = Debug.WriteLine x

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

module Util =
    let parseEnum<'a> s = Enum.Parse (typeof<'a>, s) :?> 'a

    let clamp lb ub x = min (max lb x) ub

    let binaryToHex (bytes:byte[]) =
        let sb = System.Text.StringBuilder (bytes.Length * 2)
        for b in bytes do
            sb.Append (b.ToString "x2") |> ignore
        sb.ToString ()

    /// Block copy an array of 'a to an array of bytes. Ignores endianess concerns.
    /// NOTE: this just up and fails with int16 on mono because sizeof<int16> = 4 (???). So watch out for that
    let arrayToBytes<'a when 'a : struct> (arr: 'a[]) =
        let bytes : byte[] = Array.zeroCreate (arr.Length * sizeof<'a>)
        System.Buffer.BlockCopy (arr, 0, bytes, 0, bytes.Length)
        bytes

    let bytesToArray<'a when 'a : struct> (bytes: byte[]) =
        if bytes.Length % sizeof<'a> <> 0 then
            invalidArg "bytes" (sprintf "bytes.Length is not a multiple of the size of %s" typeof<'a>.Name)
        let arr : 'a[] = Array.zeroCreate (bytes.Length / sizeof<'a>)
        System.Buffer.BlockCopy (bytes, 0, arr, 0, bytes.Length)
        arr
