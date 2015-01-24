using UnityEngine;
using System.Collections.Generic;
using System;
using Ruthefjord;

public class PuzRemove : MonoBehaviour
{
    
    PuzzleHelper lh;
    
    void Start() {
        lh = GetComponent<PuzzleHelper>();

        var template = new IntVec3[] {};

        lh.CreateBlueprint(template);
        lh.WinPredicate = PuzzleHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateBlueprintPredicate(template) });
    }
    
    void Update() {
        if (lh.WinPredicate()) {
            GetComponent<PuzzleHelper>().WinLevel();
        }
    }
}

