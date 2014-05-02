using UnityEngine;
using System.Collections.Generic;
using System.Linq;
using System;

using Hackcraft;
using Hackcraft.Ast;

public class ProgramManager : MonoBehaviour {

    public float DelayPerCommand;
    public const int MAX_PROCEDURE_LENGTH = 15;

    public ImperativeAstManipulator Manipulator = new ImperativeAstManipulator(MAX_PROCEDURE_LENGTH);
    public ImmArr<Simulator.StepState> States { get; private set; }

    public bool IsAvailMovement = true;
    public bool IsAvailPlaceBlock = true;
    public bool IsAvailLine = true;
    public bool IsAvailCall = true;
    public bool IsAvailRepeat = true;

    public int NumHelperFuncs = 5;

    private static readonly string[] PROCS = new string[] { "MAIN", "F1", "F2", "F3", "F4", "F5" };

    public string[] AvailableProcedures { get {
        return PROCS.Take(NumHelperFuncs + 1).ToArray();
    } }

    // which procedures cannot be edited
    private HashSet<string> lockedProcedures = new HashSet<string>();

    public bool IsEditable(string proc) {
        return !lockedProcedures.Contains(proc);
    }

    public void SetIsEditable(string proc, bool b) {
        if (b) {
            lockedProcedures.Remove(proc);
        } else {
            lockedProcedures.Add(proc);
        }
    }

    /// true iff the program manager is currently showing real-time execution of a program
    public bool IsExecuting { get; private set; }
    /// true iff the program is "running", which means either executing or done executing but not yet reset
    public bool IsRunning { get; private set; }

    /// true iff the program manager should be checking if the program is dirty and re-evaluating it each frame
    /// set this to false when the gui is changing the program state
    public bool IsCheckingForProgramChanges { get; set; }

    private int currentStateIndex = 0;
    private float lastStatementExecutionTime = 0.0f;

    public void StartExecution() {
        currentStateIndex = -1;
        IsExecuting = true;
        IsRunning = true;
        lastStatementExecutionTime = Time.fixedTime;
    }

    public void StopRunning() {
        IsExecuting = false;
        IsRunning = false;
        setGameState(0);
    }

    public List<int> LastExecuted {
        get {
            var rv = new List<int>();
            if (States != null && currentStateIndex >= 0 && currentStateIndex < States.Length) {
                // using 'var' does not compile here for reasons, sooo just explicitly type it
                foreach (Imperative.Statement stmt in States[currentStateIndex].LastExecuted) {
                    var id = stmt.Meta.Id;
                    if (id > 0) rv.Add(id);
                }
            }
            return rv;
        }
    }

    public void Undo() {
    }

    public void Clear() {
        var procs = from kvp in Manipulator.Program.Procedures select kvp.Key;
        foreach (var p in procs) {
            Manipulator.ClearProcedure(p);
        } 
        GetComponent<Grid>().Clear();
        FindObjectOfType<RobotController>().Reset();
    }

    private void setGameState(int index) {
        Debug.Log("setting to " + index);
        var robot = FindObjectOfType<RobotController>();
        var grid = GetComponent<Grid>();
        currentStateIndex = index;

        var idx = currentStateIndex < States.Length ? currentStateIndex : States.Length - 1;
        var state = States[idx];
        robot.Robot = state.Robot;
        grid.SetGrid(state.Grid);
    }

    public void SetProgramStateBySlider(float slider) {
        var newIndex = (int)Math.Floor(States.Length * slider);
        if (currentStateIndex != newIndex) {
            setGameState(newIndex);
            IsExecuting = false;
        }
    }

    public float SliderPosition {
        get {
            if (States == null) return 0.0f;
            return (float)currentStateIndex / States.Length;
        }
    }

	// Use this for initialization
	void Start () {
        IsExecuting = false;
        IsCheckingForProgramChanges = true;
	}
	
	// Update is called once per frame
	void Update () {
        if (IsCheckingForProgramChanges && Manipulator.IsDirty) {
            Manipulator.ClearDirtyBit();

            Debug.Log("program is dirty!");

            var isOldIndexAtEnd = States != null && currentStateIndex == States.Length;

            var robot = FindObjectOfType<RobotController>();
            var grid = new GridStateTracker();
            var initialRobotState = States != null ? States[0].Robot : robot.Robot;

            States = Simulator.ExecuteFullProgram(Manipulator.Program, "Main", grid, initialRobotState.Clone);
            Debug.Log(States.Length + " states in program");
            if (isOldIndexAtEnd) {
                currentStateIndex = States.Length;
            }
            setGameState(currentStateIndex);
        }

        if (IsExecuting && lastStatementExecutionTime + DelayPerCommand < Time.fixedTime) {
            currentStateIndex++;
            if (currentStateIndex >= States.Length) {
                IsExecuting = false;
                // leave IsRunning set to true
            } else {
                setGameState(currentStateIndex);
            }
            lastStatementExecutionTime = Time.fixedTime;
        }
	}
}
