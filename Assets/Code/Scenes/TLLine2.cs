using UnityEngine;
using System;
using System.Linq;
using Hackcraft.Ast;

public class TLLine2 : MonoBehaviour
{
    Func<bool> winPredicate;

	void Start() {
        var lh = GetComponent<LevelHelper>();
        GetComponent<AllTheGUI>().CurrentMessage = "In this challenge, help me place at least 100 blocks in a space that is at least 30 spaces wide and 30 spaces long. The number in the <b>Line</b> statement controls how long the line is. Change this number to make the line I place longer.";
        var progman = GetComponent<ProgramManager>();
        progman.Manipulator.ClearAll();
        progman.SetHighlighted("Line", true);
        winPredicate = LevelHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateMinBlockCountPredicate(100), extentWinPredicate });
	}

    void Update() {
        if (winPredicate()) {
            GetComponent<LevelHelper>().WinLevel();
        }
    }

    private bool extentWinPredicate() {
        var cells = GetComponent<Grid>().AllCells;

        var minX = cells.Min(c => c.X);
        var minZ = cells.Min(c => c.Z);
        var maxX = cells.Max(c => c.X);
        var maxZ = cells.Max(c => c.Z);

        return maxX - minX >= 30 && maxZ - minZ >= 30;
    }
}
