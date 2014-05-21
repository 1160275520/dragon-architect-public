using UnityEngine;
using System;
using System.Linq;
using Hackcraft.Ast;

public class TLCall2 : MonoBehaviour
{
    Func<bool> winPredicate;

	void Start() {
        var lh = GetComponent<LevelHelper>();
		GetComponent<AllTheGUI>().CurrentMessage = "In this challenge, help me place at least 15 blocks. Use the purple <b>F1</b> block to tell me to do the same action many times.";
        var progman = GetComponent<ProgramManager>();
        progman.Manipulator.ClearAll();
        Debug.Log("proc count in TLCall2.start = " + GetComponent<ProgramManager>().Manipulator.Program.Procedures.Count);
        winPredicate = LevelHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateMinBlockCountPredicate(15) });
	}

    void Update() {
        if (winPredicate()) {
            GetComponent<LevelHelper>().WinLevel();
        }
    }
}
