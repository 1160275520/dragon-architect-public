using UnityEngine;
using Hackcraft.Ast;
using System.Linq;

public class TLCall2 : MonoBehaviour
{
	void Start() {
        GetComponent<AllTheGUI>().CurrentMessage = "In this challenge, try to place at least 15 blocks. Use the <b>Call</b> statement to tell <b>Robot/Dragon/Salamander</b> to do the same action many times.";
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
        return grid.AllCells.Count() >= 15;
    }
}
