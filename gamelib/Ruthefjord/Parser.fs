module Ruthefjord.Parser

open System
open System.Text
open System.Collections.Generic
open Ruthefjord.Ast.Imperative

type TokenT =
| Indent
| Dedent
| Newline
| Symbol of char
| Keyword of string
| Ident of string
| Literal of obj

type Token = {
    Token: TokenT;
    Location: TextLocation;
}

type ErrorCode =
| InternalError = 1001
| UnexpectedEOF = 1002
| InvalidCharacter = 1003
| InvalidIndentation = 1004
| EmptyFile = 1005
| UnexpectedToken = 1101
| InvalidExpression = 1102
| InvalidStatement = 1103

(*
Lexing implementation notes:

The languation is newline/indentation sensitive (like Python).
The way indents are lexed is very similar to the method used by the Python parser.
Tabs are treated as single spaces, and other whitespace is ignored.
The lexer tracks a stack of the amount of leading whitespace for previously opened.
Blank or comment-only lines are skipped.
Otherwise, the leading whitespace on each line is talied up, and compared to the head of the indent stack.
    If it's equal to the head, nothing is emitted.
    If it's more than the head, an INDENT token is emitted and that value is pushed onto the stack.
    If it's less, the lexer starts popping values off the stack, emitting one DEDENT for every pop.
        It stops once the head equals the value. If that nevers happens, it's a parse error.
*)

let lex (program, filename) =
    // some constants and helpers

    let isNewline c = c = '\n'
    let isSpace c = c = ' ' || c = '\r' || c = '\t'
    let isIndentSpace c = c = ' ' || c = '\t'
    let isAlpha c = Char.IsLetter c || c = '_'
    let isAlphaOrDigit c = Char.IsLetterOrDigit c || c = '_'

    let keywords =
        Set.ofArray [|
            "define"; "function";
            "set"; "var"; "let"; "mutable"; "to"; "in"; 
            "if"; "elif"; "else"; "end"; "then";
            "repeat"; "times"; "pass";
            "choice"; "match"; "case"; "of";
            "and"; "or"; "null"; "true"; "false";
            "command"; "query";
        |]

    let symbols =
        Set.ofArray [|
            '('; ')'; ','; '@'; '=';
        |]

    // parser state

    let cs = TextStream (program, filename, fun loc -> upcast (ParseException (ParseError (int ErrorCode.UnexpectedEOF, loc, "Unexpected EOF", null))))

    // the current "indentation level, in number of spaces or tabs.
    let indentStack = Stack<int>([0])

    let parseError (code:ErrorCode) (ps,pe) msg =
        raise (ParseException (ParseError (int code, TextLocation (ps, pe, cs.Filename), msg, null)))

    let skipWhile f =
        while (not cs.IsEOF) && f cs.Peek do (cs.Next ()) |> ignore

    let takeWhile (c:char) f =
        let b = StringBuilder ()
        b.Append c |> ignore
        while (not cs.IsEOF) && f cs.Peek do b.Append (cs.Next ()) |> ignore
        b.ToString ()

    let skipWhitespace () =
        let mutable numIndent = 0
        while not (cs.IsEOF) && isSpace cs.Peek do
            if isIndentSpace (cs.Next ()) then numIndent <- numIndent + 1
        numIndent

    let newToken start t = {Token=t; Location=TextLocation (start, cs.Position, cs.Filename)}

    let lexLeadingWhitespace () =
        let start = cs.Position
        // do this immediately, since it should always happen
        let indent = skipWhitespace ()
        // but do this lazily, because it will not be invoked for comment-only lines
        seq {
            if indent > indentStack.Peek () then
                indentStack.Push indent
                yield newToken start Indent
            else
                while indent < indentStack.Peek () do
                    yield newToken start Dedent
                    indentStack.Pop () |> ignore
                // make sure we didn't pop to some weird spot
                if indent <> indentStack.Peek () then
                    parseError ErrorCode.InvalidIndentation (start, cs.Position) "Invalid indentation level"
        }

    let lexToken () =
        let start = cs.Position
        let tok =
            match cs.Next () with
            | '#' ->
                skipWhile (not << isNewline)
                None
            | c when Char.IsLetter c ->
                let tok =
                    match takeWhile c System.Char.IsLetterOrDigit with
                    | "true" -> Literal true
                    | "false" -> Literal false
                    | x when keywords.Contains x -> Keyword x
                    | x -> Ident x
                Some tok
            | c when Char.IsDigit c ->
                Some (Literal (System.Int32.Parse (takeWhile c System.Char.IsDigit)))
            | c when symbols.Contains c ->
                Some (Symbol c)
            | c -> parseError ErrorCode.InvalidCharacter (start,start) (sprintf "Invalid character %O" c)
        tok |> Option.map (newToken start)

    let lexLine () =
        seq {
            let isNonBlankLine = ref false
            let indents = lexLeadingWhitespace ()

            if not cs.IsEOF then
                let c = cs.Peek

                // determine if line is blank/comments and if so, do not emit indent tokens
                let doEmitIndents = not (c = '#' || c = '\n')
                if doEmitIndents then yield! indents

                // otherwise emit indent tokens then lex other possible things
                while not cs.IsEOF && not (isNewline cs.Peek) do
                    match lexToken () with
                        | None -> ()
                        | Some t ->
                            yield t
                            isNonBlankLine := true
                    skipWhitespace () |> ignore

                if not cs.IsEOF then
                    // skip past the newline
                    let start = cs.Position
                    cs.Next () |> ignore
                    if !isNonBlankLine then yield newToken start Newline
        }

    seq {
        while (not cs.IsEOF) do yield! lexLine ()
        // yield enough dedents at end to remove all indentation
        for i = 1 to indentStack.Count - 1 do yield newToken cs.Position Dedent
    }

