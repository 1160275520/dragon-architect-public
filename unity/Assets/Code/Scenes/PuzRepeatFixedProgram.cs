using UnityEngine;
using System;
using System.Linq;
using System.Collections.Generic;
using Ruthefjord;
using Ruthefjord.Ast;

public class PuzRepeatFixedProgram : MonoBehaviour {

    PuzzleHelper lh;
    
    void Start() {
        lh = GetComponent<PuzzleHelper>();
        
        var progman = GetComponent<ProgramManager>();
        progman.LoadProgram("puzzle/repeat.repeat_fixedProgram");
        
        var template = new List<IntVec3>();
        const int size = 10;
        for (int x = 2; x < size; x += 2) {
            template.Add(new IntVec3(x, 0, x));
        }
        
        lh.CreateBlueprint(template);
        lh.WinPredicate =  PuzzleHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateBlueprintPredicate(template) });
    }
    
    void Update() {
        if (lh.WinPredicate()) {
            GetComponent<PuzzleHelper>().WinLevel();
        }
    }
}
