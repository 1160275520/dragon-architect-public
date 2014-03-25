using UnityEngine;
using System.Collections.Generic;

public static class AST {

    public enum Command
    {
        MoveForward,
        TurnLeft,
        TurnRight,
        PlaceBlock
    }

    public class Program
    {
        public List<Command> Body = new List<Command>();
    }
}

public class ProgramManager : MonoBehaviour {

    public float DelayPerCommand = 0.8f;

    private AST.Program program = new AST.Program();
    private int currentStatement = -1;
    private float lastStatementExecutionTime = 0.0f;

    public void AppendCommand(AST.Command c) {
        program.Body.Add(c);
    }

    public void Clear() {
        program.Body.Clear();
    }

    public void Execute() {
        currentStatement = 0;
        lastStatementExecutionTime = Time.fixedTime;
    }

	// Use this for initialization
	void Start () {
	
	}
	
	// Update is called once per frame
	void Update () {
        if (currentStatement >= 0 && lastStatementExecutionTime + DelayPerCommand < Time.fixedTime) {
            if (currentStatement >= program.Body.Count) {
                currentStatement = -1;
            } else {
                FindObjectOfType<Robot>().Execute(program.Body[currentStatement++]);
                lastStatementExecutionTime = Time.fixedTime;
            }
        }
	}
}
