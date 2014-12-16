using UnityEngine;
using System.Collections.Generic;
using System;
using Ruthefjord;

public class PuzWhatIsDown : MonoBehaviour
{
    
    Func<bool> winPredicate;
    
    void Start() {
        var lh = GetComponent<PuzzleHelper>();

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
