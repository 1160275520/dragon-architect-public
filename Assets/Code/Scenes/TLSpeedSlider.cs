using UnityEngine;
using System;
using System.Linq;
using System.Collections.Generic;
using Hackcraft;
using Hackcraft.Ast;

public class TLSpeedSlider : MonoBehaviour
{
    Func<bool> winPredicate;

	void Start() {
        var lh = GetComponent<LevelHelper>();

        var msg = "The <b>Speed Slider</b> changes the rate at which your program executes. This program takes a long time to run; speed it up by dragging the slider to <b>Fast</b>!";
        GetComponent<AllTheGUI>().CurrentMessage = msg;

        var progman = GetComponent<ProgramManager>();
        progman.SetIsEditable("MAIN", false);
        progman.LoadProgram("level_speed_slider");

        winPredicate = LevelHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, programWinPredicate });
	}

    void Update() {
        if (winPredicate()) {
            GetComponent<LevelHelper>().WinLevel();
        }
    }

    private bool programWinPredicate() {
        var progman = GetComponent<ProgramManager>();
        return progman.DelayPerCommand < 0.25;
    }
}
