namespace Ruthefjord

type IDebugger = interface
    // generic operations
    abstract IsDone : bool
    abstract CurrentStep : Simulator.StateData<CanonicalWorldState>
    abstract AdvanceOneState : unit -> unit
    abstract AdvanceOneLine : unit -> unit
    // workshop-only operations
    abstract CurrentStateIndex : int
    abstract StateCount: int
    abstract JumpToState : int -> unit
end

type DebuggerInitialData = {
    Program: Ast.Imperative.Program;
    BuiltIns: Simulator.ValueMap;
    State: CanonicalWorldState;
}

type PersistentDebugger (init: DebuggerInitialData) =
    let nie () = raise (System.NotImplementedException ())
    let nse () = raise (System.NotSupportedException ("persistent debugger does not support workshop-only commands"))

    let robot =
        let grid = HashTableGrid () :> IGrid<_>
        grid.SetFromCanonical init.State.Grid
        BasicRobotSimulator (grid, init.State.Robot)

    let simulator = Simulator.LazySimulator (init.Program, init.BuiltIns, robot)
    let mutable current = simulator.InitialState

    interface IDebugger with
        member x.IsDone = simulator.IsDone
        member x.CurrentStep = {State=robot.AsCanonicalState; LastExecuted=current.LastExecuted; Command=current.Command}
        member x.AdvanceOneState () =
            current <- simulator.AdvanceOneCommand ()
        member x.AdvanceOneLine () =
            nie ()

        member x.CurrentStateIndex = nse ()
        member x.StateCount = nse ()
        member x.JumpToState _ = nse ()

type WorkshopDebugger (init: DebuggerInitialData, maxSteps) =
    let nie () = raise (System.NotImplementedException ())

    let simulator =
        let grid = TreeMapGrid () :> IGrid<_>
        grid.SetFromCanonical init.State.Grid
        BasicRobotSimulator (grid, init.State.Robot)
    let result = Simulator.CollectAllStates init.Program simulator init.BuiltIns maxSteps

    let mutable index = 0

    interface IDebugger with
        member x.IsDone = index = result.Length - 1
        member x.CurrentStep = result.[index]
        member x.AdvanceOneState () = index <- index + 1
        member x.AdvanceOneLine () = nie ()

        member x.CurrentStateIndex = index
        member x.StateCount = result.Length
        member x.JumpToState newIndex = index <- newIndex

type CheckpointingWorkshopDebugger (init: DebuggerInitialData, checkpointDistance, maxSteps) =
    let nie () = raise (System.NotImplementedException ())

    let makeSim (state:CanonicalWorldState) =
        let grid = TreeMapGrid () :> IGrid<_>
        grid.SetFromCanonical state.Grid
        BasicRobotSimulator (grid, state.Robot)

    let result =
        let simulator = makeSim init.State
        Simulator.CollectEveryNStates init.Program simulator init.BuiltIns checkpointDistance maxSteps

    let mutable index = 0
    let mutable _, _, current = result.[0]

    interface IDebugger with
        member x.IsDone = index = result.Length - 1
        member x.CurrentStep = current
        member x.AdvanceOneState () = (x :> IDebugger).JumpToState (index + 1)
        member x.AdvanceOneLine () = nie ()

        member x.CurrentStateIndex = index
        member x.StateCount = fst3 (MyArray.last result) + 1
        member x.JumpToState newIndex =
            // hack handle last case
            if newIndex = (x :> IDebugger).StateCount - 1 then
                current <- thd3 (MyArray.last result)
            else
                // find closest checkpoint
                let onePast = result |> Array.findIndex (fun (i,_,_) -> i > newIndex)
                let chkIndex, progState, stateData = result.[onePast - 1]
                let newSim = makeSim stateData.State
                current <- Simulator.ExecuteNSteps {progState with Simulator=newSim} (newIndex - chkIndex)
            index <- newIndex

