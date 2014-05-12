using UnityEngine;
using System.Collections.Generic;
using System;
using Hackcraft;

public class TLMovement2D : MonoBehaviour {

    Func<bool> winPredicate;

    void Start() {
        var lh = GetComponent<LevelHelper>();
		GetComponent<AllTheGUI>().CurrentMessage = "Help <b>Sala</b> get to the pink box! Use <b>Forward</b> to complete her program and click <b>RUN</b>.";
        var progman = GetComponent<ProgramManager>();
        progman.LoadProgram("TLMovement2D");

        var template = new IntVec3[] {
            new IntVec3(5,1,3),
        };

        lh.CreateRobotTarget(template);
        // offset win location since Sala floats one cell above her actual location
        winPredicate = LevelHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, 
                                                          () => FindObjectOfType<RobotController>().Robot.Position.Equals(template[0] - new IntVec3(0,1,0)) });
    }

    void Update() {
        if (winPredicate()) {
            GetComponent<LevelHelper>().WinLevel();
        }
    }
}
