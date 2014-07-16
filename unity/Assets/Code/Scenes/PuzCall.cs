using UnityEngine;
using System;
using System.Collections.Generic;
using Hackcraft;
using Hackcraft.Ast;

public class PuzCall : MonoBehaviour
{
    Func<bool> winPredicate;

	void Start() {
        var lh = GetComponent<LevelHelper>();

        var f1 = "<object data=\"media/blockSvgs/f1.svg\" style=\"vertical-align:middle\"></object>";
        String.Format("A procedure (like <b>F1</b>) can be used inside another procedure (like <b>MAIN</b>). {0} does everything inside <b>F1</b>. You can use {0} multiple times to do the same thing multiple times. Fill the blueprint using {0}!", f1);
        lh.SetInstructions(
            String.Format("A procedure (like <b>F1</b>) can be used inside another procedure (like <b>MAIN</b>).", f1),
            String.Format("{0} does everything inside <b>F1</b>. You can use {0} multiple times to do the same thing multiple times. Fill the blueprint using {0}!", f1)
        );

        var progman = GetComponent<ProgramManager>();
        progman.LoadProgram("puzzle.tutorial.call_1");
        progman.SetIsFrozenBlocks("F1", true);
        progman.SetIsFrozenArguments("F1", true);
        progman.SetHighlighted("procedures_callnoreturn", true);

        var template = new List<IntVec3>();
        const int size = 6;
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
