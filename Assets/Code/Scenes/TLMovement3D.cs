﻿using UnityEngine;
using System.Collections.Generic;
using System;
using Hackcraft;

public class TLMovement3D : MonoBehaviour
{

    Func<bool> winPredicate;

    void Start() {
        var lh = GetComponent<LevelHelper>();
        GetComponent<AllTheGUI>().CurrentMessage = "Help Sala get to the blue box! Use <b>Up</b> to complete her program and click <b>RUN</b>.";
        var progman = GetComponent<ProgramManager>();
        progman.Manipulator.Program = Hackcraft.Serialization.LoadFile("TestData/TLMovement3D");

        var template = new IntVec3[] {
            new IntVec3(3,6,0),
        };

        lh.CreateBlueprint(template);
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