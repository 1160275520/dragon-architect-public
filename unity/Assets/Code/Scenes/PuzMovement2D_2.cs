using UnityEngine;
using System.Collections.Generic;
using System;
using Ruthefjord;

public class PuzMovement2D_2 : MonoBehaviour {

    PuzzleHelper lh;

    void Start() {
        lh = GetComponent<PuzzleHelper>();
		var target = new IntVec3(2,0,0);
        lh.CreateRobotTarget(target);
		lh.WinPredicate =  PuzzleHelper.All( new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateTargetPredicate(target) });
	}
	
	void Update() {
        if (lh.WinPredicate()) {
            GetComponent<PuzzleHelper>().WinLevel();
        }
    }
}
