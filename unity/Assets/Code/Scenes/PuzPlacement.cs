using UnityEngine;
using System.Collections.Generic;
using System;
using Ruthefjord;

public class PuzPlacement : MonoBehaviour
{

    Func<bool> winPredicate;

    void Start() {
        var lh = GetComponent<PuzzleHelper>();

        winPredicate = PuzzleHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateMinCubeCountPredicate(4) });
    }

    void Update() {
        if (winPredicate()) {
            GetComponent<PuzzleHelper>().WinLevel();
        }
    }
}
