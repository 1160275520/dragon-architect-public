using UnityEngine;
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
    private int curProc = 0;
    private Dictionary<string, List<Rect>> statementRects;
    private Dictionary<string, Rect> procRects;
    private Dragged currentlyDragged;
    private string[] PROCS = new string[] { "Main", "F1", "F2" };

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

        GUILayout.BeginArea(new Rect(SPACING, SPACING, COLUMN_WIDTH+10, Screen.height - SPACING));
        var buttonStyle = new GUIStyle();
        setStyleBackground(buttonStyle, new Color(0.2f, 0.2f, 0.2f, 0.5f));
        GUILayout.BeginVertical(buttonStyle);
        var options = new GUILayoutOption[] { GUILayout.Width(COLUMN_WIDTH), GUILayout.Height(BUTTON_HEIGHT) };
        if (GUILayout.Button("Forward", options)) {
            program.AppendStatement(PROCS[curProc], Imperative.NewCall("Forward", new object[] { "1" }));
        }
        if (GUILayout.Button("Up", options)) {
            program.AppendStatement(PROCS[curProc], Imperative.NewCall("Up", new object[] { "1" }));
        }
        if (GUILayout.Button("Down", options)) {
            program.AppendStatement(PROCS[curProc], Imperative.NewCall("Down", new object[] { "1" }));
        }
        if (GUILayout.Button("Left", options)) {
            program.AppendStatement(PROCS[curProc], Imperative.NewCall("Left", new object[]{}));
        }
        if (GUILayout.Button("Right", options)) {
            program.AppendStatement(PROCS[curProc], Imperative.NewCall("Right", new object[]{}));
        }
        if (GUILayout.Button("Block", options)) {
            program.AppendStatement(PROCS[curProc], Imperative.NewCall("PlaceBlock", new object[]{}));
        }
        if (GUILayout.Button("Repeat", options)) {
            program.AppendStatement(PROCS[curProc], Imperative.NewRepeat(Imperative.NewCall("F1", new object[]{}), Imperative.Expression.NewLiteral("5")));
        }
        if (GUILayout.Button("F1", options)) {
            program.AppendStatement(PROCS[curProc], Imperative.NewCall("F1", new object[]{}));
        }
        if (GUILayout.Button("F2", options)) {
            program.AppendStatement(PROCS[curProc], Imperative.NewCall("F2", new object[]{}));
        }
        if (progman.IsExecuting && GUILayout.Button("Stop", options)) {
            progman.Stop();
        } else if (GUILayout.Button("Execute", options)) {
            progman.Execute();
        }
        if (GUILayout.Button("Clear", options)) {
            program.CreateProcedure(PROCS[curProc]);
        }
        if (GUILayout.Button("Undo", options)) {
            progman.Undo();
        }
        GUILayout.EndVertical();
        GUILayout.EndArea();

       
        GUILayout.BeginArea(new Rect(Screen.width - 3 * (COLUMN_WIDTH + SPACING), SPACING, 3 * (COLUMN_WIDTH + SPACING), Screen.height));
        GUILayout.BeginVertical(buttonStyle);
        var procNames = (from kvp in program.Program.Procedures select kvp.Key).ToArray();
        curProc = GUILayout.SelectionGrid(curProc, procNames, procNames.Length);
        GUILayout.BeginHorizontal();
        GUILayout.Space(SPACING / 2);
        if (Event.current.type == EventType.Repaint) {
            statementRects = new Dictionary<string, List<Rect>>();
            procRects = new Dictionary<string, Rect>();
        }
        //doDragDrop();
        makeProc("Main");
        GUILayout.Space(SPACING);
        makeProc("F1");
        GUILayout.Space(SPACING);
        makeProc("F2");
        GUILayout.EndHorizontal();
        GUILayout.EndVertical();
        GUILayout.EndArea();
        if (currentlyDragged != null && currentlyDragged.ProcName == null) {
            var adjustedRect = new Rect(currentlyDragged.DragRect);
            adjustedRect.x += Screen.width - 3 * (COLUMN_WIDTH + SPACING);
            adjustedRect.y += SPACING;
            var boxStyle = new GUIStyle();
            setStyleBackground(boxStyle, Color.black);
            boxStyle.normal.textColor = Color.white;
            boxStyle.alignment = TextAnchor.MiddleCenter;
            boxStyle.padding = new RectOffset(0, 0, 5, 5);
            boxStyle.font = CodeFont;
            boxStyle.fontSize = 14;
            // XXX TODO put this back in
            //GUI.Box(adjustedRect, string.Format("{0}   {1}", currentlyDragged.Statement.Arg1, currentlyDragged.Statement.Arg2), boxStyle);
        }
        makeFPS();
    }

    void makeProc(string procName) {
        var progman = GetComponent<ProgramManager>();
        var proc = progman.Program.Program.Procedures[procName];

        var codeStyle = new GUIStyle();
        setStyleBackground(codeStyle, new Color(0.2f, 0.2f, 0.2f, 0.5f));
        GUILayout.BeginVertical(codeStyle, GUILayout.Width(COLUMN_WIDTH), GUILayout.MinHeight(SPACING * 5));
        GUILayout.Space(SPACING / 2);
        var body = proc.Body;
        Imperative.Statement newStatement = null;

        for (int i = 0; i < body.Count(); i++) {
            var command = body[i];
            var programState = progman.programState;
            //var highlight = programState != null ? procName == programState.Proc.Name && i == programState.Statement : false;
            var highlight = false;
            if (command.IsCall) {
                newStatement = makeCall(command.AsCall, highlight);
                GUILayout.Space(SPACING / 2);
            } else if (command.IsRepeat) {
                newStatement = makeRepeat(command.AsRepeat, highlight);
                GUILayout.Space(SPACING / 2);
            }

            // XXX why does this only happen for call?
            if (Event.current.type == EventType.Repaint) {
                //statementRects[procName].Add(GUILayoutUtility.GetLastRect());
            }

            if (newStatement != null) {
                progman.Program.ReplaceStatement(procName, i, newStatement);
            }
        }
        GUILayout.EndVertical();
        if (Event.current.type == EventType.Repaint) {
            procRects.Add(procName, GUILayoutUtility.GetLastRect());
        }
    }

    private Imperative.Statement makeCall(Imperative.Call statement, bool highlight) {
        var boxStyle = new GUIStyle();
        if (highlight) {
            setStyleBackground(boxStyle, new Color(0.9f, 0.6f, 0.5f, 0.5f));
        } else {
            setStyleBackground(boxStyle, Color.black);
        }
        boxStyle.normal.textColor = Color.white;
        boxStyle.alignment = TextAnchor.MiddleCenter;
        boxStyle.padding = new RectOffset(0, 0, 5, 5);
        boxStyle.font = CodeFont;
        boxStyle.fontSize = 14;
        GUILayout.BeginHorizontal();

        var procName = statement.Proc;
        var arg1 = statement.Args.Count() > 0 ? statement.Args[0] as string : null;

        if (arg1 != null) {
            GUILayout.Box(procName, boxStyle);
            var newArg1 = GUILayout.TextField(arg1, 2, boxStyle, GUILayout.MinWidth(25));
            GUILayout.EndHorizontal();

            if (newArg1 == arg1) {
                return null;
            } else {
                return Imperative.NewCall(procName, new object[] { newArg1 });
            }
        } else {
            return null;
        }
    }

    private Imperative.Statement makeRepeat(Imperative.Repeat statement, bool highlight) {
        var boxStyle = new GUIStyle();
        if (highlight) {
            boxStyle.normal.background = RepeatTexHighlight;
        } else {
            boxStyle.normal.background = RepeatTex;
        }
        boxStyle.padding = new RectOffset(0, 0, 5, 5);

        var procName = statement.Stmt.AsCall.Proc;
        var numTimes = statement.NumTimes.AsLiteral as string;

        var textStyle = new GUIStyle();
        textStyle.font = CodeFont;
        textStyle.fontSize = 14;
        textStyle.normal.textColor = Color.white;
        textStyle.alignment = TextAnchor.MiddleCenter;
        GUILayout.BeginVertical(boxStyle);
        GUILayout.BeginHorizontal();
        GUILayout.Box("Repeat", textStyle);
        var newProcName = GUILayout.TextField(procName, 2, textStyle, GUILayout.MinWidth(25));
        GUILayout.EndHorizontal();
        GUILayout.BeginHorizontal();
        var newNumTimes = GUILayout.TextField(numTimes, 3, textStyle, GUILayout.MinWidth(35));
        GUILayout.Box("times", textStyle);
        GUILayout.EndHorizontal();
        GUILayout.EndVertical();

        if (procName == newProcName && numTimes == newNumTimes) {
            return null;
        } else {
            return Imperative.NewRepeat(Imperative.NewCall(newProcName, new object[]{}), Imperative.Expression.NewLiteral(newNumTimes));
        }
    }

    void setStyleBackground(GUIStyle style, Color color) {
        var background = new Texture2D(1, 1);
        background.SetPixel(0, 0, color);
        //background.alphaIsTransparency = true;
        background.Apply();
        style.normal.background = background;
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
        var fpsStyle = new GUIStyle();
        setStyleBackground(fpsStyle, Color.black);
        if (fps < 30)
            fpsStyle.normal.textColor = Color.yellow;
        else
            if (fps < 10)
                fpsStyle.normal.textColor = Color.red;
            else
                fpsStyle.normal.textColor = Color.green;
        string format = System.String.Format("{0:F2} FPS", fps);
        GUI.Label(new Rect(Screen.width - 65, 0, 65, 15), format, fpsStyle);
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
            foreach (var kvp in progman.Program.Program.Procedures) {
                statementRects.Add(kvp.Key, new List<Rect>());
            }
        }
        // when mouse down, determine which (if any) statement was clicked
        else if (Event.current.type == EventType.MouseDown) {
            foreach (var kvp in progman.Program.Program.Procedures) {
                var name = kvp.Key;
                var proc = kvp.Value;
                for (int i = 0; i < statementRects[name].Count; i++) {
                    var rect = statementRects[name][i];
                    if (rect.Contains(Event.current.mousePosition)) {
                        currentlyDragged = new Dragged { Statement = proc.Body[i], ProcName = name, StatementIndex = i, DragRect = rect };
                        Debug.Log("Now dragging " + proc.Body[currentlyDragged.StatementIndex.Value] + " at index " + i);
                    }
                }
            }
            
        }
        // when mouse dragged, if the current proc contains the dragged statement, swap the statement to its new position
        else if (Event.current.type == EventType.MouseDrag && currentlyDragged != null) {
            // update position
            currentlyDragged.DragRect.x = Event.current.mousePosition.x;
            currentlyDragged.DragRect.y = Event.current.mousePosition.y;
            Debug.Log("dragRect = " + currentlyDragged.DragRect);

            // does it need to be removed from current proc (if it has one)
            if (currentlyDragged.ProcName != null && !rectIntersect(currentlyDragged.DragRect, procRects[currentlyDragged.ProcName])) {
                Debug.Log("removed from " + currentlyDragged.ProcName + "; no intersection");
                progman.Program.RemoveStatement(currentlyDragged.ProcName,currentlyDragged.StatementIndex.Value);
                currentlyDragged.ProcName = null;
                currentlyDragged.StatementIndex = null;
            } else {
                foreach (var kvp in progman.Program.Program.Procedures) {
                    var proc = kvp.Value;
                    var name = kvp.Key;
                    // should it be added to current procedure?
                    if (rectIntersect(currentlyDragged.DragRect, procRects[name])) {
                        Debug.Log("intersects with " + name);
                        // where in the curren procedure should it go?
                        int? swap = null;
                        if (currentlyDragged.ProcName != null) {
                            if (currentlyDragged.ProcName == name) {
                                // remove in preparation for potential swap
                                progman.Program.RemoveStatement(name,currentlyDragged.StatementIndex.Value);
                                swap = currentlyDragged.StatementIndex;
                                Debug.Log("removed from " + currentlyDragged.ProcName + "; potential swap from " + swap);
                                currentlyDragged.ProcName = null;
                                currentlyDragged.StatementIndex = null;
                            } else {
                                // we intersect with this proc, but we're already in a different one
                                Debug.Log("already in " + currentlyDragged.ProcName + ", continuing");
                                continue;
                            }
                        }
                        for (int i = 0; i < statementRects[name].Count; i++) {
                            var rect = statementRects[name][i];
                            Debug.Log(rect);
                            if ((swap.HasValue && ((i < swap && currentlyDragged.DragRect.yMin < rect.yMin + rect.height / 2) ||
                                                   (i >= swap && currentlyDragged.DragRect.yMin < rect.yMax + rect.height / 2))) ||
                                (!swap.HasValue && currentlyDragged.DragRect.yMin < rect.yMin)) {
                                // insert and return
                                Debug.Log("inserted in " + name + " at " + i + " from " + swap);
                                progman.Program.InsertStatement(name, i, currentlyDragged.Statement);
                                currentlyDragged.ProcName = name;
                                currentlyDragged.StatementIndex = i;
                                return;
                            }
                        }
                        // insert at end
                        Debug.Log("inserted in " + name + " at " + proc.Body.Count());
                        currentlyDragged.StatementIndex = proc.Body.Count();
                        progman.Program.AppendStatement(name, currentlyDragged.Statement);
                        currentlyDragged.ProcName = name;
                    }
                }
            }
        }
        // when mouse up, reset and remove if released outside procedure
        //if (Event.current.type == EventType.MouseUp && currentlyDragged != null) {
        //    Debug.Log("drag ended");
        //    currentlyDragged = null;
        //}
    }
}
