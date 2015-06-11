module Ruthefjord.UnitTest.DebuggerTest

open Xunit
open Xunit.Extensions
open FsUnit.Xunit
open System.IO
open Ruthefjord
open Ruthefjord.Robot

module IST = ImperativeSimulatorTest

let runBasicTest (makeDebugger: DebuggerInitialData -> IDebugger) progName =
    let initData = IST.loadSampleProgram progName
    let debugger = makeDebugger initData

    debugger.IsDone |> should equal false
    while not debugger.IsDone do
        debugger.AdvanceOneState ()

    let expected = Debugger.runToCannonicalState (HashTableGrid ()) initData

    debugger.CurrentStep.State |> should equal expected

[<Fact>]
let ``basic persistent debugger`` () =
    ["line"; "AARON"; "smile"] |> List.map (runBasicTest (fun id -> upcast PersistentDebugger id))

[<Fact>]
let ``basic workshop debugger`` () =
    ["line"; "AARON"; "smile"] |> List.iter (runBasicTest (fun id -> upcast WorkshopDebugger (id, HashTableGrid (), None)))
    ["line"; "AARON"; "smile"] |> List.iter (runBasicTest (fun id -> upcast WorkshopDebugger (id, TreeMapGrid (), None)))

[<Fact>]
let ``persistent debugger unsupported operations`` () =
    let initData = IST.loadSampleProgram "smile"
    let d: IDebugger = upcast PersistentDebugger initData
    (fun () -> d.CurrentStateIndex |> ignore) |> should throw typeof<System.NotSupportedException>
    (fun () -> d.JumpToState 0 |> ignore) |> should throw typeof<System.NotSupportedException>
    (fun () -> d.StateCount |> ignore) |> should throw typeof<System.NotSupportedException>

let runThoroughWorkshopTest makeDebugger init =
    let expected: IDebugger = upcast WorkshopDebugger (init, TreeMapGrid (), None)
    let actual: IDebugger = makeDebugger init

    let check i =
        if i < expected.StateCount then
            actual.JumpToState i
            expected.JumpToState i
            let e = expected.CurrentStep.State
            let a = actual.CurrentStep.State
            actual.CurrentStateIndex |> should equal expected.CurrentStateIndex
            actual.CurrentStep.State |> should equal expected.CurrentStep.State

    check 6
    check 3
    check 75
    check 24
    check 50
    check 49
    check 51

    // only run this test for reasonable small programs
    if expected.StateCount < 1000 then
        for i = 0 to expected.StateCount - 1 do
            check i
    // for big ones just hop around a bunch
    else
        let n = 100
        for i = 0 to n do
            let idx = i * expected.StateCount / n
            check (max 0 idx)

let runFullWorkshopTest makeDebugger =
    runThoroughWorkshopTest makeDebugger (IST.loadSampleProgram "line")
    runThoroughWorkshopTest makeDebugger (IST.loadSampleProgram "AARON")
    runThoroughWorkshopTest makeDebugger (IST.loadSampleProgram "smile")
    runThoroughWorkshopTest makeDebugger (IST.loadSampleProgram "twisty-tower")
    runThoroughWorkshopTest makeDebugger (IST.loadSampleProgram "pyramid")

[<Fact>]
let ``checkpoint debugger hash table`` () =
    runFullWorkshopTest (fun init ->
        upcast CheckpointingWorkshopDebugger (init, HashTableGrid (), 50, None)
    )

[<Fact>]
let ``checkpoint debugger tree map`` () =
    runFullWorkshopTest (fun init ->
        upcast CheckpointingWorkshopDebugger (init, TreeMapGrid (), 500, None)
    )

[<Fact>]
let ``old caching debugger`` () =
    runFullWorkshopTest (fun init ->
        upcast CachingWorkshopDebugger (init, None)
    )

[<Fact>]
let ``new caching debugger`` () =
    runFullWorkshopTest (fun init ->
        upcast CachingWorkshopDebugger2 (init, None)
    )
