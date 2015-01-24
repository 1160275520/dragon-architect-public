using UnityEngine;
using System;
using System.Linq;
using Ruthefjord;
using Ruthefjord.Ast;
using System.Collections.Generic;

public class PuzRotate: MonoBehaviour
{
    PuzzleHelper lh;
    
    void Start () {
        lh = GetComponent<PuzzleHelper>();
        
        var template = new List<IntVec3>();
        for (int x = 0; x < 4; x++) {
            template.Add(new IntVec3(0, x, x + 1));
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