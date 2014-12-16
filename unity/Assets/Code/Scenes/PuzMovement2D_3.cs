using UnityEngine;
using System.Collections.Generic;
using System;
using Ruthefjord;

public class PuzMovement2D_3 : MonoBehaviour {
	
	private Func<bool> winPredicate;
	
	void Start() {
		var lh = GetComponent<PuzzleHelper>();
		var target = new IntVec3(1,0,-1);
		lh.CreateRobotTarget(target);
		winPredicate = PuzzleHelper.All( new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateTargetPredicate(target) });
	}
	
	void Update() {
		if (winPredicate()) {
			GetComponent<PuzzleHelper>().WinLevel();
		}
	}
}
