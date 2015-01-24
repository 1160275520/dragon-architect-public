using UnityEngine;
using System.Collections.Generic;
using System;
using Ruthefjord;

public class PuzMovement2D_1 : MonoBehaviour {

    private PuzzleHelper lh;

    void Start() {
        lh = GetComponent<PuzzleHelper>();
        var progman = GetComponent<ProgramManager>();
        progman.LoadProgram("puzzle/tutorial.movement2d");
        lh.WinPredicate =  lh.GameIsRunningButDoneExecuting;
    }

    void Update() {
        if (lh.WinPredicate()) {
			GetComponent<PuzzleHelper>().WinLevel();
        }
    }
}
