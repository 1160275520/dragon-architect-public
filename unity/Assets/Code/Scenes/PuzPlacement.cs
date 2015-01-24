using UnityEngine;
using System.Collections.Generic;
using System;
using Ruthefjord;

public class PuzPlacement : MonoBehaviour
{

    PuzzleHelper lh;

    void Start() {
        lh = GetComponent<PuzzleHelper>();

        lh.WinPredicate =   PuzzleHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateMinCubeCountPredicate(4) });
    }

    void Update() {
        if (lh.WinPredicate()) {
            GetComponent<PuzzleHelper>().WinLevel();
        }
    }
}
