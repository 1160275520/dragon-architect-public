using UnityEngine;
using System.Collections.Generic;
using System;
using Hackcraft;

public class PuzMovement2D_3 : MonoBehaviour {
	
	private Func<bool> winPredicate;
	
	void Start() {
		var lh = GetComponent<LevelHelper>();
		var target = new IntVec3(1,0,1);
		lh.CreateRobotTarget(target);
        var global = FindObjectOfType<Global>();
        global.CurrentPuzzle = global.CurrentPuzzle.UpdateStartingProgramToPreserve;
		winPredicate = LevelHelper.All( new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateTargetPredicate(target) });
	}
	
	void Update() {
		if (winPredicate()) {
			GetComponent<LevelHelper>().WinLevel();
		}
	}
}
