using UnityEngine;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Ruthefjord;
using Ruthefjord.Ast;
using Microsoft.FSharp.Core;

public class PuzzleHelper : MonoBehaviour
{
    public GameObject BlueprintPrefab;
    public GameObject RobotTargetPrefab;
    public Func<bool> WinPredicate;
    public List<string> BlockingErrors;

    private ImperativeAstManipulator Manipulator { get { return GetComponent<ProgramManager>().Manipulator; } }

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
        BlockingErrors = new List<string> ();
    }

    void Start() {
        var global = FindObjectOfType<Global>();
        var worldOp = global.CurrentPuzzle.WorldData;
        if (OptionModule.IsSome(worldOp)) {
            var world = worldOp.Value;
            var blocks = Ruthefjord.ImmArr.ofArray(world.Cubes);
            // only set world if there are a non-zero number of blocks,
            // since puzzles may be using this to set the robot but setting their own blocks in a component
            // if not, then the blocks default to empty anyway.
            if (blocks.Length > 0) {
                GetComponent<Grid>().SetGrid(blocks);
            }
            if (world.Robots.Length > 0) {
                var d = world.Robots[0];
                FindObjectOfType<RobotController>().SetRobot(new Ruthefjord.BasicRobot(d.Position, d.Direction), null, 0.0f);
            }
        }

        // set the edit more to workshop to save any initial world state
        GetComponent<ProgramManager>().EditMode = EditMode.Workshop;
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
        return progman.RunState == RunState.Finished;
    }

    public Func<bool> MakeGameIsRunningButDoneExecutingWithError(List<string> err) {
        return () => {
            var done = GameIsRunningButDoneExecuting();
            if (!done) {
                err.Add("Run your program all the way through");
            }
            return done;
        };
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
    public Func<bool> CreateMinCubeCountPredicate(int numBlocks) {
        return () => {
            var grid = GetComponent<Grid>();
            return grid.AllCells.Count() >= numBlocks;
        };
    }

    public Func<bool> CreateTargetPredicate(IntVec3 cell) {
        return () => FindObjectOfType<RobotController>().Robot.Position.Equals(cell);
    }

    private int countInRepeat(Imperative.Repeat repeat, string ident) {
        Debug.Log(repeat + ", " + ident);
        var nested = repeat.Body.Where(x => x.Stmt.IsRepeat).Select(x => x.Stmt.AsRepeat());
        var calls = repeat.Body.Where(x => x.Stmt.IsExecute).Select(x => x.Stmt.AsExecute());
        // assuming integer literals only as repeat parameters
        var times = Convert.ToInt32(repeat.NumTimes.Expr.AsLiteral());
        Debug.Log(calls.Count(x => x.Identifier == ident)*times + nested.Select(r => countInRepeat(r, ident)).Sum());
        return times*(calls.Count(x => x.Identifier == ident) + nested.Select(r => countInRepeat(r, ident)).Sum());
    }

    private bool applyRequirement(IEnumerable<Imperative.Execute> calls, IEnumerable<Imperative.Repeat> repeats,
        Dictionary<string, Tuple<Func<int, bool>,string>> req, List<string> err) {
        bool ret = true;
        // pass the count of those calls with specified requirements to the associated function (record any error messages)
        foreach (var r in req) {
            var count = calls.Count(x => x.Identifier == r.Key) + repeats.Select(repeat => countInRepeat(repeat, r.Key)).Sum();
            if (!r.Value.Item1(count)) {
                err.Add(r.Value.Item2);                      
            }
            ret = ret && r.Value.Item1(count);
        }
        return ret;
    }

    /** 
     * reqs : proc name mapped to (call ident mapped to ((int -> bool), error message))
     * For each procedure with requirements, the count of calls with the specified idents contained in the procedure
     * definition will be passed to the corresponding function.
     * This predicate will return the conjunction of all provided functions applied to (the relevant parts of) the current program.
     * For any function that is false, it will append the provided error message to the list of strings.
     */
    public Func<bool> CreateCodeCountPredicate(Dictionary<string, Dictionary<string, Tuple<Func<int, bool>,string>>> reqs, List<string> err) {
        var progman = GetComponent<ProgramManager>();
        Func<Imperative.Program, bool> checkProgram = (program) => {
            bool ret = true;
            // check main if necessary
            if (reqs.ContainsKey("MAIN")) {
                var calls = program.Body.Where(x => x.Stmt.IsExecute).Select(x => x.Stmt.AsExecute());
                var repeats = program.Body.Where(x => x.Stmt.IsRepeat).Select(x => x.Stmt.AsRepeat());
                ret = ret && applyRequirement(calls, repeats, reqs["MAIN"], err);
            }
            // get all procedures that have specified requirements
            var procs = program.Body.Where(x => x.Stmt.IsProcedure).Select(x => x.Stmt.AsProcedure())
                .Where(x => reqs.ContainsKey(x.Name));
            // make sure all the required procedures exist (ignoring the invented MAIN)
            var dontExist = reqs.Keys.Except(procs.Select((x) => x.Name)).Except(new string[] {"MAIN"});
            if (dontExist.Count() > 0) {
                err.Add("Required procedures don't exist: " + dontExist.Aggregate((a,b) => a + ", " + b));
                return false;
            }
            foreach (var proc in procs) {
                // get all procedure calls in the procedure
                var calls = proc.Body.Where(x => x.Stmt.IsExecute).Select(x => x.Stmt.AsExecute());
                var repeats = proc.Body.Where(x => x.Stmt.IsRepeat).Select(x => x.Stmt.AsRepeat());
                // pass the count of those calls with specified requirements to the associated function (record any error messages)
                ret = ret && applyRequirement(calls, repeats, reqs[proc.Name], err);
            }
            return ret;
        };
        return () => checkProgram(progman.Manipulator.Program);
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
