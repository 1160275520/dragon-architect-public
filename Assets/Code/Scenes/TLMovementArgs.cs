﻿using UnityEngine;
using System.Collections.Generic;
using System;
using Hackcraft;

public class TLMovementArgs : MonoBehaviour
{

    Func<bool> winPredicate;

    void Start() {
        var lh = GetComponent<LevelHelper>();
        GetComponent<AllTheGUI>().CurrentMessage = "Help Sala put blocks on the blue boxes! The number after each <b>Forward</b> tells Sala how many spaces to move. Change the numbers to complete her program and click <b>RUN</b>.";
        var progman = GetComponent<ProgramManager>();
        progman.Manipulator.Program = Hackcraft.Serialization.LoadFile("TestData/TLMovementArgs");
        progman.SetIsEditable("Main", false);

        var template = new IntVec3[] {
                new IntVec3(0,0,3),
                new IntVec3(0,0,6),
                new IntVec3(2,0,6),
            };

        lh.CreateBlueprint(template);
        // offset win location since Sala floats one cell above her actual location
        winPredicate = LevelHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateBlueprintPredicate(template) });
    }

    void Update() {
        if (winPredicate()) {
            GetComponent<LevelHelper>().WinLevel();
        }
    }
}