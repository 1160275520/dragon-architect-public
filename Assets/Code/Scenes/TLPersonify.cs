using UnityEngine;
using Hackcraft.Ast;
using Hackcraft;
using System.Collections.Generic;
using System.Linq;

public class TLPersonify : MonoBehaviour {

    public GameObject highlightPrefab;

    private string instructions = "Use the arrow keys to move around and space to place blocks. Put blocks on the blue squares.";
    private bool coding = false;

    void Start() {
        GetComponent<AllTheGUI>().CurrentMessage = instructions;
        var progman = GetComponent<ProgramManager>();
        foreach (var p in progman.AvailableProcedures) progman.Manipulator.ClearProcedure(p);
    }

    void Update() {

        if (PersonComplete() && !coding) {
            instructions = "Now have Sala put blocks on the blue squares.";
            var progman = GetComponent<ProgramManager>();
            var grid = GetComponent<Grid>();
            progman.InitGrid = grid.AllCells;
            Instantiate(highlightPrefab, grid.CenterOfCell(new IntVec3(0, 0, 3)), Quaternion.identity);
            Instantiate(highlightPrefab, grid.CenterOfCell(new IntVec3(0, 0, 6)), Quaternion.identity);
            Instantiate(highlightPrefab, grid.CenterOfCell(new IntVec3(2, 0, 6)), Quaternion.identity);
            progman.IsAvailMovement = true;
            progman.IsAvailPlaceBlock = true;
            progman.NumHelperFuncs = 0;
            var gui = GetComponent<AllTheGUI>();
            gui.IsActiveCodeEditor = true;
            gui.IsActiveMainControls = true;
            coding = true;
        } else if (SalaComplete() && coding) {
            GetComponent<AllTheGUI>().CurrentMessage = "You did it!";
        } else {
            GetComponent<AllTheGUI>().CurrentMessage = instructions;
        }
    }

    private bool PersonComplete() {
        var grid = GetComponent<Grid>();
        var highlightedSquares = new IntVec3[] { new IntVec3(-4, 0, 1), new IntVec3(-4, 0, 4), new IntVec3(-2, 0, 4) };
        var filledSquares = new List<IntVec3>(grid.AllCells);
        return highlightedSquares.All(filledSquares.Contains) && filledSquares.Count == highlightedSquares.Length;
    }

    private bool SalaComplete() {
        var grid = GetComponent<Grid>();
        var highlightedSquares = new IntVec3[] { new IntVec3(-4, 0, 1), new IntVec3(-4, 0, 4), new IntVec3(-2, 0, 4), new IntVec3(0, 0, 3), new IntVec3(0, 0, 6), new IntVec3(2, 0, 6) };
        var filledSquares = new List<IntVec3>(grid.AllCells);                                                         
        return highlightedSquares.All(filledSquares.Contains) && filledSquares.Count == highlightedSquares.Length;   
    }
}
