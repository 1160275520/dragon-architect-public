using UnityEngine;
using System;
using System.Linq;
using System.Collections.Generic;
using Hackcraft;
using Hackcraft.Ast;

public class PuzRepeatFixedProgram : MonoBehaviour {

    Func<bool> winPredicate;
    
    void Start() {
        var lh = GetComponent<PuzzleHelper>();
        
        var rep = "<object data=\"media/blockSvgs/repeat5.svg\" style=\"vertical-align:middle\"></object>";
        lh.SetInstructions(
            String.Format("Help me fill in the blueprint by using {0}!", rep),
            String.Format("{0} tells me to do everything inside 5 times. You will need to attach it to my existing code, and change the number of times from 10 to 5.", rep)
        );
        
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
