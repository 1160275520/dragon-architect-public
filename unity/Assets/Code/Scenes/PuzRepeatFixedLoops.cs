using UnityEngine;
using System;
using System.Linq;
using System.Collections.Generic;
using Hackcraft;
using Hackcraft.Ast;

public class PuzRepeatFixedLoops : MonoBehaviour {
    
    Func<bool> winPredicate;
    
    void Start() {
        var lh = GetComponent<PuzzleHelper>();
        
        var forward = "<object data=\"media/blockSvgs/forward.svg\" style=\"vertical-align:middle\"></object>";
        var right = "<object data=\"media/blockSvgs/right.svg\" style=\"vertical-align:middle\"></object>";
        var rep = "<object data=\"media/blockSvgs/repeat.svg\" style=\"vertical-align:middle\"></object>";
        lh.SetInstructions(
            String.Format("Help me fill in the blueprint by adding a {0} and a {1} to my program!", forward, right),
            String.Format("Try adding those blocks inside {0}.", rep)
        );
        
        var progman = GetComponent<ProgramManager>();
        progman.LoadProgram("puzzle.repeat.repeat_fixedLoops");
        lh.SetIsFrozenBlocks("MAIN", true);
        lh.SetIsFrozenArguments("MAIN", true);
        
        var template = new List<IntVec3>();
        const int size = 10;
        const int offset = 0;
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
