using UnityEngine;
using System;
using Hackcraft;
using Hackcraft.Ast;

public class TLCall : MonoBehaviour
{
    Func<bool> winPredicate;

	void Start() {
        var lh = GetComponent<LevelHelper>();
		GetComponent<AllTheGUI>().CurrentMessage = "A procedure (like <b>F1</b>) can be used inside another procedure (like <b>MAIN</b>). " +
            "<object data=\"media/f1.svg\" style=\"vertical-align:middle\"></object> does everything inside <b>F1</b>. Try using it inside <b>MAIN</b> to see what it does.";
        var progman = GetComponent<ProgramManager>();
        progman.SetIsEditable("F1", false);
        progman.LoadProgram("level_call_01");
        progman.SetHighlighted("procedures_callnoreturn", true);

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
