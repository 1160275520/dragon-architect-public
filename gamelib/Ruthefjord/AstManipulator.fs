/// Code that makes manipulating the immutable AST from C# easier.
/// See Ast.fs
namespace Ruthefjord

open Ast.Imperative
open System.Collections.Generic

/// Class that holds onto an AST and provides utility functions to manipulate it.
/// Since the AST is immutable, these functions replace the local copy of the AST in place.
type ImperativeAstManipulator(maxProcedureLength:int) =
    let mutable ast: Program = {Body=[]}
    let mutable isDirty = true

    member this.IsDirty = isDirty
    member this.ClearDirtyBit () = isDirty <- false

    member this.Program
        with get () = ast
        and set p =
            ast <- p
            isDirty <- true
