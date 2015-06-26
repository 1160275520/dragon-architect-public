using UnityEngine;
using System;
using System.Linq;
using System.Collections.Generic;
using Ruthefjord;
using Ruthefjord.Ast;

public class PuzRepeatNested : MonoBehaviour {
    
    PuzzleHelper lh;
    
    void Start() {
        lh = GetComponent<PuzzleHelper>();
        
        var template = new List<IntVec3>();
        const int size = 6;
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
        lh.WinPredicate =  PuzzleHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateBlueprintPredicate(template) });
    }
    
    void Update() {
        if (lh.WinPredicate()) {
            GetComponent<PuzzleHelper>().WinLevel();
        }
    }
}
