using UnityEngine;
using System;
using System.Linq;
using Hackcraft;
using Hackcraft.Ast;
using System.Collections.Generic;

public class TLCamera: MonoBehaviour
{
    Func<bool> winPredicate;

	void Start () {
        var lh = GetComponent<LevelHelper>();
        GetComponent<AllTheGUI>().CurrentMessage = "It's hard to see where the blocks should go from this angle! When you need a better view, use the <b>Rotate Left</b> and <b>Rotate Right</b> buttons to rotate your view. Try it, and help me solve the challenge!";
        var progman = GetComponent<ProgramManager>();
        progman.Manipulator.ClearAll();

        var template = new List<IntVec3>();
        for (int x = 0; x < 4; x++) {
            template.Add(new IntVec3(0, x, x + 1));
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
