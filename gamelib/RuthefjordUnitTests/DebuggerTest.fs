module Ruthefjord.UnitTest.DebuggerTest

open Xunit
open Xunit.Extensions
open FsUnit.Xunit
open System.IO
open Ruthefjord
open Ruthefjord.Robot

let makeInitData () =
    let filename = "../../../../doc/smile.txt"
    let stdlibPath = "../../../../unity/Assets/Resources/module/stdlib.txt"
    let importedModules = Simulator.import (Parser.Parse (System.IO.File.ReadAllText stdlibPath, "stdlib"))
    let text = System.IO.File.ReadAllText filename
    let program = Parser.Parse (text, filename)
    let grid = GridStateTracker Seq.empty
    let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}

    {
        Program = program;
        BuiltIns = importedModules;
        State = {Robot=robot; Grid=grid.CurrentState}
    }

let runBasicTest (makeDebugger: DebuggerInitialData -> IDebugger) =
    let initData = makeInitData ()
    let debugger = makeDebugger initData

    debugger.IsDone |> should equal false
    while not debugger.IsDone do
        debugger.AdvanceOneState ()

    let runner = BasicImperativeRobotSimulator.FromWorldState initData.State
    let result = Simulator.SimulateWithRobot initData.Program initData.BuiltIns runner

    debugger.CurrentStep.State.WorldState |> should equal result.States.[result.States.Length - 1].Data.WorldState

[<Fact>]
let ``basic persistent debugger`` () =
    runBasicTest (fun id -> upcast PersistentDebugger id)

[<Fact>]
let ``basic workshop debugger`` () =
    runBasicTest (fun id -> upcast WorkshopDebugger id)

[<Fact>]
let ``persistent debugger unsupported operations`` () =
    let initData = makeInitData ()
    let d: IDebugger = upcast PersistentDebugger initData
    (fun () -> d.CurrentStateIndex |> ignore) |> should throw typeof<System.NotSupportedException>
    (fun () -> d.JumpToState 0 |> ignore) |> should throw typeof<System.NotSupportedException>
    (fun () -> d.StateCount |> ignore) |> should throw typeof<System.NotSupportedException>

[<Fact>]
let ``workshop debugger jumping`` () =
    let initData = makeInitData ()
    let debugger: IDebugger = upcast WorkshopDebugger initData
    let runner = BasicImperativeRobotSimulator.FromWorldState initData.State
    let result = Simulator.SimulateWithRobot initData.Program initData.BuiltIns runner

    debugger.StateCount |> should equal result.States.Length

    let checkIndex i =
        debugger.JumpToState i
        debugger.CurrentStep.State.WorldState |> should equal result.States.[i].Data.WorldState
        debugger.CurrentStateIndex |> should equal i
        debugger.IsDone |> should equal (i = result.States.Length - 1)

    checkIndex 20
    checkIndex 0
    checkIndex 1
    checkIndex 14
    checkIndex 10
    // try advancing from 10
    debugger.AdvanceOneState ()
    debugger.CurrentStateIndex |> should equal 11
    checkIndex (result.States.Length - 1)
