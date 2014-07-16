using UnityEngine;
using System.Collections.Generic;
using System;
using Hackcraft;

public class TLMovement2D_2 : MonoBehaviour {

    private Func<bool> winPredicate;

    void Start() {
        var lh = GetComponent<LevelHelper>();
		var target = new IntVec3(0,0,2);
        lh.CreateRobotTarget(target);
		winPredicate = LevelHelper.All( new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateTargetPredicate(target) });
	}
	
	void Update() {
        if (winPredicate()) {
            GetComponent<LevelHelper>().WinLevel();
        }
    }
}
