using UnityEngine;
using System.Collections.Generic;
using System;
using Hackcraft;

public class TLMovement2D_3 : MonoBehaviour {
	
	private Func<bool> winPredicate;
	
	void Start() {
		var lh = GetComponent<LevelHelper>();
		var target = new IntVec3(1,0,1);
		lh.CreateRobotTarget(target);
		winPredicate = LevelHelper.All( new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateTargetPredicate(target) });
	}
	
	void Update() {
		if (winPredicate()) {
			GetComponent<LevelHelper>().WinLevel();
		}
	}
}
