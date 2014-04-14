namespace Hackcraft

open System

[<Struct>]
type Position(l:int, c:int) =
    member x.Line = l
    member x.Col = c
    override x.ToString() = sprintf "(%d,%d)" (l+1) (c+1)

[<Struct>]
type Location(s: Position, e: Position, f: string) =
    member x.Start = s
    member x.End = e
    member x.Filename = f

type ScriptingError(preface: string, loc: Location, msg: string) =
    inherit Exception(sprintf "%s Error at %s%O: %s" preface loc.Filename loc.Start msg)

module Scripting =
    let syntaxError loc msg = raise (ScriptingError ("Syntax", loc, msg))

type CharacterStream(stream: string, filename: string) =

    let mutable index = 0
    let mutable line = 0
    let mutable column = 0

    let eoferror () =
        let p = Position (line, column)
        Scripting.syntaxError (Location(p, p, filename)) "Unexpected EOF lexing."

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
            column <- 0
        else if not (Char.IsControl c) then
            column <- column + 1
            
        // return character
        c

    member x.Peek = get index
    member x.PeekAt d = get (index + d)
    member x.TryPeekAt d = if index + d < stream.Length then Some stream.[index + d] else None
    member x.IsEOF = stream.Length <= index
    member x.Filename = filename
    /// the position of the NEXT character to be lexed
    member x.Position = Position (line, column)