type private TokenStream (tokenSeq: Token seq) =
    let tokens = Seq.toArray tokenSeq
    let mutable index = 0

    do
        if tokens.Length = 0 then raise (ParseException (ParseError (int ErrorCode.EmptyFile, TextLocation.Empty, "Empty file!", null)))

    let get idx =
        try
            tokens.[idx]
        with :? System.IndexOutOfRangeException ->
            let loc = tokens.[tokens.Length - 1].Location
            raise (ParseException (ParseError (int ErrorCode.UnexpectedEOF, loc, "Unexpected EOF", null)))

    member x.Next () =
        // grab char and position
        let t = get index
        // move reader head forward
        index <- index + 1
        t

    member x.Peek = get index
    member x.IsEOF = tokens.Length <= index

let private parse tokens =

    let lastTokenLocation = ref Unchecked.defaultof<TextLocation>
    let stream = TokenStream tokens

    let peek () = stream.Peek.Token

    let next () =
        let t = stream.Next ()
        lastTokenLocation := t.Location
        t.Token

    let iseof () = stream.IsEOF

    let syntaxError (code: ErrorCode) msg = raise (ParseException (ParseError (int code, !lastTokenLocation, msg, null)))

    let peekIs t = not (iseof ()) && peek () = t

    let idCounter = ref 0
    let newExpr e =
        idCounter := !idCounter + 1
        {Meta={Id= !idCounter; Attributes=Json.Null}; Expr=e}
    let newStmt s =
        idCounter := !idCounter + 1
        {Meta={Id= !idCounter; Attributes=Json.Null}; Stmt=s}

    let matchToken t =
        let n = next ()
        if n <> t then syntaxError ErrorCode.UnexpectedToken (sprintf "Expected token %A, found %A" t n)

    let matchLiteral () =
        match next () with
        | Literal x -> x
        | t -> syntaxError ErrorCode.UnexpectedToken (sprintf "Expected literal, found %A" t)

    let matchIdent () =
        match next () with
        | Ident i -> i
        | t -> syntaxError ErrorCode.UnexpectedToken (sprintf "Expected identifier, found %A" t)

    let matchParenList elemMatchFn =
        matchToken (Symbol '(')
        let elems = [
            while not (peekIs (Symbol ')')) do
                yield elemMatchFn ()
                if not (peekIs (Symbol ')')) then matchToken (Symbol ',')
        ]
        next () |> ignore // read the ')'
        elems

    let rec matchExpression () =
        let expr =
            match next () with
            | Keyword "query" ->
                let name = matchIdent ()
                let args = matchParenList matchExpression
                Query {Name=name; Arguments=args}
            | Ident x when peekIs (Symbol '(') ->
                let args = matchParenList matchExpression
                Evaluate {Identifier=x; Arguments=args}
            | Ident x -> ExpressionT.Identifier x
            | Literal x -> ExpressionT.Literal x
            | t -> syntaxError ErrorCode.InvalidExpression (sprintf "Expected an expression which must start with an identifer or a literal, found %A" t)
        newExpr expr

    let matchFunction () =
        let name = matchIdent ()
        let param = matchParenList matchIdent
        let body = matchExpression ()
        matchToken Newline
        newStmt (Function {Name=name; Parameters=param; Body=body})

    let matchCommand () =
        let name = matchIdent ()
        let args = matchParenList matchExpression
        matchToken Newline
        newStmt (Command {Name=name; Arguments=args})

    let matchUntil condFn matchFn =
        [ while not (condFn ()) do match matchFn () with Some x -> yield x | None -> () ]

    let matchAnnotation () =
        let name = matchIdent ()
        matchToken (Symbol '=')
        let value = matchLiteral ()
        matchToken Newline
        (name, value)

    let rec matchBlock () =
        matchToken Newline
        matchToken Indent
        let body = matchUntil (fun () -> peekIs Dedent) (fun () -> matchStatement [])
        next () |> ignore // read the dedent
        body

    and matchProcedure () =
        let name = matchIdent ()
        let param = matchParenList matchIdent
        let body = matchBlock ()
        newStmt (Procedure {Name=name; Parameters=param; Body=body})

    and matchConditional () =
        let cond = matchExpression ()
        let thenb = matchBlock ()
        let elseb =
            if peekIs (Keyword "else") then
                next () |> ignore // read else
                if peekIs (Keyword "if") then
                    next () |> ignore // read if
                    [matchConditional ()]
                else
                    matchBlock ()
            else []
        newStmt (Conditional {Condition=cond; Then=thenb; Else=elseb})

    and matchRepeat () =
        let numTimes = matchExpression ()
        matchToken (Keyword "times")
        let body = matchBlock ()
        newStmt (Repeat {NumTimes=numTimes; Body=body})

    and matchCall name =
        let args = matchParenList matchExpression
        matchToken Newline
        newStmt (Execute {Identifier=name; Arguments=args})

    and matchStatement attributes : Statement option =
        match next () with
        | Symbol '@' -> matchStatement (matchAnnotation () :: attributes)
        | t ->
            let s =
                match t with
                | Keyword "pass" -> matchToken Newline; None
                | Keyword "function" -> Some (matchFunction ())
                | Keyword "define" -> Some (matchProcedure ())
                | Keyword "if" -> Some (matchConditional ())
                | Keyword "repeat" -> Some (matchRepeat ())
                | Keyword "command" -> Some (matchCommand ())
                | Ident x -> Some (matchCall x)
                | _ -> syntaxError ErrorCode.InvalidStatement (sprintf "Expected a statement, which must start with define, if, repeat, command, or an identifier, found %A" t)

            if attributes.IsEmpty then
                s
            else
                s |> Option.map (fun s ->
                    let attrs = attributes |> Map.ofList |> Json.fromObject
                    {s with Meta={s.Meta with Attributes=attrs}}
                )

    let matchProgram () =
        let body = matchUntil iseof (fun () -> matchStatement [])
        {Body=body}

    matchProgram ()

