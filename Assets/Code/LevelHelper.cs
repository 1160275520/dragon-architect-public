using UnityEngine;
using System;
using System.Collections.Generic;
using System.Linq;
using Hackcraft;
using Hackcraft.Ast;

public class LevelHelper : MonoBehaviour
{
    public GameObject BlueprintPrefab;

    /// A predicate that should be used for almost all win condition checks, makes sure the program has been run and is in final state
    public bool GameIsRunningButDoneExecuting() {
        var progman = GetComponent<ProgramManager>();
        return progman.IsRunning && !progman.IsExecuting;
    }

    /// Instantiates the blueprint prefab for each of the given cells.
    public void CreateBlueprint(IEnumerable<IntVec3> cells) {
        var grid = GetComponent<Grid>();
        foreach (var c in cells) {
            GameObject.Instantiate(BlueprintPrefab, grid.CenterOfCell(c), Quaternion.identity);
        }
    }

    /// Create a function that checks the current state of the grid and returns true iff it exactly matches
    public Func<bool> CreateBlueprintPredicate(IEnumerable<IntVec3> cells) {
        var cellSet = new HashSet<IntVec3>(cells);
        return () => {
            var grid = GetComponent<Grid>().AllCells;
            return grid.Count() == cellSet.Count && grid.All(x => cellSet.Contains(x));
        };
    }

    /// Creates a function that checks the current state of the grid and returns true iff there are at least numBlocks.
    public Func<bool> CreateMinBlockCountPredicate(int numBlocks) {
        return () => {
            var grid = GetComponent<Grid>();
            return grid.AllCells.Count() >= numBlocks;
        };
    }

    /// Returns a function that evaluates to true iff all the given predicates evaluate to true.
    public static Func<bool> All(IEnumerable<Func<bool>> predicates) {
        return () => predicates.All(f => f());
    }

    public void WinLevel() {
        // TODO maybe do actual things once you win
        GetComponent<AllTheGUI>().CurrentMessage = "Yay, you win!";
    }
}