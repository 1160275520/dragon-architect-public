using UnityEngine;
using System.Collections.Generic;
using System;
using Ruthefjord;

public class PuzMovement2D_1 : MonoBehaviour {

    private PuzzleHelper lh;

    void Start() {
        lh = GetComponent<PuzzleHelper>();
        lh.WinPredicate =  lh.GameIsRunningButDoneExecuting;
    }

    void Update() {
        if (lh.WinPredicate()) {
			GetComponent<PuzzleHelper>().WinLevel();
        }
    }
}