let Parse (text, filename) =
    try
        let tokens = lex (text, filename)
        parse tokens
    with
    | :? ParseException -> reraise ()
    | e -> raise (ParseException (ParseError (int ErrorCode.InternalError, TextLocation.Empty, "Internal parser error", e)))

let PrettyPrintTo (w:System.IO.TextWriter) (program:Program) =

    let curIndent = ref 0
    let startNewLine () = for i = 1 to !curIndent do w.Write("    ")

    let printList printFn list =
        w.Write '('
        match list with
        | [] -> ()
        | hd :: tl ->
            printFn hd
            for x in tl do
                w.Write " ,"
                printFn x
        w.Write ')'

    let rec printExpr (e:Expression) =
        match e.Expr with
        | ExpressionT.Literal x -> w.Write x
        | ExpressionT.Identifier x -> w.Write x
        | Evaluate e ->
            w.Write e.Identifier
            printList printExpr e.Arguments
        | Query q ->
            w.Write "query "
            w.Write q.Name
            printList printExpr q.Arguments

    let rec printStmt (s:Statement) =
        let attr = s.Meta.Attributes
        match attr with
        | Json.Object _ ->
            for (k,v) in Json.objectToSeq attr do
                startNewLine ()
                w.Write '@'
                w.Write k
                w.Write '='
                w.Write v
                w.Write '\n'
        | _ -> ()

        startNewLine ()
        match s.Stmt with
        | Conditional c -> raise (System.NotImplementedException ())
        | Repeat r ->
            w.Write "repeat "
            printExpr r.NumTimes
            w.Write " times\n"
            printBody r.Body
        | Function f ->
            w.Write "function "
            w.Write f.Name
            f.Parameters |> printList w.Write 
            w.Write ' '
            printExpr f.Body
            w.Write "\n\n"
        | Procedure p ->
            w.Write "define "
            w.Write p.Name
            p.Parameters |> printList w.Write 
            w.Write '\n'
            printBody p.Body
            w.Write '\n'
        | Execute e ->
            w.Write e.Identifier
            printList printExpr e.Arguments
            w.Write '\n'
        | Command c ->
            w.Write "command "
            w.Write c.Name
            printList printExpr c.Arguments
            w.Write '\n'

    and printBody stmts =
        curIndent := !curIndent + 1
        match stmts with
        | [] ->
            startNewLine ()
            w.Write "pass\n"
        | _ -> List.iter printStmt stmts
        curIndent := !curIndent - 1

    List.iter printStmt program.Body
