using UnityEngine;
using System;
using System.Linq;
using Hackcraft;
using Hackcraft.Ast;
using System.Collections.Generic;

public class PuzRotate: MonoBehaviour
{
    Func<bool> winPredicate;
    
    void Start () {
        var lh = GetComponent<PuzzleHelper>();
        var rotCW = "<object data=\"media/rotateCWButon.png\" style=\"vertical-align:middle\"></object>";
        var rotCCW = "<object data=\"media/rotateCCWButton.png\" style=\"vertical-align:middle\"></object>";
        lh.SetInstructions(
            "Solve the challenge by filling in the blueprint!",
            String.Format("It's hard to see where the blocks should go from this angle! When you need a better view, use the {0} and {1} buttons to rotate your view.", rotCW, rotCCW)
            );
        
        var template = new List<IntVec3>();
        for (int x = 0; x < 4; x++) {
            template.Add(new IntVec3(0, x, x + 1));
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