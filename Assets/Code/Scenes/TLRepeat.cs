using UnityEngine;
using System;
using System.Linq;
using Hackcraft;
using Hackcraft.Ast;

public class TLRepeat : MonoBehaviour
{
    Func<bool> winPredicate;

	void Start() {
        var lh = GetComponent<LevelHelper>();
        GetComponent<AllTheGUI>().CurrentMessage = "<object data=\"media/repeat.svg\" style=\"vertical-align:middle\"></object> lets me do everything inside multiple times. Help me use <object data=\"media/repeat.svg\" style=\"vertical-align:middle\"></object> to see what it does.";
        var progman = GetComponent<ProgramManager>();
        progman.SetHighlighted("controls_repeat", true);
        winPredicate = LevelHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, programWinPredicate });
	}

    void Update() {
        if (winPredicate()) {
            GetComponent<LevelHelper>().WinLevel();
        }
    }

    private bool programWinPredicate() {
        var program = GetComponent<ProgramManager>().Manipulator.Program;

        bool isRepeat = false;

        Imperative.iterStatementPA(program.Procedures["MAIN"], (s) => {
            if (s.Stmt.IsRepeat) {
                isRepeat = true;
            }
        });

        return isRepeat;
    }
}
