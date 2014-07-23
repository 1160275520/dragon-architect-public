using UnityEngine;
using System;
using System.Collections.Generic;
using System.Linq;
using Hackcraft;
using Hackcraft.Ast;
using Microsoft.FSharp.Core;

public class PuzzleHelper : MonoBehaviour
{
    public GameObject BlueprintPrefab;
    public GameObject RobotTargetPrefab;

    private List<UnityEngine.Object> targets = new List<UnityEngine.Object>();
    private static float winDelay = 0.5f;
    private float winTime;
    private bool hasBeenWon = false;
    private bool hasSentWinAnnouncement = false;
    private bool isFirstUpdate;

    void Awake() {
        var global = FindObjectOfType<Global>();
        var com = global.CurrentPuzzle.Component;
        if (OptionModule.IsSome(com)) {
            gameObject.AddComponent(com.Value);
        }
    }

    public void SetInstructions(string summary, string detail) {
        var global = FindObjectOfType<Global>();
        global.CurrentPuzzle = global.CurrentPuzzle.UpdateInstructions(new Scene.Instructions(summary, detail));
    }

    public void NotifyOfUpdates() {
        var global = FindObjectOfType<Global>();
        GetComponent<ExternalAPI>().NotifyOfPuzzle(global.CurrentSceneId, global.CurrentPuzzle, false);
    }

    /// A predicate that should be used for almost all win condition checks, makes sure the program has been run and is in final state
    public bool GameIsRunningButDoneExecuting() {
        var progman = GetComponent<ProgramManager>();
        return progman.IsRunning && !progman.IsExecuting;
    }

    /// Instantiates the blueprint prefab for each of the given cells.
    public void CreateBlueprint(IEnumerable<IntVec3> cells) {
        var grid = GetComponent<Grid>();
        foreach (var c in cells) {
            var cube = (GameObject)GameObject.Instantiate(BlueprintPrefab, grid.CenterOfCell(c), Quaternion.identity);
            cube.GetComponent<BlueprintCube>().GridPosition = c;
        }
    }

    /// Instantiates the target prefab for each of the given cells.
    public void CreateRobotTarget(IntVec3 cell) {
        var grid = GetComponent<Grid>();
        // offset prefab since robot floats one above its actual location
        targets.Add(GameObject.Instantiate(RobotTargetPrefab, grid.CenterOfCell(cell + new IntVec3(0,1,0)), Quaternion.identity));
    }

    public void ClearRobotTargets() {
        targets.ForEach((UnityEngine.Object g) => GameObject.Destroy(g));
    }

    /// Create a function that checks the current state of the grid and returns true iff it exactly matches
    public Func<bool> CreateBlueprintPredicate(IEnumerable<IntVec3> cells) {
        var cellSet = new HashSet<IntVec3>(cells);
        return () => {
            var grid = GetComponent<Grid>().AllCellLocations;
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

    public Func<bool> CreateTargetPredicate(IntVec3 cell) {
        return () => FindObjectOfType<RobotController>().Robot.Position.Equals(cell);
    }

    /// Returns a function that evaluates to true iff all the given predicates evaluate to true.
    public static Func<bool> All(IEnumerable<Func<bool>> predicates) {
        return () => predicates.All(f => f());
    }

    public void WinLevel() {
        // TODO maybe do actual things once you win
        if (!hasBeenWon) {
            Debug.Log("win declared, waiting " + winDelay);
            winTime = Time.fixedTime;
            hasBeenWon = true;
        }
    }

    void Update() {
        if (hasBeenWon && Time.fixedTime - winTime > winDelay && !hasSentWinAnnouncement) {
            Debug.Log("actual win");
            GetComponent<AllTheGUI>().IsActivePuzzleFinishButton = true;
            GetComponent<ExternalAPI>().SendPuzzleComplete();
            hasSentWinAnnouncement = true;
        }
    }
}