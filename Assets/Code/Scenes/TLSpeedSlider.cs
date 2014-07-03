using UnityEngine;
using System;
using System.Linq;
using System.Collections.Generic;
using Hackcraft;
using Hackcraft.Ast;

public class TLSpeedSlider : MonoBehaviour
{
    Func<bool> winPredicate;

	void Start() {
        var lh = GetComponent<LevelHelper>();

        var msg = "something something time slider";
        GetComponent<AllTheGUI>().CurrentMessage = msg;

        var progman = GetComponent<ProgramManager>();
        //progman.SetIsEditable("F1", false);
        //progman.LoadProgram("level_repeat_01");

        //var template = new List<IntVec3>();
        //const int size = 20;
        //for (int x = 0; x < size; x++) {
        //    template.Add(new IntVec3(x+1, 0, x+1));
        //}

        //lh.CreateBlueprint(template);
        //winPredicate = LevelHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateBlueprintPredicate(template) });
        winPredicate = LevelHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, programWinPredicate });
	}

    void Update() {
        if (winPredicate()) {
            GetComponent<LevelHelper>().WinLevel();
        }
    }

    private bool programWinPredicate() {
        var progman = GetComponent<ProgramManager>();
        return progman.DelayPerCommand < 0.25;
    }
}
