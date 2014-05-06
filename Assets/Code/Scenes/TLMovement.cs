using UnityEngine;
using System.Collections.Generic;
using System;
using Hackcraft;

public class TLMovement : MonoBehaviour {

    Func<bool> winPredicate;

    void Start() {
        var lh = GetComponent<LevelHelper>();
        GetComponent<AllTheGUI>().CurrentMessage = "Help Sala get to the blue box! Use Forward to complete her program and click RUN.";
        var progman = GetComponent<ProgramManager>();
        progman.Manipulator.Program = Hackcraft.Serialization.LoadFile("TestData/TLMovement");

        var template = new IntVec3[] {
            new IntVec3(5,0,3),
        };

        lh.CreateBlueprint(template);
        winPredicate = LevelHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, 
                                                          () => FindObjectOfType<RobotController>().Robot.Position.Equals(template[0]) });
    }

    void Update() {
        if (winPredicate()) {
            GetComponent<LevelHelper>().WinLevel();
        }
    }
}
