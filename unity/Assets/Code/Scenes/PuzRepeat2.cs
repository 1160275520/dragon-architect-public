using UnityEngine;
using System;
using System.Linq;
using Hackcraft;
using Hackcraft.Ast;
using System.Collections.Generic;

public class PuzRepeat2 : MonoBehaviour
{
    Func<bool> winPredicate;

	void Start () {
        var lh = GetComponent<PuzzleHelper>();
        lh.SetInstructions(
            "In this challenge, help me make a 10x10 square.",
            "You might want to use one <object data=\"media/blockSvgs/repeat.svg\" style=\"vertical-align:middle\"></object> and one <object data=\"media/blockSvgs/repeat4.svg\" style=\"vertical-align:middle\"></object>."
        );
        var progman = GetComponent<ProgramManager>();
        progman.Manipulator.ClearAll();
        progman.SetHighlighted("controls_repeat", true);

        var template = new List<IntVec3>();
        const int size = 10;
        const int offset = 1;
        for (int x = 0; x < size; x++) {
            if (x == 0 || x == size - 1) {
                for (int z = 0; z < size; z++) {
                    template.Add(new IntVec3(x, 0, z + offset));
                }
            } else {
                template.Add(new IntVec3(x, 0, offset));
                template.Add(new IntVec3(x, 0, size - 1 + offset));
            }
        }


        lh.CreateBlueprint(template);
        winPredicate = PuzzleHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateBlueprintPredicate(template) });
	}

    void Update() {
        if (winPredicate()) {
            GetComponent<PuzzleHelper>().WinLevel();
        }
    }
}
