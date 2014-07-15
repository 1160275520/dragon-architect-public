namespace Hackcraft

[<AutoOpen>]
module Global =
    /// Debug print an object (using System.Diagnostics.Debug.WriteLine).
    let inline dprint x = System.Diagnostics.Debug.WriteLine (sprintf "%A" x)
    /// Debug print a string (using System.Diagnostics.Debug.WriteLine).
    let inline dprints x = System.Diagnostics.Debug.WriteLine x

/// An error from the compilation/execution of a scripting language. Also used for JSON syntax errors.
type CodeError (subtype: string, code: int, location: int, errorMessage: string, exn: System.Exception) =
    member x.Type = subtype
    member x.Code = code
    member x.Location = location
    member x.ErrorMessage = errorMessage
    member x.Exception = exn

    member x.FullMessage = sprintf "at id=%d: %s Error %d: %s" x.Location x.Type x.Code x.ErrorMessage

type SerializationError(c,p,m,i) = inherit CodeError("serialization",c,p,m,i)
type RuntimeError(c,p,m,i) = inherit CodeError("runtime",c,p,m,i)

type CodeException (e: CodeError) =
    inherit System.Exception(e.FullMessage, e.Exception)
    member x.Error = e

module Util =
    let binaryToHex (bytes:byte[]) =
        let sb = System.Text.StringBuilder ()
        for b in bytes do
            sb.Append (b.ToString "x2") |> ignore
        sb.ToString ()
