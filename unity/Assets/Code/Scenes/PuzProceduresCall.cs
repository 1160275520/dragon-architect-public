using UnityEngine;
using System.Collections.Generic;
using System;
using Ruthefjord;

public class PuzProceduresCall : MonoBehaviour
{
    PuzzleHelper lh;
    
    void Start() {
        lh = GetComponent<PuzzleHelper>();
        
        var template = new List<IntVec3>();
        int height = 5;
        int offset = 1;
        for (int y = 0; y < height; y++) {
            template.Add(new IntVec3(offset, y, 0));
        }
        lh.CreateBlueprint(template);
        
        lh.WinPredicate =   PuzzleHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateBlueprintPredicate(template) });
    }
    
    void Update() {
        if (lh.WinPredicate()) {
            GetComponent<PuzzleHelper>().WinLevel();
        }
    }
}
