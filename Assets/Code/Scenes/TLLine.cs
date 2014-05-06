using UnityEngine;
using System;
using Hackcraft;
using Hackcraft.Ast;

public class TLLine : MonoBehaviour
{
    Func<bool> winPredicate;

	void Start() {
        var lh = GetComponent<LevelHelper>();
        GetComponent<AllTheGUI>().CurrentMessage = "The <b>Line</b> statement uses Repeat to save you time, blah blah. Use the line statement to replicate this manual repeat loop.";
        var progman = GetComponent<ProgramManager>();
        progman.Manipulator.Program = Hackcraft.Serialization.LoadFile("TestData/level_line_01.txt");

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
            if (s.Stmt.IsCall && s.Stmt.AsCall.Proc == "Line") {
                isCall = true;
            }
        });

        return isCall;
    }
}
