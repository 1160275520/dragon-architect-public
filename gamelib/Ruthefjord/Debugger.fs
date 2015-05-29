namespace Ruthefjord

type IDebugger = interface
    abstract IsDone : bool
    abstract CurrentState : BasicWorldState2
    abstract AdvanceOneCommand : unit -> unit
    abstract AdvanceOneLine : unit -> unit
    abstract JumpToCommand : int -> unit
end

type PersistentDebugger (program:Ast.Imperative.Program, startState:BasicWorldState2) =
    let nie () = raise (System.NotImplementedException ())

    interface IDebugger with
        member x.IsDone = nie ()
        member x.CurrentState  = nie ()
        member x.AdvanceOneCommand () = nie ()
        member x.AdvanceOneLine () = nie ()
        member x.JumpToCommand _ = raise (System.NotSupportedException ("persistent debugger cannot jump to commands"))

type WorkshopDebugger (program:Ast.Imperative.Program, startState:BasicWorldState2) =
    let nie () = raise (System.NotImplementedException ())

    interface IDebugger with
        member x.IsDone = nie ()
        member x.CurrentState  = nie ()
        member x.AdvanceOneCommand () = nie ()
        member x.AdvanceOneLine () = nie ()
        member x.JumpToCommand index = nie ()

module Debugger =
    let create (mode, program, startState) : IDebugger =
        match mode with
        | EditMode.Persistent -> upcast PersistentDebugger (program, startState)
        | EditMode.Workshop -> upcast WorkshopDebugger (program, startState)
