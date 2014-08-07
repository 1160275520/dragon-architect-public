using UnityEngine;
using System.Collections.Generic;
using System;
using Rutherfjord;

public class PuzPlacement : MonoBehaviour
{

    Func<bool> winPredicate;

    void Start() {
        var lh = GetComponent<PuzzleHelper>();

        var progman = GetComponent<ProgramManager>();
        progman.LoadProgram("puzzle.tutorial.placement");
        var template = new IntVec3[] {
            new IntVec3(0,0,3),
            new IntVec3(0,0,4),
            new IntVec3(0,0,5),
        };

        FindObjectOfType<MyCamera>().Rotate(-90);

        lh.CreateBlueprint(template);
        winPredicate = PuzzleHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateBlueprintPredicate(template) });
    }

    void Update() {
        if (winPredicate()) {
            GetComponent<PuzzleHelper>().WinLevel();
        }
    }
}
