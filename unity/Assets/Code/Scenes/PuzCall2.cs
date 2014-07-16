using UnityEngine;
using System;
using System.Linq;
using Hackcraft.Ast;

public class PuzCall2 : MonoBehaviour
{
    Func<bool> winPredicate;

	void Start() {
        var lh = GetComponent<LevelHelper>();
        lh.SetInstructions(
            "In this challenge, help me place at least 15 blocks.",
            "You could do it by having <b>F1</b> place some blocks and using a bunch of <object data=\"media/blockSvgs/f1.svg\" style=\"vertical-align:middle\"></object> in <b>MAIN</b> to do <b>F1</b> many times."
        );
        var progman = GetComponent<ProgramManager>();
        progman.Manipulator.ClearAll();
        progman.SetHighlighted("procedures_callnoreturn", true);
        winPredicate = LevelHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateMinBlockCountPredicate(15) });
	}

    void Update() {
        if (winPredicate()) {
            GetComponent<LevelHelper>().WinLevel();
        }
    }
}