type CachingWorkshopDebugger (init: DebuggerInitialData, maxSteps) =
    let nie () = raise (System.NotImplementedException ())

    let cache = Simulator.MutableDict ()
    let initGrid = init.State.Grid |> Map.map (fun k v -> (v,{Robot.Command.Name="block"; Robot.Command.Args=[v:>obj]}))
    let initState () : BasicWorldState3 =
        {Robot=init.State.Robot; Grid=System.Collections.Generic.Dictionary initGrid}

    let stateFunctions2: Simulator.StateFunctions<BasicWorldState3, BasicWorldStateDelta> = {
        Empty = BasicWorldStateDelta.Empty;
        Combine = fun a b -> BasicWorldStateDelta.Combine a b;
        Create = fun c -> BasicWorldStateDelta.Create c;
        ApplyDelta = fun bot delta -> BasicWorldStateDelta.ApplyDelta3 bot delta;
        ApplyCommand = fun state c -> BasicWorldState3.ApplyCommand state c;
    }

    do Simulator.RunOptimized37 init.Program init.BuiltIns stateFunctions2 cache (initState ()) |> ignore

    let mutable index = 0
    let jumpTo newIndex =
        index <- newIndex
        Simulator.RunToState init.Program init.BuiltIns stateFunctions2 cache (initState ()) newIndex
    let mutable current = jumpTo 0
    let total = 0

    interface IDebugger with
        member x.IsDone = index = total - 1
        member x.CurrentStep =
            let grid = current.Grid |> Seq.map (fun kvp -> (kvp.Key, fst kvp.Value)) |> Map.ofSeq
            let state: CanonicalWorldState = {Robot=current.Robot; Grid=grid}
            {State=state; LastExecuted=[]; Command=None}
        member x.AdvanceOneState () =
            current <- jumpTo (index + 1)
        member x.AdvanceOneLine () = nie ()

        member x.CurrentStateIndex = index
        member x.StateCount = total
        member x.JumpToState newIndex =
            current <- jumpTo newIndex

module Debugger =
    let create (mode, init) : IDebugger =
        match mode with
        | EditMode.Persistent -> upcast PersistentDebugger init
        | EditMode.Workshop -> upcast WorkshopDebugger (init, Some 1000000)

    let private apply (state:BasicWorldState2) (cmd:Robot.Command) =
        let sim = (BasicImperativeRobotSimulator2.FromWorldState state)
        (sim :> Robot.IRobotSimulatorOLD2).Execute cmd
        (sim :> Robot.IRobotSimulatorOLD2).CurrentState :?> BasicWorldState2

    let stateFunctionsNoOp: Simulator.StateFunctions<BasicWorldState2, unit> = {
        Empty = ();
        Combine = fun () () -> ();
        Create = fun _ -> ();
        ApplyDelta = fun _ () -> None;
        ApplyCommand = apply;
    }

    let stateFunctions: Simulator.StateFunctions<BasicWorldState2, BasicWorldStateDelta> = {
        Empty = BasicWorldStateDelta.Empty;
        Combine = fun a b -> BasicWorldStateDelta.Combine a b;
        Create = fun c -> BasicWorldStateDelta.Create c;
        ApplyDelta = fun bot delta -> BasicWorldStateDelta.ApplyDelta bot delta;
        ApplyCommand = fun state c -> BasicWorldState2.ApplyCommand state c;
    }

    let stateFunctions2: Simulator.StateFunctions<BasicWorldState3, BasicWorldStateDelta> = {
        Empty = BasicWorldStateDelta.Empty;
        Combine = fun a b -> BasicWorldStateDelta.Combine a b;
        Create = fun c -> BasicWorldStateDelta.Create c;
        ApplyDelta = fun bot delta -> BasicWorldStateDelta.ApplyDelta3 bot delta;
        ApplyCommand = fun state c -> BasicWorldState3.ApplyCommand state c;
    }

    /// Only use for correctness unit tests! This is not performant!
    let runToCannonicalState program (grid:IGrid<_>) globals (startState:CanonicalWorldState) : CanonicalWorldState =
        grid.SetFromCanonical startState.Grid
        let simulator = BasicRobotSimulator (grid, startState.Robot)
        Simulator.ExecuteToEnd program simulator globals |> ignore
        simulator.AsCanonicalState

    /// Only use for correctness unit tests! This is not performant!
    let getAllCannonicalStates program (grid:IGrid<_>) globals (startState:CanonicalWorldState) : CanonicalWorldState array =
        grid.SetFromCanonical startState.Grid
        let simulator = BasicRobotSimulator (grid, startState.Robot)
        let states = Simulator.CollectAllStates program simulator globals None
        states |> Array.map (fun s -> simulator.ConvertToCanonical s.State)

type ProgramRunner() =
    let mutable isRunning = false
    let mutable totalTime = 0.0f
    let mutable debugger: IDebugger option = None

    member x.IsRunning = isRunning

    member x.Reset newDebugger =
        debugger <- Some newDebugger
        totalTime <- 0.0f
        isRunning <- false

    member x.Play () =
        if debugger.IsNone then invalidOp "cannot play when debugger is not set!"
        isRunning <- true

    member x.Pause () =
        isRunning <- false

    /// Update the simulation one tick, if running.
    /// Will transition to not running if the simulation finishes
    /// Returns the number of steps advanced
    member x.Update (numSteps:float32) =
        if not isRunning then invalidOp "program is not running, cannot update!"

        let numSteps =
            let oldTick = RMath.floori totalTime
            totalTime <- totalTime + numSteps
            let newTick = RMath.floori totalTime
            newTick - oldTick

        // debugger myst be non-none if we are running
        let d = debugger.Value

        for i = 1 to numSteps do
            if d.IsDone
            then
                isRunning <- false
            else
                d.AdvanceOneState ()

        numSteps
