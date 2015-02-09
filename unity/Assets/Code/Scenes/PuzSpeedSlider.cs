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
        lh.WinPredicate = PuzzleHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, programWinPredicate });
	}

    void Update() {
        if (lh.WinPredicate()) {
            GetComponent<PuzzleHelper>().WinLevel();
        }
    }

    public bool programWinPredicate() {
        var progman = GetComponent<ProgramManager>();
        return progman.TicksPerStep < 15;
    }
}
