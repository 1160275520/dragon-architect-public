using UnityEngine;
using System;
using System.Linq;
using Hackcraft.Ast;

public class TLCall2 : MonoBehaviour
{
    Func<bool> winPredicate;

	void Start() {
        var lh = GetComponent<LevelHelper>();
        GetComponent<AllTheGUI>().CurrentMessage = "In this challenge, try to place at least 15 blocks. Use the <b>Call</b> statement to tell <b>Robot/Dragon/Salamander</b> to do the same action many times.";
        var progman = GetComponent<ProgramManager>();
        progman.Manipulator.ClearAll();

        winPredicate = LevelHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateMinBlockCountPredicate(15) });
	}

    void Update() {
        if (winPredicate()) {
            GetComponent<LevelHelper>().WinLevel();
        }
    }
}
