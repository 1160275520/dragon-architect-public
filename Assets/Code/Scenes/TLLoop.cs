using UnityEngine;
using System;
using System.Linq;
using Hackcraft;
using Hackcraft.Ast;
using System.Collections.Generic;

public class TLLoop : MonoBehaviour
{
    Func<bool> winPredicate;

	void Start () {
        var lh = GetComponent<LevelHelper>();
        GetComponent<AllTheGUI>().CurrentMessage = "Functions let you repeat the same code multiple times. This existing algorithm doesn't have enough space to fill the entire blueprint! It tries to do everything in one function by repeating code. We can fix it with the repeat statement. Pull the common code into <b>F1</b> and use the repeat statement.";
        var progman = GetComponent<ProgramManager>();
        progman.LoadProgram("level_loop_01");

        var template = new List<IntVec3>();
        for (int x = 0; x < 6; x++) {
            template.Add(new IntVec3(x, 0, x));
            template.Add(new IntVec3(x, 0, x+1));
        }


        lh.CreateBlueprint(template);
        winPredicate = LevelHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateBlueprintPredicate(template) });
	}

    void Update() {
        if (winPredicate()) {
            GetComponent<LevelHelper>().WinLevel();
        }
    }
}
