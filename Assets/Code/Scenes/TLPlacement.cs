using UnityEngine;
using System.Collections.Generic;
using System;
using Hackcraft;

public class TLPlacement : MonoBehaviour
{

    Func<bool> winPredicate;

    void Start() {
        var lh = GetComponent<LevelHelper>();
		GetComponent<AllTheGUI>().CurrentMessage = "I need to place some blocks! Use <b>PlaceBlock</b> to complete my program and click <b>RUN</b>.";
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
