using UnityEngine;
using System.Collections.Generic;
using System;
using Hackcraft;

public class TLPlacement : MonoBehaviour
{

    Func<bool> winPredicate;

    void Start() {
        var lh = GetComponent<LevelHelper>();
        GetComponent<AllTheGUI>().CurrentMessage = "I need to place some blocks in the blue boxes, but my program skips one! Use one <object data=\"media/placeblock.svg\" style=\"vertical-align:middle\"></object> to fix my program.";
        var progman = GetComponent<ProgramManager>();
        progman.LoadProgram("TLPlacement");
        progman.SetHighlighted("PlaceBlock", true);
        var template = new IntVec3[] {
            new IntVec3(0,0,3),
            new IntVec3(0,0,4),
            new IntVec3(0,0,5),
        };

        FindObjectOfType<MyCamera>().Rotate(-90);

        lh.CreateBlueprint(template);
        winPredicate = LevelHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateBlueprintPredicate(template) });
    }

    void Update() {
        if (winPredicate()) {
            GetComponent<LevelHelper>().WinLevel();
        }
    }
}
