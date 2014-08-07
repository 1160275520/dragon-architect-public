using UnityEngine;
using System;
using System.Linq;
using System.Collections.Generic;
using Ruthefjord;
using Ruthefjord.Ast;

public class PuzRepeatFixedProgram : MonoBehaviour {

    Func<bool> winPredicate;
    
    void Start() {
        var lh = GetComponent<PuzzleHelper>();
        
        var progman = GetComponent<ProgramManager>();
        progman.LoadProgram("puzzle.repeat.repeat_fixedProgram");
        lh.SetIsFrozenBlocks("MAIN", true);
        lh.SetIsFrozenArguments("MAIN", true);
        
        var template = new List<IntVec3>();
        const int size = 10;
        for (int x = 0; x < size; x++) {
            template.Add(new IntVec3(x+1, 0, x+1));
        }
        
        lh.CreateBlueprint(template);
        winPredicate = PuzzleHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateBlueprintPredicate(template) });
    }
    
    void Update() {
        if (winPredicate()) {
            GetComponent<PuzzleHelper>().WinLevel();
        }
    }
}
