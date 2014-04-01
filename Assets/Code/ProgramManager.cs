using UnityEngine;
using System.Collections.Generic;
using System.Linq;
using System;

public static class AST
{
    public enum StatementType
    {
        Call, // name:string, arg:object option
        Repeat, // name:string, ntimes:int
    }

    public class Statement
    {
        public StatementType Type;
        public object Arg1;
        public object Arg2;
    }

    public class Procedure
    {
        public string Name;
        public string ParamName; // nullable
        public List<Statement> Body = new List<Statement>();
    }

    public class Program
    {
        public List<Procedure> Procedures;
    }
}

public class ProgramManager : MonoBehaviour {

    public float DelayPerCommand = 0.8f;

    public AST.Program Program = new AST.Program();

    public class CallStackState
    {
        public AST.Procedure Proc;
        public object Arg;
        public int Statement;
    }

    private Stack<CallStackState> callStack = new Stack<CallStackState>();

    private float lastStatementExecutionTime = 0.0f;

    public void Execute() {
        callStack.Clear();
        callStack.Push(new CallStackState { Proc = Program.Procedures[0], Statement = 0 });
        lastStatementExecutionTime = Time.fixedTime;
    }

	// Use this for initialization
	void Start () {

	}
	
	// Update is called once per frame
	void Update () {
        if (callStack.Count <= 0) return;

        var proc = callStack.Peek().Proc;

        if (lastStatementExecutionTime + DelayPerCommand < Time.fixedTime) {
            if (callStack.Peek().Statement >= proc.Body.Count()) {
                callStack.Pop();
                Update(); // recursively call self to unwind the stack

            } else {
                var statement = proc.Body[callStack.Peek().Statement++];
                switch (statement.Type) {
                    case AST.StatementType.Call: {
                        var name = (string)statement.Arg1;
                        Debug.Log(name);
                        var newproc = Program.Procedures.FirstOrDefault(p => p.Name == name);

                        if (newproc != null) {
                            callStack.Push(new CallStackState { Proc = newproc, Statement = 0, Arg = statement.Arg2 });
                        } else {
                            // else assume it was a robot command, try to get the robot to execute it
                            FindObjectOfType<Robot>().Execute(name);
                            lastStatementExecutionTime = Time.fixedTime;
                        }

                        break;
                    }

                    case AST.StatementType.Repeat: {
                        var name = (string)statement.Arg1;
                        var numtimes = Convert.ToInt32((string)statement.Arg2); // needs to be validated (e.g. not negative)

                        // create a anon procedure to do the repeat
                        var newproc = new AST.Procedure { Body = (from x in Enumerable.Range(0, numtimes) select new AST.Statement { Type = AST.StatementType.Call, Arg1 = name }).ToList<AST.Statement>() };
                        callStack.Push(new CallStackState { Proc = newproc, Statement = 0 });

                        break;
                    }
                }

            }
        }
	}
}
