using UnityEngine;
using System;
using System.Linq;
using System.Collections.Generic;
using Ruthefjord;
using Ruthefjord.Ast;

public class PuzSpeedSlider : MonoBehaviour
{
    Func<bool> winPredicate;

	void Start() {
        var lh = GetComponent<PuzzleHelper>();

        var progman = GetComponent<ProgramManager>();
        progman.LoadProgram("puzzle/tutorial.speed_slider");

        winPredicate = PuzzleHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, programWinPredicate });
	}

    void Update() {
        if (winPredicate()) {
            GetComponent<PuzzleHelper>().WinLevel();
        }
    }

    private bool programWinPredicate() {
        var progman = GetComponent<ProgramManager>();
        return progman.TicksPerStep < 15;
    }
}
