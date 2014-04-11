using UnityEngine;
using System.Collections.Generic;
using System.Linq;
using System;

using Hackcraft;
using Hackcraft.Ast;

public class ProgramManager : MonoBehaviour {

    public float DelayPerCommand = 0.0f;

    public ImperativeAstManipulator Program = new ImperativeAstManipulator();
    private Simulator.State state;

    private float lastStatementExecutionTime = 0.0f;
    private IntVec3 prevPostion;

    public void Execute() {
        state = Simulator.CreateState(Program.Program, "Main");
        lastStatementExecutionTime = Time.fixedTime;
        var curPostion = FindObjectOfType<Robot>().Position;
        prevPostion = new IntVec3 { X = curPostion.X, Y = curPostion.Y, Z = curPostion.Z };
    }

    public void Stop() {
        state = null;
    }

    public bool IsExecuting {
        get {
            return state != null;
        }
    }


    public System.Object programState {
        get { // janky copy-out, assuming all args are actually strings (i.e. immutable)
            return null;
        }
    }

    public void Undo() {
        FindObjectOfType<Robot>().Position = prevPostion;
        FindObjectOfType<Grid>().Undo();
    }

	// Use this for initialization
	void Start () {

	}
	
	// Update is called once per frame
	void Update () {
        if (!IsExecuting) return;

        if (lastStatementExecutionTime + DelayPerCommand < Time.fixedTime) {
            var command = Simulator.ExecuteUntilCommand(Program.Program, state);
            FindObjectOfType<Robot>().Execute(command);
            if (Simulator.IsDone(state)) {
                state = null;
            }
            lastStatementExecutionTime = Time.fixedTime;
        }
	}
}
