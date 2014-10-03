using UnityEngine;
using System.Collections.Generic;
using System.Linq;
using System;

using Ruthefjord;
using Ruthefjord.Ast;

public enum ProgramStepType
{
    Statement,
    Command,
}

public class ProgramManager : MonoBehaviour {

    public int TicksPerStep;
    public const float TicksPerSecond = 60.0f;

    public ImperativeAstManipulator Manipulator { get; private set; }

    private Simulator.FullSimulationResult result;

    // never access these directly, even for private code!
    private RunState runState;
    private EditMode editMode;

    // the grid state at the beginning of workshop mode
    private KeyValuePair<IntVec3, int>[] initialCells;

    public bool IsSimulationRunning { get { return EditMode.IsPersistent || RunState.IsExecuting; } }

    /// true iff the program manager should be checking if the program is dirty and re-evaluating it each frame
    /// set this to false when the gui is changing the program state
    public bool IsCheckingForProgramChanges { get; set; }

    private int currentStepIndex = 0;

    private int currentStateIndex {
        get { return result == null ? 0 : result.StateOf(currentStepIndex); }
        set {
            currentStepIndex = result == null
                ? 0
                : value == result.States.Length ? result.Steps.Length : result.States[value].StepIndex;
        }
    }

    // the absolute time when a step was last advanced
    private float lastStatementExecutionTime = 0.0f;
    // how many ticks have passed since the last step was advanced
    private float totalTicks;

    private IEnumerable<Imperative.Statement> lastExecuted;
    private LazyProgramRunner lazyProgramRunner;
    private Simulator.StateResult currentState;

    private Microsoft.FSharp.Collections.FSharpMap<string, object> builtIns;

    // cached component references
    private RobotController robot;

    void Awake() {
        // HACK need max proc length for historical purposes, but doesn't actually do anything
        Manipulator = new ImperativeAstManipulator(100);
        TicksPerStep = 30;

        var stdlibText = Resources.Load<TextAsset>("stdlib.imperative").text;
        builtIns = Simulator.import(Parser.Parse(stdlibText, "stdlib"));

        robot = FindObjectOfType<RobotController>();

        runState = RunState.Stopped;
        editMode = EditMode.Persistent;
        initialCells = new KeyValuePair<IntVec3, int>[] { };
    }
    
    void Start () {
        var eapi = GetComponent<ExternalAPI>();
        eapi.NotifyPS_EditMode(EditMode);
        eapi.NotifyPS_RunState(RunState);
        eapi.NotifyPS_CurrentState(new StateData(new int[]{}, 0.0f, GetComponent<Grid>().CellsFilled));
    }

    private void setEditMode(EditMode newEM) {
        if (editMode != newEM) {
            editMode = newEM;
            GetComponent<ExternalAPI>().NotifyPS_EditMode(newEM);
        }
    }

    public EditMode EditMode {
        get { return editMode; }
        set {
            if (editMode == value) return;

            // stop playback when mode changes (which should clear out any workshop changes)
            RunState = RunState.Stopped;

            if (value.IsWorkshop) {
                // if switching to workshop mode, backup all cells and clear old states
                var grid = GetComponent<Grid>();
                initialCells = grid != null ? grid.AllCells : new KeyValuePair<IntVec3, int>[] { };
                result = null;
            }

            setEditMode(value);
        }
    }

    private void setRunState(RunState newRS) {
        if (runState != newRS) {
            runState = newRS;
            GetComponent<ExternalAPI>().NotifyPS_RunState(newRS);
        }
    }

    public RunState RunState {
        get { return runState; }
        set {
            if (runState == value) return;

            if (value.IsStopped) {
                if (EditMode.IsWorkshop) {
                    setGameStateToStateIndex(0, 0.0f);
                }
            } else if (value.IsExecuting) {
                if (runState.IsStopped) {
                    startExecution();
                } else {
                    // reset last statement execution time so dt isn't super wrong next time
                    lastStatementExecutionTime = Time.time;
                }
            } else if (value.IsFinished) {
                throw new ArgumentException("cannot directly set run state to 'finished'");
            } else if (value.IsPaused && !runState.IsExecuting) {
                throw new ArgumentException("cannot pause when not executing!");
            }

            setRunState(value);
        }
    }

    private void startExecution() {
        totalTicks = 0.0f;
        lastStatementExecutionTime = Time.time;

        if (EditMode.IsPersistent) {
            // use the current grid as the initial state
            var grid = new GridStateTracker(GetComponent<Grid>().AllCells);
            // just use wherever the robot current is as the initial state
            lazyProgramRunner = new LazyProgramRunner(Manipulator.Program, builtIns, grid, robot.Robot);
        } else if (EditMode.IsWorkshop) {
            evalEntireProgram();
            setGameStateToStateIndex(0, 0.0f);
        }
    }

    public IEnumerable<int> LastExecuted {
        get {
            if (RunState.IsStopped) return Enumerable.Empty<int>();
            else return lastExecuted.Select(s => s.Meta.Id).Where(id => id > 0);
        }
    }

