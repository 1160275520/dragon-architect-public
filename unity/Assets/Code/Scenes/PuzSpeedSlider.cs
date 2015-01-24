using UnityEngine;
using System;
using System.Linq;
using System.Collections.Generic;
using Ruthefjord;
using Ruthefjord.Ast;

public class PuzSpeedSlider : MonoBehaviour
{
    PuzzleHelper lh;

	void Start() {
        lh = GetComponent<PuzzleHelper>();

        var progman = GetComponent<ProgramManager>();
        progman.LoadProgram("puzzle/tutorial.speed_slider");

        lh.WinPredicate =  PuzzleHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, programWinPredicate });
	}

    void Update() {
        if (lh.WinPredicate()) {
            GetComponent<PuzzleHelper>().WinLevel();
        }
    }

    private bool programWinPredicate() {
        var progman = GetComponent<ProgramManager>();
        return progman.TicksPerStep < 15;
    }
}
