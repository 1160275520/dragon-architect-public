using UnityEngine;
using System.Collections.Generic;
using System;
using Hackcraft;

public class TLMovement2D_1 : MonoBehaviour {

    private Func<bool> winPredicate;

    void Start() {
        var lh = GetComponent<LevelHelper>();
        var progman = GetComponent<ProgramManager>();
        progman.LoadProgram("TLMovement2D");
        winPredicate = lh.GameIsRunningButDoneExecuting;
    }

    void Update() {
        if (winPredicate()) {
			GetComponent<LevelHelper>().WinLevel();
        }
    }
}
