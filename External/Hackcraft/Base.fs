// Copyright (C) 2014 Eric Butler (zantifon@gmail.com)
namespace Hackcraft

open System

module Base =
    let dprint x = System.Diagnostics.Debug.WriteLine (sprintf "%A" x)
    let dprints x = System.Diagnostics.Debug.WriteLine x

/// A position in a text file. Contains line and column, both zero-indexed.
[<Struct>]
type Position(l:int, c:int) =
    member x.Line = l
    member x.Col = c
    override x.ToString() = if x.Line >= 0 then sprintf "(%d,%d)" (l+1) (c+1) else "*"

    static member Empty = Position (-1,-1)

/// Represents a ranged location in a file between two Positions.
/// Includes the start and end (both inclusive) as well as the filename.
[<Struct>]
type Location(s: Position, e: Position, f: string) =
    member x.Start = s
    member x.End = e
    member x.Filename = f
    override x.ToString() = sprintf "%s%O-%O" f s e

    static member Empty = Location (Position.Empty, Position.Empty, "")
    static member Unknown filename = Location (Position.Empty, Position.Empty, filename)

module MyString =
    let titleCase (s:string) = System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(s)

/// Base class of all language/scripting errors
type ScriptingError(message: string, inner: Exception) =
    inherit Exception(message, inner)

/// An error from the compilation/execution of a scripting language. Also used for JSON syntax errors.
type CompilerError internal(subtype: string, language: string, code: int, location: Location, errorMessage: string, inner: Exception) =
    inherit ScriptingError(sprintf "%O: %s Error %d: %s" location (MyString.titleCase subtype) code errorMessage, inner)
    /// specifics the language for this error (e.g., "json")
    member x.Language = language
    /// The kind of error (e.g., "syntax", "type", "runtime")
    member x.Type = subtype
    /// The error code. These are specific to the language/subtype (but usually unique within a single languge).
    member x.Code = code
    /// The location in the code where the error occurred.
    member x.Location = location
    /// The detailed message about the error. this.Message is broader, containing all properties in one printable string.
    member x.ErrorMessage = errorMessage

type SyntaxError(l,c,p,m,i) = inherit CompilerError("syntax",l,c,p,m,i)
type TypeError(l,c,p,m,i) = inherit CompilerError("type",l,c,p,m,i)
type RuntimeError(l,c,p,m,i) = inherit CompilerError("runtime",l,c,p,m,i)

/// Takes an input text file and exposes it as a stream, computing file Position as it goes.
type CharStream (stream: string, filename: string, eoferrorfn: Location -> exn) =
    let mutable index = 0
    let mutable line = 0
    let mutable col = 0

    let eoferror () =
        let p = Position (line, col)
        let e = eoferrorfn (Location (p, p, filename))
        raise e

    let get idx =
        try
          stream.[idx]
        with :? IndexOutOfRangeException -> eoferror ()

    member x.Next () =
        // grab char and position
        let c = get index

        // move reader head forward
        index <- index + 1
        // update position
        if c = '\n' then
            line <- line + 1
            col <- 0
        else if not (Char.IsControl c) then
            col <- col + 1

        c

    member x.Peek = get index
    member x.PeekAt d = get (index + d)
    member x.TryPeekAt d = if index + d < stream.Length then Some stream.[index + d] else None
    member x.IsEOF = stream.Length <= index
    member x.Filename = filename
    /// the position of the NEXT character to be lexed
    member x.Position = Position (line, col)

