using UnityEngine;
using System.Collections.Generic;
using System;
using Hackcraft;

public class TLMovement2D : MonoBehaviour {

    private Func<bool> winPredicate;
    private static string runIcon = "<object data=\"media/runButton.png\" style=\"vertical-align:middle\"></object>";
    private static string[] messages = new string[] { String.Format("My program on the right tells me what to do. Click {0} to have me do it!", runIcon),
        String.Format("I need to get to the pink box, and my program doesn't move me far enough. Add a <object data=\"media/blockSvgs/forward.svg\" style=\"vertical-align:middle\"></object> to complete my program and click {0}.", runIcon),
        String.Format("Good Job! Now the pink box is somewhere else. Use one <object data=\"media/blockSvgs/right.svg\" style=\"vertical-align:middle\"></object> to fix my program and click {0}.", runIcon) };
    private static IntVec3[] targets = new IntVec3[] { new IntVec3(0,0,2), new IntVec3(0,0,2), new IntVec3(1,0,1) };
    private int phase = 0;
    private bool waited = false;
    private float phaseDelay = 0.5f;
    private float phaseEndTime = -1;

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
            if (!waited && phaseEndTime < 0) {
                phaseEndTime = Time.fixedTime;
            }
            if (waited) {
                phase++;
                waited = false;
                phaseEndTime = -1;
                if (phase < messages.Length) {
                    GetComponent<AllTheGUI>().CurrentMessage = messages[phase];
                    var progman = GetComponent<ProgramManager>();
                    var api = GetComponent<ExternalAPI>();
                    //api.SendInstructions();
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
                    //api.SendLevel();
                    progman.StopRunning();
                } else {
                    GetComponent<LevelHelper>().WinLevel();
                }
            }
        }

        if (phaseEndTime > 0 && Time.fixedTime - phaseEndTime > phaseDelay) {
            waited = true;
        }
    }
}
