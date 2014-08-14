using UnityEngine;
using System;
using System.Linq;
using System.Collections.Generic;
using Ruthefjord;
using Ruthefjord.Ast;

public class PuzRepeatFixedLoops : MonoBehaviour {
    
    Func<bool> winPredicate;
    
    void Start() {
        var lh = GetComponent<PuzzleHelper>();

        var progman = GetComponent<ProgramManager>();
        progman.LoadProgram("puzzle/repeat.repeat_fixedLoops");
        lh.SetIsFrozenBlocks("MAIN", true);
        lh.SetIsFrozenArguments("MAIN", true);
        
        var template = new List<IntVec3>();
        const int size = 10;
        const int offset = 1;
        for (int x = 0; x < size; x++) {
            if (x == 0 || x == size - 1) {
                for (int z = 0; z < size; z++) {
                    template.Add(new IntVec3(x, 0, z + offset));
                }
            } else {
                template.Add(new IntVec3(x, 0, offset));
                template.Add(new IntVec3(x, 0, size - 1 + offset));
            }
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