    private void setGameStateToStateIndex(int index, float transitionTimeSeconds) {
        if (EditMode != EditMode.Workshop) throw new InvalidOperationException("can only set using state index in workshop mode!");
        index = Util.clamp(0, result.States.Length - 1, index);
        currentStateIndex = index;
        var state = result.States[index];
        setGameState(state.Data, result.Steps[state.StepIndex], transitionTimeSeconds);
    }

    private void setGameStateToStepIndex(int index) {
        var transitionTimeSeconds = 0.0f;
        if (EditMode != EditMode.Workshop) throw new InvalidOperationException("can only set using state index in workshop mode!");
        index = Util.clamp(0, result.Steps.Length - 1, index);
        this.currentStepIndex = index;
        // currentStateIndex will update after we set currentStepIndex
        var state = result.States[this.currentStateIndex];
        setGameState(state.Data, result.Steps[state.StepIndex], transitionTimeSeconds);
    }

    private void setGameState(Simulator.StateResult state, IEnumerable<Imperative.Statement> stack, float transitionTimeSeconds) {
        Profiler.BeginSample("ProgramManager.setGameState");
        if (state != currentState) {
            currentState = state;
            var grid = GetComponent<Grid>();
            var ws = state.WorldState as BasicWorldState;
            robot.SetRobot(ws.Robot, state.Command, transitionTimeSeconds);
            grid.SetGrid(ws.Grid);
            lastExecuted = stack;
            GetComponent<ExternalAPI>().NotifyPS_CurrentState(new StateData(this.LastExecuted.ToArray(), SliderPosition, GetComponent<Grid>().CellsFilled));
        }
        Profiler.EndSample();
    }

    public void StepProgramState(ProgramStepType type, int distance) {
        if (EditMode.IsWorkshop) {
            switch (type) {
                case ProgramStepType.Command:
                    setGameStateToStateIndex(currentStateIndex + distance, 0);
                    break;
                case ProgramStepType.Statement:
                    setGameStateToStepIndex(currentStepIndex + distance);
                    break;
            }
        }
    }

    public void SetProgramStateBySlider(float slider) {
        if (EditMode.IsWorkshop) {
            // run if we haven't yet
            evalEntireProgram();

            // sometimes evaling entire program fails, so check again anyway
            if (result != null) {
                setRunState(RunState.Paused);
                var newIndex = (int)Math.Floor(result.States.Length * slider);
                if (currentStateIndex != newIndex) {
                    setGameStateToStateIndex(newIndex, 0.0f);
                }
            }
        }
    }

    public float SliderPosition {
        get {
            if (result == null) return 0.0f;
            else return (float)currentStateIndex / result.States.Length;
        }
    }

    public void LoadProgram(string resourceName) {
        Manipulator.Program = Ruthefjord.Parser.Parse(Resources.Load<TextAsset>(resourceName).text, resourceName);
    }
    
    private void evalEntireProgram() {
        if (EditMode != EditMode.Workshop) throw new InvalidOperationException("can only call this in workshop mode!");
        if (Manipulator.IsDirty || result == null) {
            Manipulator.ClearDirtyBit();

            var isOldIndexAtEnd = result != null && currentStateIndex == result.States.Length;

            var grid = new GridStateTracker(initialCells);
            var initialRobotState = result != null ? ((BasicWorldState)result.States[0].Data.WorldState).Robot : robot.Robot;
            var runner = new BasicImperativeRobotSimulator(initialRobotState, grid);
            result = Simulator.SimulateWithRobot(Manipulator.Program, builtIns, runner);

            if (isOldIndexAtEnd) {
                currentStateIndex = result.States.Length;
            }

            setGameStateToStateIndex(currentStateIndex, 0.0f);
        }
    }

	void Update () {
        Profiler.BeginSample("ProgramManager.Update.CalculateTicks");
        var oldTicks = (int)totalTicks;
        if (RunState.IsExecuting) {
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

        if (EditMode.IsPersistent && RunState.IsExecuting) {
            for (var i = 0; i < stepsPassed; i++) {
                Profiler.BeginSample("ProgramManager.Update.GetGrid");
                var grid = new GridStateTracker(GetComponent<Grid>().AllCells);
                Profiler.EndSample();
                if (lazyProgramRunner.IsDone) {
                    RunState = RunState.Stopped;
                    GetComponent<ExternalAPI>().NotifyPS_CurrentState(new StateData(new int[]{}, 1.0f, GetComponent<Grid>().CellsFilled));
                } else {
                    Profiler.BeginSample("ProgramManager.Update.ProgramStep");
                    var tuple = lazyProgramRunner.UpdateOneStep(grid);
                    Profiler.EndSample();
                    setGameState(tuple.State, tuple.Stack, dt);
                }
            }
        }

        else if (EditMode.IsWorkshop) {
            evalEntireProgram();

            if (RunState.IsExecuting) {
                currentStateIndex += stepsPassed;
                if (currentStateIndex >= result.States.Length) {
                    // use the private var, the public setter will throw if you try to set to finished manually
                    setRunState(RunState.Finished);
                    GetComponent<ExternalAPI>().NotifyPS_CurrentState(new StateData(new int[]{}, 1.0f, GetComponent<Grid>().CellsFilled));
                } else {
                    setGameStateToStateIndex(currentStateIndex, dt);
                }
            }
        }

	}
}
