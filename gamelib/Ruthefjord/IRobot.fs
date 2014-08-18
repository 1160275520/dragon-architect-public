/// Implemntation of the different "robots".
/// Robots support a set of commands, and, given a command list produced by a program, change the world state.
/// See Ast.fs, Grid.fs
namespace Ruthefjord.Robot

open System.Collections.Generic
open Ruthefjord

[<AllowNullLiteral>]
type Command(t,a) =
    member x.Name: string = t
    member x.Args: ImmArr<obj> = a

type Query = {
    Name: string;
    Args: ImmArr<obj>;
}

type IRobotSimulator =
    abstract member Execute : command:Command -> unit
    abstract member Query : query:Query -> obj
    abstract member CurrentState : obj
