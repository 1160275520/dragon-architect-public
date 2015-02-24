using UnityEngine;
using System.Collections.Generic;
using System;
using Ruthefjord;

public class PuzProceduresDef : MonoBehaviour
{
    PuzzleHelper lh;

    void Start() {
        lh = GetComponent<PuzzleHelper>();

        var template = new List<IntVec3>();
        int height = 3;
        int spacing = 3;
        int count = 3;
        int offset = 1;
        for (int z = 0; z < count; z++) {
            for (int y = 0; y < height; y++) {
                template.Add(new IntVec3 (0, y, z * spacing + offset));
            }
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

