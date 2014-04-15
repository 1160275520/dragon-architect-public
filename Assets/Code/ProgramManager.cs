using UnityEngine;
using System.Collections.Generic;
using System.Linq;
using System;

using Hackcraft;
using Hackcraft.Ast;

public class ProgramManager : MonoBehaviour {

    public float DelayPerCommand = 0.0f;

    public ImperativeAstManipulator Program = new ImperativeAstManipulator();
    public Simulator.State State { get; private set; }

    private float lastStatementExecutionTime = 0.0f;
    private struct RobotState
    {
        public IntVec3 Postion;
        public Robot.Axis Axis;
        public Robot.Direction Dir;
    }
    private RobotState prevState;

    public void Execute() {
        State = Simulator.CreateState(Program.Program, "Main");
        lastStatementExecutionTime = Time.fixedTime;
        var robot = FindObjectOfType<Robot>();
        prevState = new RobotState { Postion = new IntVec3 { X = robot.Position.X, Y = robot.Position.Y, Z = robot.Position.Z }, 
                                     Axis = robot.FacingAxis, Dir = robot.FacingDirection };
        FindObjectOfType<Grid>().ResetUndo();
    }

    public void Stop() {
        State = null;
    }

    public bool IsExecuting {
        get {
            return State != null;
        }
    }

    public List<int> LastExecuted {
        get {
            var rv = new List<int>();
            if (State != null) {
                // using 'var' does not compile here for reasons, sooo just explicitly type it
                foreach (Imperative.Statement stmt in State.LastExecuted) {
                    var id = stmt.Meta.Id;
                    if (id > 0) rv.Add(id);
                }
            }
            return rv;
        }
    }

    public System.Object programState {
        get { // janky copy-out, assuming all args are actually strings (i.e. immutable)
            return null;
        }
    }

    public void Undo() {
        var robot = FindObjectOfType<Robot>();
        robot.Position = prevState.Postion;
        robot.FacingAxis = prevState.Axis;
        robot.FacingDirection = prevState.Dir;
        FindObjectOfType<Grid>().Undo();
    }

	// Use this for initialization
	void Start () {

	}
	
	// Update is called once per frame
	void Update () {
        if (!IsExecuting) return;

        if (lastStatementExecutionTime + DelayPerCommand < Time.fixedTime) {
            var command = Simulator.ExecuteUntilCommand(Program.Program, State);
            FindObjectOfType<Robot>().Execute(command);
            if (Simulator.IsDone(State)) {
                State = null;
            }
            lastStatementExecutionTime = Time.fixedTime;
        }
	}
}
