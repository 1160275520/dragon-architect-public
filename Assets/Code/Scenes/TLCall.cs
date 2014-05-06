using UnityEngine;
using System;
using Hackcraft;
using Hackcraft.Ast;

public class TLCall : MonoBehaviour
{
    Func<bool> winPredicate;

	void Start() {
        var lh = GetComponent<LevelHelper>();
        GetComponent<AllTheGUI>().CurrentMessage = "The <b>Call</b> statement does a thing, blah blah. Use the call statement.";
        var progman = GetComponent<ProgramManager>();
        progman.SetIsEditable("F1", false);
        progman.Manipulator.Program = Hackcraft.Serialization.LoadFile("TestData/level_call_01.txt");

        winPredicate = LevelHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, programWinPredicate });
	}

    void Update() {
        if (winPredicate()) {
            GetComponent<LevelHelper>().WinLevel();
        }
    }

    private bool programWinPredicate() {
        var program = GetComponent<ProgramManager>().Manipulator.Program;

        bool isCall = false;

        Imperative.iterStatementPA(program.Procedures["MAIN"], (s) => {
            if (s.Stmt.IsCall && !Library.Builtins.ContainsKey(s.Stmt.AsCall.Proc)) {
                isCall = true;
            }
        });

        return isCall;
    }
}
