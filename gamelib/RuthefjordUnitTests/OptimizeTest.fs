module Ruthefjord.UnitTest.OptimizeTest

open Xunit
open Xunit.Extensions
open FsUnit.Xunit
open System.IO
open Ruthefjord
open Ruthefjord.Robot

module IST = ImperativeSimulatorTest

[<Fact>]
[<Trait("tag", "opt")>]
let ``command sanity check`` () =
    let c1: Robot.Command = {Name="foo"; Args=["bar" :> obj]}
    let c2: Robot.Command = {Name="foo"; Args=["bar" :> obj]}

    c1 |> should equal c2

let referenceProgramsTheory = IST.referenceProgramsTheory
let sampleProgramsTheory = IST.sampleProgramsTheory

let checkOptimizedReference makeSim reference =
    reference |> IST.checkReferenceProgram (fun init ->
        let cache = Simulator.MutableDict ()
        let simulator: #IGridWorldSimulator<_,_> = makeSim init
        Simulator.RunOptimized init.Program init.BuiltIns simulator cache
        simulator.AsCanonicalState
    )

let checkOptimizedSampleProgram makeSim progName =
    let cache = Simulator.MutableDict ()
    let init = IST.loadSampleProgram progName
    let simulator: #IGridWorldSimulator<_,_> = makeSim init

    let expected = Debugger.runToCannonicalState (HashTableGrid ()) init
    Simulator.RunOptimized init.Program init.BuiltIns simulator cache
    let actual = simulator.AsCanonicalState

    actual |> should equal expected

[<Theory>]
[<PropertyData("referenceProgramsTheory")>]
let ``no-op delta reference`` (text, start, expected) =
    (text, start, expected) |> checkOptimizedReference (fun init ->
        Debugger.makeSimulator (TreeMapGrid ()) init.State
    )

[<Theory>]
[<PropertyData("sampleProgramsTheory")>]
let ``no-op delta samples`` progName =
    progName |> checkOptimizedSampleProgram (fun init ->
        Debugger.makeSimulator (TreeMapGrid ()) init.State
    )

[<Theory>]
[<PropertyData("referenceProgramsTheory")>]
let ``delta reference`` (text, start, expected) =
    (text, start, expected) |> checkOptimizedReference (fun init ->
        DeltaRobotSimulator (init.State.Grid, init.State.Robot)
    )

[<Theory>]
[<PropertyData("sampleProgramsTheory")>]
let ``delta samples`` progName =
    progName |> checkOptimizedSampleProgram (fun init ->
        DeltaRobotSimulator (init.State.Grid, init.State.Robot)
    )

[<Theory>]
[<PropertyData("referenceProgramsTheory")>]
let ``delta 2 reference`` (text, start, expected) =
    (text, start, expected) |> checkOptimizedReference (fun init ->
        DeltaRobotSimulator2 (init.State.Grid, init.State.Robot)
    )

[<Theory>]
[<PropertyData("referenceProgramsTheory")>]
let ``delta 3 reference`` (text, start, expected) =
    (text, start, expected) |> checkOptimizedReference (fun init ->
        DeltaRobotSimulator3 (init.State.Grid, init.State.Robot)
    )

[<Fact>]
let ``delta 3 reference ASD`` ()  =
    IST.referencePrograms.[1] |> checkOptimizedReference (fun init ->
        DeltaRobotSimulator3 (init.State.Grid, init.State.Robot)
    )

// copy of the normal delta simulator, except Execute throw an exception.
// for testing to ensure optimized simulators actually use the deltas exclusively
type NoFallbackDeltaRobotSimulator (state) =
    let sim = DeltaRobotSimulator(state)
    let isim = sim :> IGridWorldSimulator<_,_>

    interface IGridWorldSimulator<DictGrid, BasicWorldStateDelta> with
        member x.AsCanonicalState = isim.AsCanonicalState
        member x.Execute command = invalidOp ""
        member x.Query query = isim.Query query
        member x.CurrentState = isim.CurrentState
        member x.EmptyDelta = isim.EmptyDelta
        member x.CreateDelta command = isim.CreateDelta command
        member x.CombineDelta a b = isim.CombineDelta a b
        member x.TryApplyDelta delta = isim.TryApplyDelta delta

// delta simulation on normal program should never hit the fallback code
[<Theory>]
[<PropertyData("referenceProgramsTheory")>]
let ``no fallback delta reference`` (text, start, expected) =
    (text, start, expected) |> checkOptimizedReference (fun init ->
        NoFallbackDeltaRobotSimulator (init.State.Grid, init.State.Robot)
    )

[<Theory>]
[<PropertyData("sampleProgramsTheory")>]
let ``no fallback delta samples`` progName =
    progName |> checkOptimizedSampleProgram (fun init ->
        NoFallbackDeltaRobotSimulator (init.State.Grid, init.State.Robot)
    )
