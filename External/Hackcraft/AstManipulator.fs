namespace Hackcraft

open Ast.Imperative
open System.Collections.Generic

type ImperativeAstManipulator(maxProcedureLength:int) =
    let mutable ast: Program = {Procedures=Map.empty}
    let mutable isDirty = true

    let updateProc procname newbody =
        let newproc = {ast.Procedures.[procname] with Body=ImmArr.ofSeq newbody}
        ast <- {ast with Procedures=ast.Procedures.Add (procname, newproc)}
        isDirty <- true

    let bodyAsList procname = new List<Statement>(ast.Procedures.[procname].Body)

    member this.IsDirty = isDirty
    member this.ClearDirtyBit () = isDirty <- false

    member this.Program
        with get () = ast
        and set p =
            ast <- p
            isDirty <- true
        
    member this.CreateProcedure name =
        ast <- {ast with Procedures=ast.Procedures.Add (name, {Arity=0; Body=ImmArr.ofSeq []})}
        isDirty <- true

    member this.InsertStatement procname index statement =
        let body = bodyAsList procname
        if body.Count < maxProcedureLength
        then
            body.Insert (index, statement)
            updateProc procname body
            true
        else
            false

    member this.AppendStatement procname statement =
        let body = bodyAsList procname
        if body.Count < maxProcedureLength
        then
            body.Add statement
            updateProc procname body
            true
        else
            false

    member this.RemoveStatement procname index =
        let body = bodyAsList procname
        body.RemoveAt index
        updateProc procname body

    member this.ReplaceStatement procname index statement =
        let body = bodyAsList procname
        body.[index] <- statement
        updateProc procname body

    member this.ClearProcedure procname =
        updateProc procname []
