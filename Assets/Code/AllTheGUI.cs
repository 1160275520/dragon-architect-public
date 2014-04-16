using UnityEngine;
using System;
using System.Collections.Generic;
using System.Linq;

using Hackcraft.Ast;

public class Dragged {
    public Imperative.Statement Statement;
    public string ProcName; // nullable
    public int? StatementIndex; // nullable
    public Rect DragRect;
}

public class AllTheGUI : MonoBehaviour
{
    public static readonly int COLUMN_WIDTH = 85;
    public static readonly int BUTTON_HEIGHT = 25;
    public static readonly int SPACING = 10;

    public Font CodeFont;
    public Texture2D RepeatTex;
    public Texture2D RepeatTexHighlight;
    public GUISkin CustomSkin;
    private int curProc = 0;
    private Dictionary<string, List<Rect>> statementRects;
    private Dictionary<string, Rect> procRects;
    private Dragged currentlyDragged;
    private string[] PROCS = new string[] { "Main", "F1", "F2", "F3", "F4", "F5" };

    private Action currentModalWindow = null;

    private string filename = "";

    private int astIdCounter = 0;
    // important that this is prefix, 1 should be the first id
    private int NextId() { return ++astIdCounter; }

    void Start() {
        var prog = GetComponent<ProgramManager>().Program;
        foreach (var p in PROCS) {
            prog.CreateProcedure(p);
        }
    }

    void Update() {
        if (currentlyDragged != null && !Input.GetMouseButton(0)) {
            Debug.Log("drag ended");
            currentlyDragged = null;
        }
    }

