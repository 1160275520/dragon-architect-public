using UnityEngine;
using System;
using System.Linq;
using System.Collections.Generic;
using Ruthefjord;
using Ruthefjord.Ast;

public class PuzRepeatArgs : MonoBehaviour {
    
    PuzzleHelper lh;
    
    void Start() {
        lh = GetComponent<PuzzleHelper>();
        
        var template = new List<IntVec3>();
        const int size = 5;
        const int offset = 1;
        for (int x = 0; x < size; x++) {
            template.Add(new IntVec3(x + offset, 0, 0));
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