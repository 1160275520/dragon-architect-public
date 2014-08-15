using UnityEngine;
using System.Collections.Generic;
using System;
using Ruthefjord;

public class PuzMovementArgs : MonoBehaviour
{

    Func<bool> winPredicate;

    void Start() {
        var lh = GetComponent<PuzzleHelper>();

        var progman = GetComponent<ProgramManager>();
        progman.LoadProgram("puzzle/tutorial.arguments");

        var template = new IntVec3[] {
                new IntVec3(3,0,0),
                new IntVec3(6,0,0),
                new IntVec3(6,0,-2),
            };

        lh.CreateBlueprint(template);

        winPredicate = PuzzleHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateBlueprintPredicate(template) });
    }

    void Update() {
        if (winPredicate()) {
            GetComponent<PuzzleHelper>().WinLevel();
        }
    }
}
