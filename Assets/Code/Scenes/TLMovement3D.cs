using UnityEngine;
using System.Collections.Generic;
using System;
using Hackcraft;

public class TLMovement3D : MonoBehaviour
{

    Func<bool> winPredicate;

    void Start() {
        var lh = GetComponent<LevelHelper>();
        GetComponent<AllTheGUI>().CurrentMessage = "Help me get to the pink box! Use two <object data=\"media/up.svg\" style=\"vertical-align:middle\"></object> to complete my program.";
        var progman = GetComponent<ProgramManager>();
        progman.LoadProgram("TLMovement3D");
        progman.SetHighlighted("Up", true);
        var target = new IntVec3(3,6,0);

        lh.CreateRobotTarget(target);
        // offset win location since Sala floats one cell above her actual location
        winPredicate = LevelHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateTargetPredicate(target) });
    }

    void Update() {
        if (winPredicate()) {
            GetComponent<LevelHelper>().WinLevel();
        }
    }
}
