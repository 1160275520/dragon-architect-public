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

    private AST.Program program = new AST.Program();

    public void AppendCommand(AST.Command c) {
        program.Body.Add(c);
    }

    public void Clear() {
        program.Body.Clear();
    }

    public void Execute() {
        var robot = FindObjectOfType<Robot>();
        foreach (var c in program.Body) {
            robot.Execute(c);
        }
    }

	// Use this for initialization
	void Start () {
	
	}
	
	// Update is called once per frame
	void Update () {
	
	}
}