    void OnGUI() {
        var progman = GetComponent<ProgramManager>();
        var program = progman.Program;
        GUI.skin = CustomSkin;

        if (currentModalWindow != null) {
            currentModalWindow();
        }


        // save/load dialog
        GUILayout.BeginArea(new Rect(Screen.width - 4 * 105, Screen.height - 2 * BUTTON_HEIGHT, 4 * 105, BUTTON_HEIGHT + SPACING));
        GUILayout.BeginVertical("ButtonBackground");
        GUILayout.BeginHorizontal();
        var options = new GUILayoutOption[] { GUILayout.Width(100), GUILayout.Height(BUTTON_HEIGHT) };
        if (GUILayout.Button("Clear", options)) {
            currentModalWindow = displayConfirmClear;
        }
        if (GUILayout.Button("Save File", options)) {
            Hackcraft.Serialization.SaveFile("TestData/" + filename, GetComponent<ProgramManager>().Program.Program);
        }
        if (GUILayout.Button("Load File", options)) {
            GetComponent<ProgramManager>().Program.Program = Hackcraft.Serialization.LoadFile("TestData/" + filename);
        }
        var textStyle = new GUIStyle(GUI.skin.textField);
        textStyle.margin = new RectOffset(0, 0, 4, 0);
        filename = GUILayout.TextField(filename, textStyle, options);
        GUILayout.EndHorizontal();
        GUILayout.FlexibleSpace();
        GUILayout.EndVertical();
        GUILayout.EndArea();

        GUILayout.BeginArea(new Rect(SPACING, SPACING, COLUMN_WIDTH + 10, Screen.height - SPACING * 2));
        GUILayout.BeginVertical("ButtonBackground");
        options = new GUILayoutOption[] { GUILayout.Width(COLUMN_WIDTH), GUILayout.Height(BUTTON_HEIGHT) };
        if (GUILayout.Button("Forward", options)) {
            program.AppendStatement(PROCS[curProc], Imperative.NewCall(NextId(), "Forward", new object[] { "1" }));
        }
        if (GUILayout.Button("Up", options)) {
            program.AppendStatement(PROCS[curProc], Imperative.NewCall(NextId(), "Up", new object[] { "1" }));
        }
        if (GUILayout.Button("Down", options)) {
            program.AppendStatement(PROCS[curProc], Imperative.NewCall(NextId(), "Down", new object[] { "1" }));
        }
        if (GUILayout.Button("Left", options)) {
            program.AppendStatement(PROCS[curProc], Imperative.NewCall(NextId(), "Left", new object[] { }));
        }
        if (GUILayout.Button("Right", options)) {
            program.AppendStatement(PROCS[curProc], Imperative.NewCall(NextId(), "Right", new object[] { }));
        }
        if (GUILayout.Button("Block", options)) {
            program.AppendStatement(PROCS[curProc], Imperative.NewCall(NextId(), "PlaceBlock", new object[] { }));
        }
        if (GUILayout.Button("Remove", options)) {
            program.AppendStatement(PROCS[curProc], Imperative.NewCall(NextId(), "RemoveBlock", new object[] { }));
        }
        if (GUILayout.Button("Repeat", options)) {
            program.AppendStatement(PROCS[curProc], Imperative.NewRepeat(NextId(), Imperative.NewCall(0, "F1", new object[] { }), Imperative.Expression.NewLiteral("5")));
        }
        if (GUILayout.Button("Call", options)) {
            program.AppendStatement(PROCS[curProc], Imperative.NewCall(NextId(), "F1", new object[] { }));
        }
        if (progman.IsExecuting && GUILayout.Button("Stop", options)) {
            progman.Stop();
        }
        if (!progman.IsExecuting && GUILayout.Button("Execute", options)) {
            progman.Execute();
        }
        if (GUILayout.Button("Undo", options)) {
            progman.Undo();
        }
        if (GUILayout.Button("Zoom In", options)) {
            FindObjectOfType<MyCamera>().Zoom(0.5f);
        }
        if (GUILayout.Button("Zoom Out", options)) {
            FindObjectOfType<MyCamera>().Zoom(2f);
        }
        GUILayout.EndVertical();
        GUILayout.EndArea();


        GUILayout.BeginArea(new Rect(Screen.width - 6 * (COLUMN_WIDTH + SPACING), SPACING, 6 * (COLUMN_WIDTH + SPACING), Screen.height));
        GUILayout.BeginVertical("ButtonBackground");
        curProc = GUILayout.SelectionGrid(curProc, PROCS, PROCS.Length);
        GUILayout.BeginHorizontal();
        GUILayout.Space(SPACING / 2);
        if (Event.current.type == EventType.Repaint) {
            statementRects = new Dictionary<string, List<Rect>>();
            procRects = new Dictionary<string, Rect>();
        }
        if (!progman.IsExecuting) {
            doDragDrop();
        }
        foreach (var procName in PROCS) {
            makeProc(procName);
            GUILayout.Space(SPACING);
        }
        GUILayout.EndHorizontal();
        GUILayout.Space(SPACING);
        GUILayout.EndVertical();
        GUILayout.EndArea();
        if (currentlyDragged != null && currentlyDragged.ProcName == null) {
            var adjustedRect = new Rect(currentlyDragged.DragRect);
            adjustedRect.x += Screen.width - 6 * (COLUMN_WIDTH + SPACING);
            adjustedRect.y += SPACING;
            if (currentlyDragged.Statement.Stmt.IsCall) {
                GUI.Box(adjustedRect, currentlyDragged.Statement.Stmt.AsCall.Proc, "box");
            } else if (currentlyDragged.Statement.Stmt.IsRepeat) {
                GUI.Box(adjustedRect, "Repeat", "box");
            }
        }
        makeFPS();
    }

    private void displayConfirmClear() {
        var midx = Screen.width / 2;
        var midy = Screen.height / 2;
        var hw = 100;
        var hh = 50;

        var r = new Rect(midx - hw, midy - hh, 2 * hw, 2 * hh);
        GUI.ModalWindow(213421345, r, (id) => {
            if (GUILayout.Button("Yes")) {
                GetComponent<ProgramManager>().Clear();
                currentModalWindow = null;
            }
            if (GUILayout.Button("No")) {
                currentModalWindow = null;
            }
        }, "Confirm Clear?");

    }

