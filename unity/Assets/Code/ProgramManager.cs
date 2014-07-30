using UnityEngine;
using System.Collections.Generic;
using System.Linq;
using System;

using Hackcraft;
using Hackcraft.Ast;

public class ProgramManager : MonoBehaviour {

    public int TicksPerStep;
    public const float TicksPerSecond = 60.0f;

    public ImperativeAstManipulator Manipulator { get; private set; }
    private ImmArr<Simulator.StepState> States;

    public EditMode EditMode { get; set; }
    public RunState RunState { get; private set; }

    public bool IsSimulationRunning { get { return EditMode == EditMode.Persistent || RunState == RunState.Executing; } }

    /// true iff the program manager should be checking if the program is dirty and re-evaluating it each frame
    /// set this to false when the gui is changing the program state
    public bool IsCheckingForProgramChanges { get; set; }

    private int currentStateIndex = 0;
    // the absolute time when a step was last advanced
    private float lastStatementExecutionTime = 0.0f;
    // how many ticks have passed since the last step was advanced
    private float totalTicks;

    private IEnumerable<Imperative.Statement> lastExecuted;
    private LazyProgramRunner lazyProgramRunner;
    private Simulator.StepState currentState;

    // cached component references
    private RobotController robot;

    void Awake() {
        // HACK need max proc length for historical purposes, but doesn't actually do anything
        Manipulator = new ImperativeAstManipulator(100);
        EditMode = EditMode.Workshop;
        TicksPerStep = 30;

        robot = FindObjectOfType<RobotController>();
    }
    
    void Start () {
    }

    public void StartExecution() {
        RunState = RunState.Executing;
        totalTicks = 0.0f;
        lastStatementExecutionTime = Time.time;

        switch (EditMode) {
            case EditMode.Persistent: {
                // use the current grid as the initial state
                var grid = new GridStateTracker(GetComponent<Grid>().AllCells);
                // just use wherever the robot current is as the initial state
                lazyProgramRunner = new LazyProgramRunner(Manipulator.Program, grid, robot.Robot);
            } break;
            case EditMode.Workshop:
                EvalEntireProgram();
                setGameStateToIndex(0, 0.0f);
                break;
        }
    }

    public void TogglePauseExecution() {
        switch (RunState) {
            case RunState.Executing: RunState = RunState.Paused; break;
            case RunState.Paused:
                RunState = RunState.Executing;
                // reset last statement execution time so dt isn't super wrong next time
                lastStatementExecutionTime = Time.time;
                break;
        }
    }

    public void ResetExecution() {
        RunState = RunState.Stopped;
        if (EditMode == EditMode.Workshop) {
            setGameStateToIndex(0, 0.0f);
        }
    }

    public IEnumerable<int> LastExecuted {
        get {
            switch (RunState) {
                case RunState.Stopped: return Enumerable.Empty<int>();
                default: return lastExecuted.Select(s => s.Meta.Id).Where(id => id > 0);
            }
        }
    }

    private void setGameStateToIndex(int index, float transitionTimeSeconds) {
        if (EditMode != EditMode.Workshop) throw new InvalidOperationException("can only set using state index in workshop mode!");
        index = index < States.Length ? index : States.Length - 1;
        currentStateIndex = index;
        setGameState(States[index], transitionTimeSeconds);
    }

    private void setGameState(Simulator.StepState state, float transitionTimeSeconds) {
        Profiler.BeginSample("ProgramManager.setGameState");
        if (!state.Equals(currentState)) {
            currentState = state;
            var grid = GetComponent<Grid>();
            robot.SetRobot(state.Robot, state.Command, transitionTimeSeconds);
            grid.SetGrid(state.Grid);
            lastExecuted = state.LastExecuted;
            GetComponent<ExternalAPI>().SendCurrentStatement();
        }
        Profiler.EndSample();
    }

#if false
    public void SetProgramStateBySlider(float slider) {
        var newIndex = (int)Math.Floor(States.Length * slider);
        if (currentStateIndex != newIndex) {
            setGameStateToIndex(newIndex);
            IsExecuting = false;
        }
    }

    public float SliderPosition {
        get {
            if (States == null) return 0.0f;
            return (float)currentStateIndex / States.Length;
        }
    }
#endif

    public void LoadProgram(string resourceName) {
        Manipulator.Program = Hackcraft.Serialization.Load(Resources.Load<TextAsset>(resourceName).text);
    }
    
    private void EvalEntireProgram() {
        if (EditMode != EditMode.Workshop) throw new InvalidOperationException("can only call this in workshop mode!");
        if (Manipulator.IsDirty) {
            Manipulator.ClearDirtyBit();

            var isOldIndexAtEnd = States != null && currentStateIndex == States.Length;

            var grid = GridStateTracker.Empty();
            var initialRobotState = States != null ? States[0].Robot : robot.Robot;

            States = Simulator.ExecuteFullProgram(Manipulator.Program, grid, initialRobotState.Clone);

            if (isOldIndexAtEnd) {
                currentStateIndex = States.Length;
            }

            setGameStateToIndex(currentStateIndex, 0.0f);
        }
    }

	void Update () {
        Profiler.BeginSample("ProgramManager.Update.CalculateTicks");
        var oldTicks = (int)totalTicks;
        if (RunState == RunState.Executing) {
            totalTicks += Time.deltaTime * TicksPerSecond;
        }

        int stepsPassed = Math.Max(0, (int)(totalTicks / TicksPerStep));
        totalTicks -= stepsPassed * TicksPerStep;

        float dt = 0;

        if (stepsPassed > 0) {
            if (stepsPassed == 1) {
                dt = Time.time - lastStatementExecutionTime;
            }
            lastStatementExecutionTime = Time.time;
        }
        Profiler.EndSample();

        switch (EditMode) {
            case EditMode.Persistent: {
                if (RunState == RunState.Executing) {
                    for (var i = 0; i < stepsPassed; i++) {
                        Profiler.BeginSample("ProgramManager.Update.GetGrid");
                        var grid = new GridStateTracker(GetComponent<Grid>().AllCells);
                        Profiler.EndSample();
                        if (lazyProgramRunner.IsDone) {
                            RunState = RunState.Stopped;
                        } else {
                            Profiler.BeginSample("ProgramManager.Update.ProgramStep");
                            var state = lazyProgramRunner.UpdateOneStep(grid);
                            Profiler.EndSample();
                            setGameState(state, dt);
                        }
                    }
                }
            } break;

            case EditMode.Workshop: {
                EvalEntireProgram();

                if (RunState == RunState.Executing) {
                    currentStateIndex += stepsPassed;
                    if (currentStateIndex >= States.Length) {
                        RunState = RunState.Finished;
                        GetComponent<ExternalAPI>().SendCurrentStatement(); // clear final highlight
                    } else {
                        setGameStateToIndex(currentStateIndex, dt);
                    }
                }
            } break;
        }

	}
}
