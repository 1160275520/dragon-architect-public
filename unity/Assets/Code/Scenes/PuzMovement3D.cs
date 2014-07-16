using UnityEngine;
using System.Collections.Generic;
using System;
using Hackcraft;

public class PuzMovement3D : MonoBehaviour
{

    Func<bool> winPredicate;

    void Start() {
        var lh = GetComponent<LevelHelper>();
        lh.SetInstructions(
            "Help me get to the pink box!",
            "Use two <object data=\"media/blockSvgs/up.svg\" style=\"vertical-align:middle\"></object> to complete my program."
        );
        var progman = GetComponent<ProgramManager>();
        progman.LoadProgram("puzzle.tutorial.movement3d");
        progman.SetHighlighted("Up", true);
        var target = new IntVec3(3,5,0);

        lh.CreateRobotTarget(target);
        // offset win location since Sala floats one cell above her actual location
        winPredicate = LevelHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateTargetPredicate(target) });
    }

    void Update() {
        if (winPredicate()) {
            GetComponent<LevelHelper>().WinLevel();
        }
    }
}
