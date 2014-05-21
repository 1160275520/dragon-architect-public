using UnityEngine;
using System;
using Hackcraft;
using Hackcraft.Ast;

public class TLLine : MonoBehaviour
{
    Func<bool> winPredicate;

	void Start() {
        var lh = GetComponent<LevelHelper>();
        GetComponent<AllTheGUI>().CurrentMessage = "The <b>Line</b> statement uses <b>Repeat</b> on <b>Forward</b> and <b>PlaceBlock</b>. Use the <b>Line</b> statement to do the same thing as the commands already in my program.";
        var progman = GetComponent<ProgramManager>();
        progman.LoadProgram("level_line_01");

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
