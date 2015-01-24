using UnityEngine;
using System;
using System.Linq;
using System.Collections.Generic;
using Ruthefjord;
using Ruthefjord.Ast;

public class PuzRepeat101Cubes : MonoBehaviour {
    
    PuzzleHelper lh;
    
    void Start() {
        lh = GetComponent<PuzzleHelper>();

        var progman = GetComponent<ProgramManager>();
        progman.TicksPerStep = 10; // make execution a little faster, as there's no speed slider yet and the programs will need to place lots of blocks

        lh.WinPredicate = PuzzleHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateMinCubeCountPredicate(101) });
	}
	
	// Update is called once per frame
	void Update () {
        if (lh.WinPredicate()) {
            GetComponent<PuzzleHelper>().WinLevel();
        }
	}
}
