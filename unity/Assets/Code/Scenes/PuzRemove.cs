using UnityEngine;
using System.Collections.Generic;
using System;
using Rutherfjord;

public class PuzRemove : MonoBehaviour
{
    
    Func<bool> winPredicate;
    
    void Start() {
        var lh = GetComponent<PuzzleHelper>();

        var progman = GetComponent<ProgramManager>();
        progman.LoadProgram("puzzle.remove.remove_blocks");
        var template = new IntVec3[] {};
        
        FindObjectOfType<MyCamera>().Rotate(-90);

        lh.CreateBlueprint(template);
        winPredicate = PuzzleHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateBlueprintPredicate(template) });
    }
    
    void Update() {
        if (winPredicate()) {
            GetComponent<PuzzleHelper>().WinLevel();
        }
    }
}