    void makeProc(string procName) {
        var progman = GetComponent<ProgramManager>();
        Imperative.Procedure proc;
        try {
            proc = progman.Program.Program.Procedures[procName];
        } catch (KeyNotFoundException) {
            progman.Program.CreateProcedure(procName);
            proc = progman.Program.Program.Procedures[procName];
        }

        GUILayout.BeginVertical("CodeBackground", GUILayout.MaxWidth(COLUMN_WIDTH), GUILayout.MinHeight(SPACING * 5));
        GUILayout.Space(SPACING / 2);
        var body = proc.Body;
        Imperative.Statement newStatement = null;

        var lastExecuted = progman.LastExecuted;

        for (int i = 0; i < body.Count(); i++) {
            var command = body[i].Stmt;
            var highlight = lastExecuted.Contains(body[i].Meta.Id);
            if (command.IsCall) {
                newStatement = makeCall(command.AsCall, highlight);
            } else if (command.IsRepeat) {
                newStatement = makeRepeat(command.AsRepeat, highlight);
            }

            if (!progman.IsExecuting && Event.current.type == EventType.Repaint) {
                statementRects[procName].Add(GUILayoutUtility.GetLastRect());
            }
            GUILayout.Space(SPACING / 2);

            if (newStatement != null) {
                progman.Program.ReplaceStatement(procName, i, newStatement);
            }
        }
        GUILayout.EndVertical();
        if (!progman.IsExecuting && Event.current.type == EventType.Repaint) {
            procRects.Add(procName, GUILayoutUtility.GetLastRect());
        }
    }

    private Imperative.Statement makeCall(Imperative.Call statement, bool highlight) {
        GUILayout.BeginHorizontal();
        var procName = statement.Proc;

        string newProcName = procName;
        if (PROCS.Contains(procName)) {
            GUILayout.Box("Call", highlight ? "BoxHighlight" : "box");
            newProcName = GUILayout.TextField(procName, 2, highlight ? "TextHighlight" : "textfield", GUILayout.Width(25));
        } else {
            GUILayout.Box(procName, highlight ? "BoxHighlight" : "box");
        }


        var arg1 = statement.Args.Count() > 0 ? statement.Args[0] as string : null;
        string newArg1 = null;
        if (arg1 != null) {
            newArg1 = GUILayout.TextField(arg1, 2, highlight ? "TextHighlight" : "textfield", GUILayout.Width(25));
        } 

        GUILayout.EndHorizontal();

        if (newArg1 == arg1 && newProcName == procName) {
            return null;
        } else {
            return Imperative.NewCall(NextId(), newProcName, newArg1 == null ? new object[] {} : new object[] { newArg1 });
        }
        
    }

    private Imperative.Statement makeRepeat(Imperative.Repeat statement, bool highlight) {
        var procName = statement.Stmt.Stmt.AsCall.Proc;
        var numTimes = statement.NumTimes.AsLiteral as string;

        GUILayout.BeginVertical(highlight ? "BoxHighlight" : "box");
        GUILayout.BeginHorizontal();
        GUILayout.Box("Repeat", highlight ? "BoxHighlight" : "box");
        var newProcName = GUILayout.TextField(procName, 2, highlight ? "TextHighlight" : "textfield", GUILayout.Width(25));
        GUILayout.EndHorizontal();
        GUILayout.BeginHorizontal();
        var newNumTimes = GUILayout.TextField(numTimes, 3, highlight ? "TextHighlight" : "textfield", GUILayout.Width(35));
        GUILayout.Box("times", highlight ? "BoxHighlight" : "box");
        GUILayout.EndHorizontal();
        GUILayout.EndVertical();

        if (procName == newProcName && numTimes == newNumTimes) {
            return null;
        } else {
            return Imperative.NewRepeat(NextId(), Imperative.NewCall(0, newProcName, new object[]{}), Imperative.Expression.NewLiteral(newNumTimes));
        }
    }

    private float updateInterval = 0.5F;
    private float accum = 0; // FPS accumulated over the interval
    private int frames = 0; // Frames drawn over the interval
    private float timeleft = 0.5f; // Left time for current interval
    private float fps = 60;

    void makeFPS() {
        timeleft -= Time.deltaTime;
        accum += Time.timeScale / Time.deltaTime;
        ++frames;

        // Interval ended - update GUI text and start new interval
        if (timeleft <= 0.0) {
            // display two fractional digits (f2 format)
            fps = accum / frames;
            timeleft = updateInterval;
            accum = 0.0F;
            frames = 0;
        }
        GUIStyle fpsStyle = "FPS";
        if (fps < 30)
            fpsStyle.normal.textColor = Color.yellow;
        else
            if (fps < 10)
                fpsStyle.normal.textColor = Color.red;
            else
                fpsStyle.normal.textColor = Color.green;
        string format = System.String.Format("{0:F2} FPS", fps);
        GUI.Label(new Rect(Screen.width - 75, 0, 75, 15), format, "FPS");
    }

