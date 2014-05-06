using UnityEngine;
using Hackcraft.Ast;
using Hackcraft;
using System.Collections.Generic;
using System.Linq;
using System;

public class TLPersonify : MonoBehaviour {

    public GameObject highlightPrefab;

    private string instructions = "Use the arrow keys to move around and space to place blocks. Put blocks on the blue squares.";
    private bool coding = false;
    List<IntVec3> blueprint;
    Func<bool> winPredicate;

    void Start() {
        GetComponent<AllTheGUI>().CurrentMessage = instructions;
        var progman = GetComponent<ProgramManager>();
        foreach (var p in progman.AvailableProcedures) progman.Manipulator.ClearProcedure(p);

        var lh = GetComponent<LevelHelper>();
        FindObjectOfType<PersonController>().Position = new IntVec3(-4, 0, 0);
        blueprint = new List<IntVec3>();
        blueprint.AddRange( new IntVec3[] {
            new IntVec3(-4,0,3),
            new IntVec3(-4,0,6),
            new IntVec3(-2,0,6),
        });
        
        lh.CreateBlueprint(blueprint);
        winPredicate = lh.CreateBlueprintPredicate(blueprint);
    }

    void Update() {

        if (winPredicate() && !coding) {
            instructions = "Now have Sala put blocks on the blue squares.";
            var progman = GetComponent<ProgramManager>();
            var grid = GetComponent<Grid>();
            var lh = GetComponent<LevelHelper>();
            progman.InitGrid = grid.AllCells;

            var salaBlueprint = new IntVec3[] {
                new IntVec3(0,0,3),
                new IntVec3(0,0,6),
                new IntVec3(2,0,6),
            };
            lh.CreateBlueprint(salaBlueprint);
            blueprint.AddRange(salaBlueprint);

            winPredicate = lh.CreateBlueprintPredicate(blueprint);

            progman.IsAvailMovement = true;
            progman.IsAvailPlaceBlock = true;
            progman.NumHelperFuncs = 0;
            var gui = GetComponent<AllTheGUI>();
            gui.IsActiveCodeEditor = true;
            gui.IsActiveMainControls = true;

            FindObjectOfType<PersonController>().enabled = false;
            coding = true;
        } else if (winPredicate() && coding) {
            GetComponent<AllTheGUI>().CurrentMessage = "You did it!";
        } else {
            GetComponent<AllTheGUI>().CurrentMessage = instructions;
        }
    }
}
