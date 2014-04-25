using UnityEngine;
using System.Collections.Generic;
using System.Linq;
using System;

using Hackcraft;
using Hackcraft.Ast;

public class ProgramManager : MonoBehaviour {

    public float DelayPerCommand;

    public ImperativeAstManipulator Manipulator = new ImperativeAstManipulator();
    public ImmArr<Simulator.StepState> States { get; private set; }

    public bool IsExecuting { get; private set; }
    private int currentStateIndex = -1;
    private float lastStatementExecutionTime = 0.0f;

    public void StartExecution() {
        currentStateIndex = -1;
        IsExecuting = true;
        lastStatementExecutionTime = Time.fixedTime;
    }

    public void StopExecution() {
        IsExecuting = false;
    }

    public List<int> LastExecuted {
        get {
            var rv = new List<int>();
            if (currentStateIndex >= 0 && currentStateIndex < States.Length) {
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
        Manipulator.Program = Hackcraft.Serialization.LoadFile("TestData/demo.txt");
	}
	
	// Update is called once per frame
	void Update () {
        if (Manipulator.IsDirty) {
            Manipulator.ClearDirtyBit();

            Debug.Log("program is dirty!");
            var robot = FindObjectOfType<RobotController>();
            var grid = new GridStateTracker();
            var initialRobotState = States != null ? States[0].Robot : robot.Robot;

            States = Simulator.ExecuteFullProgram(Manipulator.Program, "Main", grid, initialRobotState.Clone);
        }

        if (IsExecuting && lastStatementExecutionTime + DelayPerCommand < Time.fixedTime) {
            currentStateIndex++;
            if (currentStateIndex >= States.Length) {
                IsExecuting = false;
            } else {
                setGameState(currentStateIndex);
            }
            lastStatementExecutionTime = Time.fixedTime;
        }
	}
}
