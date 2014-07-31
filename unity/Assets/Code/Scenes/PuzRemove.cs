using UnityEngine;
using System.Collections.Generic;
using System;
using Hackcraft;

public class PuzRemove : MonoBehaviour
{
    
    Func<bool> winPredicate;
    
    void Start() {
        var lh = GetComponent<PuzzleHelper>();
        lh.SetInstructions(
            "Help me remove those three cubes!",
            "Add one more <object data=\"media/blockSvgs/removeblock.svg\" style=\"vertical-align:middle\"></object> to fix my program."
            );
        var progman = GetComponent<ProgramManager>();
        progman.LoadProgram("puzzle.remove.remove_blocks");
        var template = new IntVec3[] {};
        
        FindObjectOfType<MyCamera>().Rotate(-90);

        var grid = GetComponent<Grid>();
        var cube = GameObject.FindGameObjectWithTag("Cube");
        grid.AddObject(new IntVec3(0, 0, 3), cube);
        grid.AddObject(new IntVec3(0, 0, 4), cube);
        grid.AddObject(new IntVec3(0, 0, 5), cube);

        lh.CreateBlueprint(template);
        winPredicate = PuzzleHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateBlueprintPredicate(template) });
    }
    
    void Update() {
        if (winPredicate()) {
            GetComponent<PuzzleHelper>().WinLevel();
        }
    }
}

