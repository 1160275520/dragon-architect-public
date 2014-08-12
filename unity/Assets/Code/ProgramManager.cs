using UnityEngine;
using System.Collections.Generic;
using System.Linq;
using System;

using Ruthefjord;
using Ruthefjord.Ast;

public class ProgramManager : MonoBehaviour {

    public int TicksPerStep;
    public const float TicksPerSecond = 60.0f;

    public ImperativeAstManipulator Manipulator { get; private set; }
    private ImmArr<Simulator.StepState> States;

    // never access these directly, even for private code!
    private RunState runState;
    private EditMode editMode;

    // the grid state at the beginning of workshop mode
    private KeyValuePair<IntVec3, int>[] initialCells;

    public bool IsSimulationRunning { get { return EditMode.IsPersistent || RunState.IsExecuting; } }

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
        Manipulator.CreateProcedure("MAIN");
        TicksPerStep = 30;

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
                States = null;

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
                    setGameStateToIndex(0, 0.0f);
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
            lazyProgramRunner = new LazyProgramRunner(Manipulator.Program, grid, robot.Robot);
        } else if (EditMode.IsWorkshop) {
            evalEntireProgram();
            setGameStateToIndex(0, 0.0f);
        }
    }

    public IEnumerable<int> LastExecuted {
        get {
            if (RunState.IsStopped) return Enumerable.Empty<int>();
            else return lastExecuted.Select(s => s.Meta.Id).Where(id => id > 0);
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
            GetComponent<ExternalAPI>().NotifyPS_CurrentState(new StateData(this.LastExecuted.ToArray(), SliderPosition, GetComponent<Grid>().CellsFilled));
        }
        Profiler.EndSample();
    }

    public void SetProgramStateBySlider(float slider) {
        if (EditMode.IsWorkshop) {
            // run if we haven't yet
            evalEntireProgram();

            // sometimes evaling entire program fails, so check again anyway
            if (States != null) {
                setRunState(RunState.Paused);
                var newIndex = (int)Math.Floor(States.Length * slider);
                if (currentStateIndex != newIndex) {
                    setGameStateToIndex(newIndex, 0.0f);
                }
            }
        }
    }

    public float SliderPosition {
        get {
            if (States == null) return 0.0f;
            else return (float)currentStateIndex / States.Length;
        }
    }

    public void LoadProgram(string resourceName) {
        Manipulator.Program = Ruthefjord.Serialization.Load(Resources.Load<TextAsset>(resourceName).text);
    }
    
    private void evalEntireProgram() {
        if (EditMode != EditMode.Workshop) throw new InvalidOperationException("can only call this in workshop mode!");
        if (Manipulator.IsDirty || States == null) {
            Manipulator.ClearDirtyBit();

            var isOldIndexAtEnd = States != null && currentStateIndex == States.Length;

            var grid = new GridStateTracker(initialCells);
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
                    var state = lazyProgramRunner.UpdateOneStep(grid);
                    Profiler.EndSample();
                    setGameState(state, dt);
                }
            }
        }

        else if (EditMode.IsWorkshop) {
            evalEntireProgram();

            if (RunState.IsExecuting) {
                currentStateIndex += stepsPassed;
                if (currentStateIndex >= States.Length) {
                    // use the private var, the public setter will throw if you try to set to finished manually
                    setRunState(RunState.Finished);
                    GetComponent<ExternalAPI>().NotifyPS_CurrentState(new StateData(new int[]{}, 1.0f, GetComponent<Grid>().CellsFilled));
                } else {
                    setGameStateToIndex(currentStateIndex, dt);
                }
            }
        }

	}
}
