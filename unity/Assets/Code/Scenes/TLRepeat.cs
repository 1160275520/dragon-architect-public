using UnityEngine;
using System;
using System.Linq;
using System.Collections.Generic;
using Hackcraft;
using Hackcraft.Ast;

public class TLRepeat : MonoBehaviour
{
    Func<bool> winPredicate;

	void Start() {
        var lh = GetComponent<LevelHelper>();

        var rep = "<object data=\"media/blockSvgs/repeat.svg\" style=\"vertical-align:middle\"></object>";
        var f1 = "<object data=\"media/blockSvgs/f1.svg\" style=\"vertical-align:middle\"></object>";
        var msg = String.Format("{0} lets me do everything inside multiple times. It can repeat a statement or procedure many times! Help me use {0} in <b>MAIN</b> to fill the blueprint by repeating {1}!.", rep, f1);
        GetComponent<AllTheGUI>().CurrentMessage = msg;

        var progman = GetComponent<ProgramManager>();
        progman.SetIsEditable("F1", false);
        progman.LoadProgram("level_repeat_01");
        progman.SetHighlighted("controls_repeat", true);

        var template = new List<IntVec3>();
        const int size = 20;
        for (int x = 0; x < size; x++) {
            template.Add(new IntVec3(x+1, 0, x+1));
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
