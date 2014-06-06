using UnityEngine;
using System.Collections.Generic;
using System;
using Hackcraft;

public class TLMovement2D : MonoBehaviour {

    Func<bool> winPredicate;

    string[] messages = new string[] { "My program on the right tells me what to do. Click <font color=\"#37B03F\"><b>RUN</b></font> to have me do it!",
        "I need to get to the pink box, and my program doesn't move me far enough. Add two <object data=\"media/forward.svg\" style=\"vertical-align:middle\"></object> to complete my program and click <font color=\"#37B03F\"><b>RUN</b></font>.",
        "Now the pink box is somewhere else! Use one <object data=\"media/right.svg\" style=\"vertical-align:middle\"></object> to fix my program and click <font color=\"#37B03F\"><b>RUN</b></font>." };
    IntVec3[] targets = new IntVec3[] { new IntVec3(0,0,5), new IntVec3(0,0,5), new IntVec3(3,0,2) };
    int phase = 0;

    void Start() {
        var lh = GetComponent<LevelHelper>();
        GetComponent<AllTheGUI>().CurrentMessage = messages[phase];
        var progman = GetComponent<ProgramManager>();
        progman.LoadProgram("TLMovement2D");
        lh.CreateRobotTarget(targets[phase]);
        winPredicate =lh.GameIsRunningButDoneExecuting;
    }

    void Update() {
        if (winPredicate()) {
            phase++;
            if (phase < messages.Length) {
                GetComponent<AllTheGUI>().CurrentMessage = messages[phase];
                var progman = GetComponent<ProgramManager>();
                var api = GetComponent<ExternalAPI>();
                api.SendInstructions();
                var lh = GetComponent<LevelHelper>();
                lh.ClearRobotTargets();
                lh.CreateRobotTarget(targets[phase]);

                winPredicate = LevelHelper.All( new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateTargetPredicate(targets[phase]) });
                switch(phase) {
                    case 1:
                        progman.SetHighlighted("Forward", true);
                        break;
                    case 2:
                        progman.SetHighlighted("Right", true);
                        progman.SetHighlighted("Forward", false);
                        break;
                }
                api.SendLevel();
                progman.StopRunning();
            } else {
                GetComponent<LevelHelper>().WinLevel();
            }
        }
    }
}
