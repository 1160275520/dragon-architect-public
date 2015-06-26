using UnityEngine;
using System;
using System.Linq;
using System.Collections.Generic;
using Ruthefjord;
using Ruthefjord.Ast;

public class PuzRepeatTower : MonoBehaviour {
    
    PuzzleHelper lh;
    
    void Start() {
        lh = GetComponent<PuzzleHelper>();
        
        var template = new List<IntVec3>();
        const int size = 6;
        const int offset = 0;
        const int height = 5;
        for (int y = 0; y < height; y++) {
	        for (int x = 0; x < size; x++) {
	            if (x == 0 || x == size - 1) {
	                for (int z = 0; z < size; z++) {
	                    template.Add(new IntVec3(x, y, z + offset));
	                }
	            } else {
	                template.Add(new IntVec3(x, y, offset));
	                template.Add(new IntVec3(x, y, size - 1 + offset));
	            }
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
