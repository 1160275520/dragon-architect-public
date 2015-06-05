namespace Ruthefjord

type IDebugger = interface
    // generic operations
    abstract IsDone : bool
    abstract CurrentStep : Simulator.StepResult
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
    State: BasicWorldState;
}

type PersistentDebugger (init: DebuggerInitialData) =
    let nie () = raise (System.NotImplementedException ())
    let nse () = raise (System.NotSupportedException ("persistent debugger does not support workshop-only commands"))

    let simulator = Simulator.LazySimulator (init.Program, init.BuiltIns, BasicImperativeRobotSimulator.FromWorldState init.State)
    let mutable current = simulator.InitialState

    interface IDebugger with
        member x.IsDone = simulator.IsDone
        member x.CurrentStep = current
        member x.AdvanceOneState () =
            current <- simulator.AdvanceOneCommand ()
        member x.AdvanceOneLine () =
            nie ()

        member x.CurrentStateIndex = nse ()
        member x.StateCount = nse ()
        member x.JumpToState _ = nse ()

type WorkshopDebugger (init: DebuggerInitialData) =
    let nie () = raise (System.NotImplementedException ())

    let result = Simulator.SimulateWithRobot init.Program init.BuiltIns (BasicImperativeRobotSimulator.FromWorldState init.State)
    let mutable index = 0

    do
        // HACK correct implementation of IsDone relies on this property
        if (MyArray.last result.States).StepIndex <> result.Steps.Length - 1 then
            invalidArg "init" "final step does not include a state change!"

    let jumpToState i =
        index <- result.States.[i].StepIndex

    let currentStateIndex () =
        // find the first state _past_ the current step index, and subtract 1
        match result.States |> Array.tryFindIndex (fun s -> s.StepIndex > index) with
        | Some i -> i - 1
        | None -> result.States.Length - 1

    interface IDebugger with
        member x.IsDone = index = result.Steps.Length - 1
        member x.CurrentStep = {Stack=result.Steps.[index]; State=result.States.[currentStateIndex ()].Data; Errors=Array.empty}
        member x.AdvanceOneState () = jumpToState (currentStateIndex () + 1)
        member x.AdvanceOneLine () = nie ()

        member x.CurrentStateIndex = currentStateIndex ()
        member x.StateCount = result.States.Length
        member x.JumpToState newIndex = jumpToState newIndex

module Debugger =
    let create (mode, init) : IDebugger =
        match mode with
        | EditMode.Persistent -> upcast PersistentDebugger init
        | EditMode.Workshop -> upcast WorkshopDebugger init

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
        let states = Simulator.CollectAllStates program simulator globals (Some 100)
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
