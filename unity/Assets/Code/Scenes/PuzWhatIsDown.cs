using UnityEngine;
using System.Collections.Generic;
using System;
using Ruthefjord;

public class PuzWhatIsDown : MonoBehaviour
{
    
    PuzzleHelper lh;
    
    void Start() {
        lh = GetComponent<PuzzleHelper>();

        var target = new IntVec3(0,0,0);
        
        lh.CreateRobotTarget(target);
        
        lh.WinPredicate = PuzzleHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateTargetPredicate(target) });
    }
    
    void Update() {
        if (lh.WinPredicate()) {
            GetComponent<PuzzleHelper>().WinLevel();
        }
    }
}
