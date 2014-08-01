using UnityEngine;
using System;
using System.Linq;
using System.Collections.Generic;
using Hackcraft;
using Hackcraft.Ast;

public class PuzRepeat101Blocks : MonoBehaviour {
    
    Func<bool> winPredicate;
    
    void Start() {
        var lh = GetComponent<PuzzleHelper>();

        var rep = "<object data=\"media/blockSvgs/repeat.svg\" style=\"vertical-align:middle\"></object>";
        lh.SetInstructions(
            String.Format("Write a program to have me place 101 blocks!"),
            String.Format("It may be helpful to use {0}.", rep)
        );

        var progman = GetComponent<ProgramManager>();
        progman.TicksPerStep = 10; // make execution a little faster, as there's no speed slider yet and the programs will need to place lots of blocks

        winPredicate = PuzzleHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateMinBlockCountPredicate(101) });
	}
	
	// Update is called once per frame
	void Update () {
        if (winPredicate()) {
            GetComponent<PuzzleHelper>().WinLevel();
        }
	}
}
