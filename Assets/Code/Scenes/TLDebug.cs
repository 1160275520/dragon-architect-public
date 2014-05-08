using UnityEngine;
using System;
using System.Linq;
using Hackcraft;
using Hackcraft.Ast;
using System.Collections.Generic;

public class TLDebug : MonoBehaviour
{
    Func<bool> winPredicate;

	void Start () {
        var lh = GetComponent<LevelHelper>();
        GetComponent<AllTheGUI>().CurrentMessage = "The given program is not quite correct.... Can you fix it? Click <b>RUN</b> to run the program. You can see which program steps are executing by looking at the highlighted statements. It looks like some statements need to be added.";
        var progman = GetComponent<ProgramManager>();
        progman.LoadProgram("level_debug_01");

        var template = new List<IntVec3>();
        for (int x = 0; x < 6; x++) {
            for (int z = 0; z < 5; z++) {
                template.Add(new IntVec3(x, 0, z + 3));
            }
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
