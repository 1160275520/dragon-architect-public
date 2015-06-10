module Ruthefjord.UnitTest.DebuggerTest

open Xunit
open Xunit.Extensions
open FsUnit.Xunit
open System.IO
open Ruthefjord
open Ruthefjord.Robot

module IST = ImperativeSimulatorTest

let runBasicTest (makeDebugger: DebuggerInitialData -> IDebugger) =
    let initData = IST.loadSampleProgram "smile"
    let debugger = makeDebugger initData

    debugger.IsDone |> should equal false
    while not debugger.IsDone do
        debugger.AdvanceOneState ()

    let expected = Debugger.runToCannonicalState initData.Program (HashTableGrid ()) initData.BuiltIns initData.State

    debugger.CurrentStep.State |> should equal expected

[<Fact>]
let ``basic persistent debugger`` () =
    runBasicTest (fun id -> upcast PersistentDebugger id)

[<Fact>]
let ``basic workshop debugger`` () =
    runBasicTest (fun id -> upcast WorkshopDebugger (id, TreeMapGrid (), None))
    runBasicTest (fun id -> upcast WorkshopDebugger (id, HashTableGrid (), None))

[<Fact>]
let ``persistent debugger unsupported operations`` () =
    let initData = IST.loadSampleProgram "smile"
    let d: IDebugger = upcast PersistentDebugger initData
    (fun () -> d.CurrentStateIndex |> ignore) |> should throw typeof<System.NotSupportedException>
    (fun () -> d.JumpToState 0 |> ignore) |> should throw typeof<System.NotSupportedException>
    (fun () -> d.StateCount |> ignore) |> should throw typeof<System.NotSupportedException>

[<Fact>]
let ``workshop debugger jumping`` () =
    let initData = IST.loadSampleProgram "smile"
    let debugger: IDebugger = upcast WorkshopDebugger (initData, TreeMapGrid (), None)
    let expected = Debugger.getAllCannonicalStates initData.Program (TreeMapGrid ()) initData.BuiltIns initData.State

    debugger.StateCount |> should equal expected.Length

    let checkIndex i =
        debugger.JumpToState i
        debugger.CurrentStep.State |> should equal expected.[i]
        debugger.CurrentStateIndex |> should equal i
        debugger.IsDone |> should equal (i = expected.Length - 1)

    checkIndex 20
    checkIndex 0
    checkIndex 1
    checkIndex 14
    checkIndex 10
    // try advancing from 10
    debugger.AdvanceOneState ()
    debugger.CurrentStateIndex |> should equal 11
    checkIndex (expected.Length - 1)

[<Fact>]
let ``checkpoint debugger`` () =
    let initData = IST.loadSampleProgram "smile"
    let expected: IDebugger = upcast WorkshopDebugger (initData, TreeMapGrid (), None)
    let actual: IDebugger = upcast CheckpointingWorkshopDebugger (initData, TreeMapGrid (), 50, None)

    actual.StateCount |> should equal expected.StateCount

    // ensure we're actually testing multiple checkpoints
    expected.StateCount |> should greaterThan 101

    let check i =
        actual.JumpToState i
        expected.JumpToState i
        let e = expected.CurrentStep.State
        let a = actual.CurrentStep.State
        actual.CurrentStateIndex |> should equal expected.CurrentStateIndex
        actual.CurrentStep.State |> should equal expected.CurrentStep.State

    check 75
    check 24
    check 50
    check 49
    check 51

    for i = 0 to expected.StateCount - 1 do
        check i

[<Fact>]
let ``checkpoint debugger 2`` () =
    let initData = IST.loadSampleProgram "smile"
    let expected: IDebugger = upcast WorkshopDebugger (initData, TreeMapGrid (), None)
    let actual: IDebugger = upcast CheckpointingWorkshopDebugger (initData, HashTableGrid (), 50, None)

    actual.StateCount |> should equal expected.StateCount

    // ensure we're actually testing multiple checkpoints
    expected.StateCount |> should greaterThan 101

    let check i =
        actual.JumpToState i
        expected.JumpToState i
        let e = expected.CurrentStep.State
        let a = actual.CurrentStep.State
        actual.CurrentStateIndex |> should equal expected.CurrentStateIndex
        actual.CurrentStep.State |> should equal expected.CurrentStep.State

    check 75
    check 24
    check 50
    check 49
    check 51

    for i = 0 to expected.StateCount - 1 do
        check i

[<Fact>]
let ``caching debugger`` () =
    let initData = IST.loadSampleProgram "smile"
    let expected: IDebugger = upcast WorkshopDebugger (initData, TreeMapGrid (), None)
    let actual: IDebugger = upcast CachingWorkshopDebugger (initData, None)

    //actual.StateCount |> should equal expected.StateCount

    let check i =
        actual.JumpToState i
        expected.JumpToState i
        let e = expected.CurrentStep.State
        let a = actual.CurrentStep.State
        actual.CurrentStateIndex |> should equal expected.CurrentStateIndex
        actual.CurrentStep.State |> should equal expected.CurrentStep.State

    check 75
    check 24
    check 50
    check 49
    check 51

    for i = 0 to expected.StateCount - 1 do
        check i
