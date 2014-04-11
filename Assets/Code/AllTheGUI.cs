using UnityEngine;
using System.Collections.Generic;
using System.Linq;

public class Dragged {
    public AST.Statement Statement;
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

    void Start() {
        var prog = GetComponent<ProgramManager>().Program;
        prog.Procedures = new Dictionary<string, AST.Procedure>();
        prog.Procedures.Add("Main", new AST.Procedure { Name = "Main" });
        prog.Procedures.Add("F1", new AST.Procedure { Name = "F1" });
        prog.Procedures.Add("F2", new AST.Procedure { Name = "F2" });
    }

    void Update() {
        if (currentlyDragged != null && !Input.GetMouseButton(0)) {
            Debug.Log("drag ended");
            currentlyDragged = null;
        }
    }

    void OnGUI() {
        var progman = GetComponent<ProgramManager>();

        GUILayout.BeginArea(new Rect(SPACING, SPACING, COLUMN_WIDTH+10, Screen.height - SPACING));
        var buttonStyle = new GUIStyle();
        setStyleBackground(buttonStyle, new Color(0.2f, 0.2f, 0.2f, 0.5f));
        GUILayout.BeginVertical(buttonStyle);
        var options = new GUILayoutOption[] { GUILayout.Width(COLUMN_WIDTH), GUILayout.Height(BUTTON_HEIGHT) };
        if (GUILayout.Button("Forward", options)) {
            progman.Program.Procedures.ElementAt(curProc).Value.Body.Add(new AST.Statement { Type = AST.StatementType.Call, Arg1 = Robot.CommandNames[Robot.Command.MoveForward], Arg2 = "1" });
        }
        if (GUILayout.Button("Up", options)) {
            progman.Program.Procedures.ElementAt(curProc).Value.Body.Add(new AST.Statement { Type = AST.StatementType.Call, Arg1 = Robot.CommandNames[Robot.Command.MoveUp], Arg2 = "1" });
        }
        if (GUILayout.Button("Down", options)) {
            progman.Program.Procedures.ElementAt(curProc).Value.Body.Add(new AST.Statement { Type = AST.StatementType.Call, Arg1 = Robot.CommandNames[Robot.Command.MoveDown], Arg2 = "1" });
        }
        if (GUILayout.Button("Left", options)) {
            progman.Program.Procedures.ElementAt(curProc).Value.Body.Add(new AST.Statement { Type = AST.StatementType.Call, Arg1 = Robot.CommandNames[Robot.Command.TurnLeft]});
        }
        if (GUILayout.Button("Right", options)) {
            progman.Program.Procedures.ElementAt(curProc).Value.Body.Add(new AST.Statement { Type = AST.StatementType.Call, Arg1 = Robot.CommandNames[Robot.Command.TurnRight]});
        }
        if (GUILayout.Button("Block", options)) {
            progman.Program.Procedures.ElementAt(curProc).Value.Body.Add(new AST.Statement { Type = AST.StatementType.Call, Arg1 = Robot.CommandNames[Robot.Command.PlaceBlock]});
        }
        if (GUILayout.Button("Repeat", options)) {
            progman.Program.Procedures.ElementAt(curProc).Value.Body.Add(new AST.Statement { Type = AST.StatementType.Repeat, Arg1 = "F1", Arg2 = "5" });
        }
        //switch (curProc) {
        //    case 0:
                if (GUILayout.Button("F1", options)) {
                    progman.Program.Procedures.ElementAt(curProc).Value.Body.Add(new AST.Statement { Type = AST.StatementType.Call, Arg1 = "F1"});
                }
                if (GUILayout.Button("F2", options)) {
                    progman.Program.Procedures.ElementAt(curProc).Value.Body.Add(new AST.Statement { Type = AST.StatementType.Call, Arg1 = "F2"});
                }
        //        break;
        //}
        if (progman.IsExecuting) {
            if (GUILayout.Button("Stop", options)) {
                progman.Stop();
            }
        }
        else if (GUILayout.Button("Execute", options)) {
            progman.Execute();
        }
        if (GUILayout.Button("Clear", options)) {
            progman.Program.Procedures.ElementAt(curProc).Value.Body = new List<AST.Statement>();
        }
        if (GUILayout.Button("Undo", options)) {
            progman.Undo();
        }
        GUILayout.EndVertical();
        GUILayout.EndArea();

       
        GUILayout.BeginArea(new Rect(Screen.width - 3 * (COLUMN_WIDTH + SPACING), SPACING, 3 * (COLUMN_WIDTH + SPACING), Screen.height));
        GUILayout.BeginVertical(buttonStyle);
        var procNames = progman.Program.Procedures.Keys;
        curProc = GUILayout.SelectionGrid(curProc, procNames.ToArray(), procNames.Count);
        GUILayout.BeginHorizontal();
        GUILayout.Space(SPACING / 2);
        if (Event.current.type == EventType.Repaint) {
            statementRects = new Dictionary<string, List<Rect>>();
            procRects = new Dictionary<string, Rect>();
        }
        doDragDrop();
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
            GUI.Box(adjustedRect, string.Format("{0}   {1}", currentlyDragged.Statement.Arg1, currentlyDragged.Statement.Arg2), boxStyle);
        }
        makeFPS();
    }

    void makeProc(string procName) {
        var progman = GetComponent<ProgramManager>();

        var proc = progman.Program.Procedures[procName];

        var codeStyle = new GUIStyle();
        setStyleBackground(codeStyle, new Color(0.2f, 0.2f, 0.2f, 0.5f));
        GUILayout.BeginVertical(codeStyle, GUILayout.Width(COLUMN_WIDTH), GUILayout.MinHeight(SPACING * 5));
        GUILayout.Space(SPACING / 2);
        var body = progman.Program.Procedures[procName].Body;
        for (int i = 0; i < body.Count; i++) {
            var command = body[i];
            var programState = progman.programState;
            var highlight = programState != null ? procName == programState.Proc.Name && i == programState.Statement : false;
            switch (command.Type) {
                case AST.StatementType.Call:
                    makeCall(command, highlight);
                    if (Event.current.type == EventType.Repaint) {
                        statementRects[procName].Add(GUILayoutUtility.GetLastRect());
                    }
                    GUILayout.Space(SPACING / 2);
                    break;
                case AST.StatementType.Repeat:
                    makeRepeat(command, highlight);
                    GUILayout.Space(SPACING / 2);
                    break;
            }
        }
        GUILayout.EndVertical();
        if (Event.current.type == EventType.Repaint) {
            procRects.Add(procName, GUILayoutUtility.GetLastRect());
        }
    }

    void makeCall(AST.Statement statement, bool highlight) {
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
        GUILayout.Box((string)statement.Arg1, boxStyle);
        if (statement.Arg2 is string) {
            statement.Arg2 = GUILayout.TextField((string)statement.Arg2, 2, boxStyle, GUILayout.MinWidth(25));
        }
        GUILayout.EndHorizontal();
    }

    void makeRepeat(AST.Statement statement, bool highlight) {
        var boxStyle = new GUIStyle();
        if (highlight) {
            boxStyle.normal.background = RepeatTexHighlight;
        } else {
            boxStyle.normal.background = RepeatTex;
        }
        boxStyle.padding = new RectOffset(0, 0, 5, 5);

        var textStyle = new GUIStyle();
        textStyle.font = CodeFont;
        textStyle.fontSize = 14;
        textStyle.normal.textColor = Color.white;
        textStyle.alignment = TextAnchor.MiddleCenter;
        GUILayout.BeginVertical(boxStyle);
        GUILayout.BeginHorizontal();
        GUILayout.Box("Repeat", textStyle);
        statement.Arg1 = GUILayout.TextField((string)statement.Arg1, 2, textStyle, GUILayout.MinWidth(25));
        GUILayout.EndHorizontal();
        GUILayout.BeginHorizontal();
        statement.Arg2 = GUILayout.TextField((string)statement.Arg2, 3, textStyle, GUILayout.MinWidth(35));
        GUILayout.Box("times", textStyle);
        GUILayout.EndHorizontal();
        GUILayout.EndVertical();
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
            foreach (var proc in progman.Program.Procedures.Values) {
                statementRects.Add(proc.Name, new List<Rect>());
            }
        }
        // when mouse down, determine which (if any) statement was clicked
        else if (Event.current.type == EventType.MouseDown) {
            foreach (var proc in progman.Program.Procedures.Values) {
                for (int i = 0; i < statementRects[proc.Name].Count; i++) {
                    var rect = statementRects[proc.Name][i];
                    if (rect.Contains(Event.current.mousePosition)) {
                        currentlyDragged = new Dragged { Statement = proc.Body[i], ProcName = proc.Name, StatementIndex = i, DragRect = rect };
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
                progman.Program.Procedures[currentlyDragged.ProcName].Body.RemoveAt(currentlyDragged.StatementIndex.Value);
                currentlyDragged.ProcName = null;
                currentlyDragged.StatementIndex = null;
            } else {
                foreach (var proc in progman.Program.Procedures.Values) {
                    // should it be added to current procedure?
                    if (rectIntersect(currentlyDragged.DragRect, procRects[proc.Name])) {
                        Debug.Log("intersects with " + proc.Name);
                        // where in the curren procedure should it go?
                        int? swap = null;
                        if (currentlyDragged.ProcName != null) {
                            if (currentlyDragged.ProcName == proc.Name) {
                                // remove in preparation for potential swap
                                progman.Program.Procedures[currentlyDragged.ProcName].Body.RemoveAt(currentlyDragged.StatementIndex.Value);
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
                        for (int i = 0; i < statementRects[proc.Name].Count; i++) {
                            var rect = statementRects[proc.Name][i];
                            Debug.Log(rect);
                            if ((swap.HasValue && ((i < swap && currentlyDragged.DragRect.yMin < rect.yMin + rect.height / 2) ||
                                                   (i >= swap && currentlyDragged.DragRect.yMin < rect.yMax + rect.height / 2))) ||
                                (!swap.HasValue && currentlyDragged.DragRect.yMin < rect.yMin)) {
                                // insert and return
                                Debug.Log("inserted in " + proc.Name + " at " + i + " from " + swap);
                                proc.Body.Insert(i, currentlyDragged.Statement);
                                currentlyDragged.ProcName = proc.Name;
                                currentlyDragged.StatementIndex = i;
                                return;
                            }
                        }
                        // insert at end
                        Debug.Log("inserted in " + proc.Name + " at " + proc.Body.Count);
                        currentlyDragged.StatementIndex = proc.Body.Count;
                        proc.Body.Add(currentlyDragged.Statement);
                        currentlyDragged.ProcName = proc.Name;
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
