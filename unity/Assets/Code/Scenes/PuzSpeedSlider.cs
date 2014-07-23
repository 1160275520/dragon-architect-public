using UnityEngine;
using System;
using System.Linq;
using System.Collections.Generic;
using Hackcraft;
using Hackcraft.Ast;

public class PuzSpeedSlider : MonoBehaviour
{
    Func<bool> winPredicate;

	void Start() {
        var lh = GetComponent<PuzzleHelper>();

        lh.SetInstructions(
            "The <b>Speed Slider</b> changes the rate at which your program executes.",
            "This program takes a long time to run; speed it up by dragging the slider to <b>Fast</b>!"
        );

        var progman = GetComponent<ProgramManager>();
        progman.LoadProgram("puzzle.tutorial.speed_slider");
        lh.SetIsFrozenBlocks("MAIN", true);
        lh.SetIsFrozenArguments("MAIN", true);

        winPredicate = PuzzleHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, programWinPredicate });
	}

    void Update() {
        if (winPredicate()) {
            GetComponent<PuzzleHelper>().WinLevel();
        }
    }

    private bool programWinPredicate() {
        var progman = GetComponent<ProgramManager>();
        return progman.DelayPerCommand < 0.25;
    }
}
