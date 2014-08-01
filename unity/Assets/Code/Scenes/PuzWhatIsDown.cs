using UnityEngine;
using System.Collections.Generic;
using System;
using Hackcraft;

public class PuzWhatIsDown : MonoBehaviour
{
    
    Func<bool> winPredicate;
    
    void Start() {
        var lh = GetComponent<PuzzleHelper>();
        lh.SetInstructions(
            "Help me get to the pink box!",
            "Use three <object data=\"media/blockSvgs/down.svg\" style=\"vertical-align:middle\"></object>."
            );
        var progman = GetComponent<ProgramManager>();
        var target = new IntVec3(0,0,0);
        
        lh.CreateRobotTarget(target);
        
        winPredicate = PuzzleHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateTargetPredicate(target) });
    }
    
    void Update() {
        if (winPredicate()) {
            GetComponent<PuzzleHelper>().WinLevel();
        }
    }
}