    bool rectIntersect(Rect r1, Rect r2) {
        return !(r1.xMin > r2.xMax ||
                 r1.xMax < r2.xMin ||
                 r1.yMin > r2.yMax ||
                 r1.yMax < r2.yMin);
    }

    void doDragDrop() {
        var progman = GetComponent<ProgramManager>();

        // generate rects for statements
        if (Event.current.type == EventType.Repaint) {
            foreach (var procName in PROCS) {
                statementRects.Add(procName, new List<Rect>());
            }
        }
        // when mouse down, determine which (if any) statement was clicked
        else if (Event.current.type == EventType.MouseDown) {
            foreach (var procName in PROCS) {
                var proc = progman.Program.Program.Procedures[procName];
                for (int i = 0; i < statementRects[procName].Count; i++) {
                    var rect = statementRects[procName][i];
                    //Debug.Log(rect);
                    //Debug.Log(Event.current.mousePosition);
                    if (rect.Contains(Event.current.mousePosition)) {
                        currentlyDragged = new Dragged { Statement = proc.Body[i], ProcName = procName, StatementIndex = i, DragRect = rect };
                        //Debug.Log("Now dragging " + proc.Body[currentlyDragged.StatementIndex.Value] + " at index " + i);
                    }
                }
            }
            
        }
        // when mouse dragged, if the current proc contains the dragged statement, swap the statement to its new position
        else if (Event.current.type == EventType.MouseDrag && currentlyDragged != null) {
            // update position
            currentlyDragged.DragRect.x = Event.current.mousePosition.x;
            currentlyDragged.DragRect.y = Event.current.mousePosition.y;
            //Debug.Log("dragRect = " + currentlyDragged.DragRect);

            // does it need to be removed from current proc (if it has one)
            if (currentlyDragged.ProcName != null && !rectIntersect(currentlyDragged.DragRect, procRects[currentlyDragged.ProcName])) {
                //Debug.Log("removed from " + currentlyDragged.ProcName + "; no intersection");
                progman.Program.RemoveStatement(currentlyDragged.ProcName, currentlyDragged.StatementIndex.Value);
                currentlyDragged.ProcName = null;
                currentlyDragged.StatementIndex = null;
            } else {
                foreach (var procName in PROCS) {
                    // should it be added to current procedure?
                    if (rectIntersect(currentlyDragged.DragRect, procRects[procName])) {
                        //Debug.Log("intersects with " + procName);
                        // where in the curren procedure should it go?
                        int? swap = null;
                        if (currentlyDragged.ProcName != null) {
                            if (currentlyDragged.ProcName == procName) {
                                // remove in preparation for potential swap
                                progman.Program.RemoveStatement(procName,currentlyDragged.StatementIndex.Value);
                                swap = currentlyDragged.StatementIndex;
                                //Debug.Log("removed from " + currentlyDragged.ProcName + "; potential swap from " + swap);
                                currentlyDragged.ProcName = null;
                                currentlyDragged.StatementIndex = null;
                            } else {
                                // we intersect with this proc, but we're already in a different one
                                //Debug.Log("already in " + currentlyDragged.ProcName + ", continuing");
                                continue;
                            }
                        }
                        for (int i = 0; i < statementRects[procName].Count; i++) {
                            var rect = statementRects[procName][i];
                            //Debug.Log(rect);
                            if ((swap.HasValue && ((i < swap && currentlyDragged.DragRect.yMin < rect.yMin + rect.height / 2) ||
                                                   (i >= swap && currentlyDragged.DragRect.yMin < rect.yMax + rect.height / 2))) ||
                                (!swap.HasValue && currentlyDragged.DragRect.yMin < rect.yMin)) {
                                // insert and return
                                //Debug.Log("inserted in " + procName + " at " + i + " from " + swap);
                                progman.Program.InsertStatement(procName, i, currentlyDragged.Statement);
                                currentlyDragged.ProcName = procName;
                                currentlyDragged.StatementIndex = i;
                                return;
                            }
                        }
                        // insert at end
                        //Debug.Log("inserted in " + procName + " at " + progman.Program.Program.Procedures[procName].Body.Count());
                        currentlyDragged.StatementIndex = progman.Program.Program.Procedures[procName].Body.Count();
                        progman.Program.AppendStatement(procName, currentlyDragged.Statement);
                        currentlyDragged.ProcName = procName;
                    }
                }
            }
        }
    }
}
