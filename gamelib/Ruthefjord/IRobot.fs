/// Implemntation of the different "robots".
/// Robots support a set of commands, and, given a command list produced by a program, change the world state.
/// See Ast.fs, Grid.fs
namespace Ruthefjord.Robot

open System.Collections.Generic
open Ruthefjord
open Ruthefjord.Ast.Imperative

[<AllowNullLiteral>]
type CommandOLD(t,a,s) =
    member x.Name: string = t
    member x.Args: ImmArr<obj> = a
    member x.LastExecuted: Statement list = s

    override x.Equals that =
        match that with
        | :? CommandOLD as y -> x.Name = y.Name && x.Args = y.Args
        | _ -> false

    override x.GetHashCode () =
        x.Name.GetHashCode () ^^^ x.Args.GetHashCode ()

type Command = {
    Name: string;
    Args: obj list;
}

type Query = {
    Name: string;
    Args: ImmArr<obj>;
}

type IRobotSimulator<'State> =
    abstract Execute : Command -> unit
    abstract Query : Query -> obj
    abstract CurrentState: 'State

type IRobotDeltaSimulator<'State, 'StateDelta> =
    inherit IRobotSimulator<'State>
    abstract EmptyDelta : 'StateDelta;
    abstract CombineDelta : 'StateDelta -> 'StateDelta -> 'StateDelta;
    abstract CreateDelta : Command -> 'StateDelta;
    abstract TryApplyDelta : 'StateDelta -> bool;

type IRobotSimulatorOLD =
    abstract member Execute : command:CommandOLD -> unit
    abstract member Query : query:Query -> obj
    abstract member CurrentState : obj

type IRobotSimulatorOLD2 =
    abstract member Execute : command:Command -> unit
//    abstract member ApplyDelta : obj -> unit
    abstract member Query : query:Query -> obj
    abstract member CurrentState : obj
