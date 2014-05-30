using UnityEngine;
using System;
using System.Linq;
using Hackcraft.Ast;

public class TLCall2 : MonoBehaviour
{
    Func<bool> winPredicate;

	void Start() {
        var lh = GetComponent<LevelHelper>();
        GetComponent<AllTheGUI>().CurrentMessage = "In this challenge, help me place at least 15 blocks. Use <object data=\"media/f1.svg\" style=\"vertical-align:middle\"></object> to tell me to do the same action many times.";
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
