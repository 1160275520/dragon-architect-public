using UnityEngine;
using System;
using System.Linq;
using Hackcraft;
using Hackcraft.Ast;
using System.Collections.Generic;

public class TLRepeat2 : MonoBehaviour
{
    Func<bool> winPredicate;

	void Start () {
        var lh = GetComponent<LevelHelper>();
        GetComponent<AllTheGUI>().CurrentMessage = "In this challenge, try to make a 5x5 vertical wall. Use the <b>Repeat</b> statement to tell <b>Robot/Dragon/Salamander</b> to do the same action many times.";
        var progman = GetComponent<ProgramManager>();
        foreach (var p in progman.AvailableProcedures) progman.Manipulator.ClearProcedure(p);

        var template = new List<IntVec3>();
        const int size = 5;
        const int offset = 3;
        for (int x = 0; x < size; x++) {
            for (int y = 0; y < size; y++) {
                template.Add(new IntVec3(x + offset, y, 0));
            }
        }


        lh.CreateBlueprint(template);
        winPredicate = LevelHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateBlueprintPredicate(template) });
	}

    void Update() {
        if (winPredicate()) {
            GetComponent<LevelHelper>().WinLevel();
        }
    }
}
