using UnityEngine;
using System.Collections.Generic;
using System;
using Hackcraft;

public class PuzWhatIsUp : MonoBehaviour
{

    Func<bool> winPredicate;

    void Start() {
        var lh = GetComponent<PuzzleHelper>();
        lh.SetInstructions(
            "Help me get to the pink box!",
            "Use two <object data=\"media/blockSvgs/up.svg\" style=\"vertical-align:middle\"></object> to complete my program."
        );
        var progman = GetComponent<ProgramManager>();
        progman.LoadProgram("puzzle.up.what_is_up");
        var target = new IntVec3(3,5,0);

        lh.CreateRobotTarget(target);

        winPredicate = PuzzleHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateTargetPredicate(target) });
    }

    void Update() {
        if (winPredicate()) {
            GetComponent<PuzzleHelper>().WinLevel();
        }
    }
}