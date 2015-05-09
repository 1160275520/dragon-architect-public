/// Implemntation of the different "robots".
/// Robots support a set of commands, and, given a command list produced by a program, change the world state.
/// See Ast.fs, Grid.fs
namespace Ruthefjord.Robot

open System.Collections.Generic
open Ruthefjord
open Ruthefjord.Ast.Imperative

[<AllowNullLiteral>]
type Command(t,a,s) =
    member x.Name: string = t
    member x.Args: ImmArr<obj> = a
    member x.LastExecuted: Statement list = s

type Command2 = {
    Name: string;
    Args: obj list;
}

type Query = {
    Name: string;
    Args: ImmArr<obj>;
}

type IRobotSimulator =
    abstract member Execute : command:Command -> unit
    abstract member Query : query:Query -> obj
    abstract member CurrentState : obj

type IRobotSimulator2 =
    abstract member Execute : command:Command2 -> unit
    abstract member GetDelta : command:Command2 list -> obj option
    abstract member Query : query:Query -> obj
    abstract member CurrentState : obj
