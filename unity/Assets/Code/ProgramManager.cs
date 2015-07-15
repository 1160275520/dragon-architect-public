using UnityEngine;
using System.Collections.Generic;
using System.Linq;
using System;
using Microsoft.FSharp.Core;

using Ruthefjord;
using Ruthefjord.Ast;

using CanonicalWorldState = Ruthefjord.WorldState<Microsoft.FSharp.Collections.FSharpMap<Ruthefjord.IntVec3, int>>;

public enum ProgramStepType
{
    Statement,
    Command,
}

public class ProgramManager : MonoBehaviour {

    private static Dictionary<string, int> stdlibSteps = new Dictionary<string, int>
    {
        {"Forward", 2},
        {"Left", 1},
        {"Right", 1},
        {"Up", 2},
        {"Down", 2},
        {"PlaceCube", 1},
        {"RemoveCube", 1}
    };

    public int TicksPerStep;
    public const float TicksPerSecond = 60.0f;

    public ImperativeAstManipulator Manipulator { get; private set; }

    // never access these directly, even for private code!
    private RunState runState;
    private EditMode editMode;

    private IDebugger debugger;
    private ProgramRunner runner;

    // the grid state at the beginning of workshop mode
    private KeyValuePair<IntVec3, int>[] initialCells;

    public bool IsSimulationRunning { get { return EditMode.IsPersistent || RunState.IsExecuting; } }


    // the absolute time when a step was last advanced, used to determine how long animation should play
    private float lastStatementExecutionTime = 0.0f;

    private IEnumerable<Imperative.Statement> lastExecuted;
    private BasicWorldState currentState;

    private Microsoft.FSharp.Collections.FSharpMap<string, object> importedModules;

    // cached component references
    private RobotController robot;

    void Awake() {
        // HACK need max proc length for historical purposes, but doesn't actually do anything
        Manipulator = new ImperativeAstManipulator(100);
        TicksPerStep = 30;

        // default to loading only stdlib, can be override by calling AddImportedModule
        importedModules = Simulator.import(Parser.Parse(Resources.Load<TextAsset>("module/stdlib").text, "stdlib"));

        robot = FindObjectOfType<RobotController>();

        runState = RunState.Stopped;
        editMode = EditMode.Persistent;
        initialCells = new KeyValuePair<IntVec3, int>[] { };
        this.runner = new ProgramRunner();
    }

    void Start() {
        var eapi = GetComponent<ExternalAPI>();
        eapi.NotifyPS_EditMode(EditMode);
        eapi.NotifyPS_RunState(RunState);
        eapi.NotifyPS_CurrentState(new StateData(new int[]{}, 0.0f, GetComponent<Grid>().CellsFilled));
    }

    public void AddImportedModule(Imperative.Program prog) {
        importedModules = MyMap.merge(Simulator.import(prog), importedModules);
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

            // TODO do some state changes

            // stop playback when mode changes (which should clear out any workshop changes)
            RunState = RunState.Stopped;
            FindObjectOfType<MyCamera>().clearCubeHighlight();
            if (value.IsWorkshop) {
                // if switching to workshop mode, backup all cells and clear old states
                var grid = GetComponent<Grid>();
                initialCells = grid != null ? grid.AllCells : new KeyValuePair<IntVec3, int>[] { };
                //result = null;
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
                    setGameStateToStateIndex(0);
                }
            } else if (value.IsExecuting) {
                if (runState.IsStopped) {
                    startExecution();
                    this.runner.Play();
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

    public void ExecuteProgramTo(float time) {
        startExecution();
        SliderPosition = time;
    }

    private void startExecution() {
        var initData = new DebuggerInitialData(
            this.Manipulator.Program,
            this.importedModules,
            new BasicWorldState(this.robot.Robot, ImmArr.ofArray(GetComponent<Grid>().AllCellsWithCommands)).AsCanonical);
        this.debugger = Debugger.create(this.editMode, initData);
        this.runner.Reset(this.debugger);
        this.lastStatementExecutionTime = Time.time;

        // TODO probably need to set the state?
    }

    public IEnumerable<int> LastExecuted {
        get {
            if (RunState.IsStopped) return Enumerable.Empty<int>();
            else return lastExecuted.Select(s => s.Meta.Id).Where(id => id < 167000);
        }
    }

    private void setGameStateToStateIndex(int index) {
        if (EditMode != EditMode.Workshop) throw new InvalidOperationException("can only set using state index in workshop mode!");
        debugger.JumpToState(index);
        var cs = debugger.CurrentStep;
        setGameState(cs.State, cs.Command, cs.LastExecuted, 0.0f);
    }

    private void setGameState(CanonicalWorldState cws, FSharpOption<Ruthefjord.Robot.Command> commandOpt, IEnumerable<Imperative.Statement> stack, float transitionTimeSeconds) {
        Profiler.BeginSample("ProgramManager.setGameState");
        var state = BasicWorldState.FromCanonical(cws);
        if (state != currentState) {
            FindObjectOfType<MyCamera>().clearCubeHighlight();
            currentState = state;
            var grid = GetComponent<Grid>();
            var cmd = OptionModule.IsSome(commandOpt) ? commandOpt.Value : null;
            robot.SetRobot(state.Robot, cmd, transitionTimeSeconds);
            grid.SetGrid(state.Grid);
            lastExecuted = stack;
            GetComponent<ExternalAPI>().NotifyPS_CurrentState(new StateData(this.LastExecuted.ToArray(), SliderPosition, GetComponent<Grid>().CellsFilled));
        }
        Profiler.EndSample();
    }

    public void StepProgramState(ProgramStepType type, int distance) {
#if false
        if (RunState == RunState.Executing) RunState = RunState.Paused;
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
#endif
    }

    public float SliderPosition {
        get {
            if (debugger == null || editMode.IsPersistent) return 0.0f;
            else return (float)debugger.CurrentStateIndex / (debugger.StateCount - 1);
        }
        set {
            if (EditMode.IsWorkshop) {
                setRunState(RunState.Paused);

                // if the slider is moved before play starts, then execute the program
                if (debugger == null) {
                    startExecution();
                }

                var newIndex = (int)Math.Floor((debugger.StateCount - 1) * value);
                if (debugger.CurrentStateIndex != newIndex) {
                    setGameStateToStateIndex(newIndex);
                }
            }
        }
    }

    public void LoadProgram(string resourceName) {
        Manipulator.Program = Ruthefjord.Parser.Parse(Resources.Load<TextAsset>(resourceName).text, resourceName);
    }

	void Update() {
        // TODO figure out if "last time" should be updated, even if paused
        if (RunState.IsExecuting) {
            //Debug.Log("time: " + Time.deltaTime + ", TPS: " + TicksPerSecond);
            var numSteps = this.runner.Update(Time.deltaTime * TicksPerSecond / TicksPerStep);
            // check if the runner is finished
            if (!this.runner.IsRunning) {
                setRunState(editMode.IsPersistent ? RunState.Stopped : RunState.Finished);
            }

            // TODO check if this should be something fancier
            var dt = numSteps == 1
                ? Time.time - this.lastStatementExecutionTime
                : 0.0f;

            // notify of state change, I guess?
            // TODO why are we doing this?
            if (numSteps > 0) {
                this.lastStatementExecutionTime = Time.time;
                var cs = debugger.CurrentStep;
                setGameState(cs.State, cs.Command, cs.LastExecuted, dt);
            }
        }
	}
}
