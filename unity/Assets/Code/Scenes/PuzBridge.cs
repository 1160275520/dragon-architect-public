using UnityEngine;
using System;
using System.Linq;
using System.Collections.Generic;
using Ruthefjord;
using Ruthefjord.Ast;

public class PuzBridge : MonoBehaviour {
    
    PuzzleHelper lh;
    
    void Start() {
        lh = GetComponent<PuzzleHelper>();
        var template = new List<IntVec3>();
        template.Add(new IntVec3(1,0,0));
        template.Add(new IntVec3(2,0,0));
        template.Add(new IntVec3(3,0,0));
        template.Add(new IntVec3(3,1,0));
        template.Add(new IntVec3(3,2,0));
        template.Add(new IntVec3(4,2,0));
        template.Add(new IntVec3(5,2,0));
        template.Add(new IntVec3(6,2,0));
        template.Add(new IntVec3(6,1,0));
        template.Add(new IntVec3(6,0,0));
        template.Add(new IntVec3(7,0,0));
        template.Add(new IntVec3(8,0,0));
        
        lh.CreateBlueprint(template);
        lh.WinPredicate =  PuzzleHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateBlueprintPredicate(template) });
    }
    
    void Update() {
        if (lh.WinPredicate()) {
            GetComponent<PuzzleHelper>().WinLevel();
        }
    }
}
