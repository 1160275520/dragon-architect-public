namespace Hackcraft

open Ast.Imperative
open System.Collections.Generic

type ImperativeAstManipulator() =
    let mutable ast: Program = {Procedures=Map.empty}

    let updateProc procname newbody =
        let newproc = {ast.Procedures.[procname] with Body=ImmArr.ofSeq newbody}
        ast <- {ast with Procedures=ast.Procedures.Add (procname, newproc)}

    let bodyAsList procname = new List<Statement>(ast.Procedures.[procname].Body)

    member this.Program = ast
        
    member this.CreateProcedure name =
        ast <- {ast with Procedures=ast.Procedures.Add (name, {Arity=0; Body=ImmArr.ofSeq []})}

    member this.InsertStatement procname index statement =
        let body = bodyAsList procname
        body.Insert (index, statement)
        updateProc procname body

    member this.AppendStatement procname statement =
        let body = bodyAsList procname
        body.Add statement
        updateProc procname body

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
