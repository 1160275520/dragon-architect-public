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

        public override string ToString() {
            return "(" + Type + " " + Arg1 + " " + Arg2 + ")";
        }
    }

    public class Procedure
    {
        public string Name;
        public string ParamName; // nullable
        public List<Statement> Body = new List<Statement>();

        public override string ToString() {
            var result = Name + ":\n";
            foreach (Statement statement in Body) {
                result += statement + "\n";
            }
            return result;
        }
    }

    public class Program
    {
        public Dictionary<string, Procedure> Procedures;
    }
}

public class ProgramManager : MonoBehaviour {

    public float DelayPerCommand = 0.0f;

    public AST.Program Program = new AST.Program();

    public class CallStackState
    {
        public AST.Procedure Proc;
        public object Arg;
        public int Statement;
    }

    private Stack<CallStackState> callStack = new Stack<CallStackState>();

    private float lastStatementExecutionTime = 0.0f;
    private IntVec3 prevPostion;

    public void Execute() {
        callStack.Clear();
        callStack.Push(new CallStackState { Proc = Program.Procedures["Main"], Statement = 0 });
        lastStatementExecutionTime = Time.fixedTime;
        var curPostion = FindObjectOfType<Robot>().Position;
        prevPostion = new IntVec3 { X = curPostion.X, Y = curPostion.Y, Z = curPostion.Z };
    }

    public void Stop() {
        callStack.Clear();
    }

    public bool IsExecuting {
        get {
            return callStack.Count > 0;
        }
    }

    public CallStackState programState {
        get { // janky copy-out, assuming all args are actually strings (i.e. immutable)
            try {
                var copyState = new CallStackState();
                var curState = callStack.Peek();
                var copyProc = new AST.Procedure { Body = new List<AST.Statement>(), Name = curState.Proc.Name, ParamName = curState.Proc.ParamName };
                foreach (AST.Statement statement in curState.Proc.Body) {
                    copyProc.Body.Add(new AST.Statement { Type = statement.Type, Arg1 = statement.Arg1, Arg2 = statement.Arg2 });
                }
                copyState.Proc = copyProc;
                copyState.Statement = curState.Statement;
                copyState.Arg = curState.Arg;
                return copyState;
            } catch (InvalidOperationException) {
                return null;
            }
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
                        var newproc = Program.Procedures.FirstOrDefault(p => p.Key == name).Value;
                        Debug.Log(name + " " + statement.Arg2);
                        if (newproc != null) {
                            callStack.Push(new CallStackState { Proc = newproc, Statement = 0, Arg = statement.Arg2 });
                        } else {
                            // else assume it was a robot command, try to get the robot to execute it
                            if (statement.Arg2 is string) {
                                for (int i = 0; i < int.Parse((string)statement.Arg2); i++) {
                                    FindObjectOfType<Robot>().Execute(name);
                                }
                            } else {
                                FindObjectOfType<Robot>().Execute(name);
                            }
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
