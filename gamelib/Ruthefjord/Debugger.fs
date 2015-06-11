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

type WorkshopDebugger<'a> (init: DebuggerInitialData, grid: IGrid<'a>, maxSteps) =
    let nie () = raise (System.NotImplementedException ())

    let simulator =
        grid.SetFromCanonical init.State.Grid
        BasicRobotSimulator (grid, init.State.Robot)
    let result = Simulator.CollectAllStates init.Program simulator init.BuiltIns maxSteps

    let mutable index = 0

    interface IDebugger with
        member x.IsDone = index = result.Length - 1
        member x.CurrentStep =
            let current = result.[index]
            {State=simulator.ConvertToCanonical current.State; LastExecuted=current.LastExecuted; Command=current.Command}
        member x.AdvanceOneState () = index <- index + 1
        member x.AdvanceOneLine () = nie ()

        member x.CurrentStateIndex = index
        member x.StateCount = result.Length
        member x.JumpToState newIndex = index <- newIndex

type CheckpointingWorkshopDebugger<'a> (init: DebuggerInitialData, grid:IGrid<'a>, checkpointDistance, maxSteps) =
    let nie () = raise (System.NotImplementedException ())

    let makeSim (state:CanonicalWorldState) =
        grid.SetFromCanonical state.Grid
        BasicRobotSimulator (grid, state.Robot)

    let simulator =
        grid.SetFromCanonical init.State.Grid
        BasicRobotSimulator (grid, init.State.Robot)

    let result =
        Simulator.CollectEveryNStates init.Program simulator init.BuiltIns checkpointDistance maxSteps

    let mutable index = 0
    let mutable _, _, current = result.[0]
    let mutable lastProgState = (snd3 result.[0]).Copy

    interface IDebugger with
        member x.IsDone = index = result.Length - 1
        member x.CurrentStep =
            {State=simulator.ConvertToCanonical current.State; LastExecuted=current.LastExecuted; Command=current.Command}
        member x.AdvanceOneState () = (x :> IDebugger).JumpToState (index + 1)
        member x.AdvanceOneLine () = nie ()

        member x.CurrentStateIndex = index
        member x.StateCount = fst3 (MyArray.last result) + 1
        member x.JumpToState newIndex =
            if newIndex >= (x :> IDebugger).StateCount then
                invalidArg "newIndex" (sprintf "index %d out of bounds, max is %d!" newIndex (x :> IDebugger).StateCount)

            // hack handle last case
            if newIndex = (x :> IDebugger).StateCount - 1 then
                current <- thd3 (MyArray.last result)
            else if newIndex = index + 1 then
                current <- Simulator.ExecuteNSteps lastProgState 1
            else
                // find closest checkpoint
                let onePast = result |> Array.findIndex (fun (i,_,_) -> i > newIndex)
                let chkIndex, progState, stateData = result.[onePast - 1]
                grid.Set stateData.State.Grid
                let newSim = BasicRobotSimulator (grid, stateData.State.Robot)
                lastProgState <- {progState with Simulator=newSim}
                current <- Simulator.ExecuteNSteps lastProgState (newIndex - chkIndex)

            index <- newIndex

type CachingWorkshopDebugger (init: DebuggerInitialData, maxSteps) =
    let nie () = raise (System.NotImplementedException ())

    let cache = Simulator.MutableDict ()
    let newSimulator () : IGridWorldSimulator<_,_> = upcast DeltaRobotSimulator (init.State.Grid, init.State.Robot)
    let mutable simulator = newSimulator ()

    let mutable index = 0
    let jumpTo newIndex : unit =
        index <- newIndex
        simulator <- newSimulator ()
        Simulator.RunOptimizedToState init.Program init.BuiltIns simulator cache newIndex
    do jumpTo 0
    let total = 0

    interface IDebugger with
        member x.IsDone = index = total - 1
        member x.CurrentStep =
            let state = simulator.AsCanonicalState
            {State=state; LastExecuted=[]; Command=None}
        member x.AdvanceOneState () =
            jumpTo (index + 1)
        member x.AdvanceOneLine () = nie ()

        member x.CurrentStateIndex = index
        member x.StateCount = total
        member x.JumpToState newIndex =
            jumpTo newIndex

type CachingWorkshopDebugger2 (init: DebuggerInitialData, maxSteps) =
    let nie () = raise (System.NotImplementedException ())

    let cache = Simulator.MutableDict ()
    let newSimulator () : IGridWorldSimulator<_,_> = upcast DeltaRobotSimulator2 (init.State.Grid, init.State.Robot)
    let mutable simulator = newSimulator ()

    let mutable index = 0
    let jumpTo newIndex : unit =
        index <- newIndex
        simulator <- newSimulator ()
        Simulator.RunOptimizedToState init.Program init.BuiltIns simulator cache newIndex
    do jumpTo 0
    let total = 0

    interface IDebugger with
        member x.IsDone = index = total - 1
        member x.CurrentStep =
            let state = simulator.AsCanonicalState
            {State=state; LastExecuted=[]; Command=None}
        member x.AdvanceOneState () =
            jumpTo (index + 1)
        member x.AdvanceOneLine () = nie ()

        member x.CurrentStateIndex = index
        member x.StateCount = total
        member x.JumpToState newIndex =
            jumpTo newIndex

module Debugger =
    let create (mode, init) : IDebugger =
        match mode with
        | EditMode.Persistent -> upcast PersistentDebugger init
        | EditMode.Workshop -> upcast CheckpointingWorkshopDebugger (init, TreeMapGrid (), 50, Some 1000000)

    let makeSimulator (grid:IGrid<'a>) (init:CanonicalWorldState) =
        let sim = BasicRobotSimulator (grid, init.Robot)
        grid.SetFromCanonical init.Grid
        sim

    /// Only use for correctness unit tests! This is not performant!
    let runToCannonicalState (grid:IGrid<_>) (init:DebuggerInitialData) : CanonicalWorldState =
        let simulator = makeSimulator grid init.State
        Simulator.ExecuteToEnd init.Program simulator init.BuiltIns |> ignore
        simulator.AsCanonicalState

    /// Only use for correctness unit tests! This is not performant!
    let getAllCannonicalStates (grid:IGrid<_>) (init:DebuggerInitialData) : CanonicalWorldState array =
        let simulator = makeSimulator grid init.State
        let states = Simulator.CollectAllStates init.Program simulator init.BuiltIns None
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
