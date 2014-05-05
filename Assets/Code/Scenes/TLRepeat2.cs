using UnityEngine;
using Hackcraft;
using Hackcraft.Ast;
using System.Collections.Generic;
using System.Linq;

public class TLRepeat2 : MonoBehaviour
{
	void Start() {
        GetComponent<AllTheGUI>().CurrentMessage = "In this challenge, try to make a 5x5 vertical wall. Use the <b>Repeat</b> statement to tell <b>Robot/Dragon/Salamander</b> to do the same action many times.";
        var progman = GetComponent<ProgramManager>();
        foreach (var p in progman.AvailableProcedures) progman.Manipulator.ClearProcedure(p);
	}

    void Update() {

        var progman = GetComponent<ProgramManager>();
        if (progman.IsRunning && !progman.IsExecuting && WinPredicate()) {
            GetComponent<AllTheGUI>().CurrentMessage = "Yay, you win!";
        }

    }

    private bool WinPredicate() {
        var grid = GetComponent<Grid>();
        var cells = new HashSet<IntVec3>(grid.AllCells);

        var groundCells = cells.Where(v => v.Y == 0);
        var range = new int[]{1,2,3,4};
        var stacks = groundCells.Where(v => range.All(y => cells.Contains(new IntVec3(v.X, y, v.Z)))).ToArray();

        if (stacks.Count() < 5) return false;

        bool isXwall, isYWall;
        // check x first, then y
        {
            var minMajor = stacks.Min(s => s.X);
            var minMinor = stacks.First(s => s.X == minMajor).Z;
            isXwall = range.All(p => groundCells.Contains(new IntVec3(minMajor + p, 0, minMinor)));
        }
        {
            var minMajor = stacks.Min(s => s.Z);
            var minMinor = stacks.First(s => s.Z == minMajor).X;
            isYWall = range.All(p => groundCells.Contains(new IntVec3(minMinor, 0, minMajor + p)));
        }

        return isXwall || isYWall;
    }
}
