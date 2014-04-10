using UnityEngine;
using System.Collections.Generic;
using System.Linq;

public class Dragged {
    public string ProcName;
    public int StatementIndex;
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
        makeProc("Main");
        GUILayout.Space(SPACING);
        makeProc("F1");
        GUILayout.Space(SPACING);
        makeProc("F2");
        GUILayout.EndHorizontal();
        GUILayout.EndVertical();
        GUILayout.EndArea();
        if (currentlyDragged != null) {
            GUI.Box(currentlyDragged.DragRect, "drag");
        }
        makeFPS();
    }

    void makeProc(string procName) {
        var progman = GetComponent<ProgramManager>();

        var proc = progman.Program.Procedures[procName];
        
        // generate rects for statements
        if (Event.current.type == EventType.Repaint) {
            statementRects.Add(procName, new List<Rect>());
        }
        // when mouse down, determine which (if any) statement was clicked
        else if (Event.current.type == EventType.MouseDown) {
            for (int i = 0; i < statementRects[procName].Count; i++) {
                var rect = statementRects[procName][i];
                if (rect.Contains(Event.current.mousePosition)) {
                    currentlyDragged = new Dragged { ProcName = procName, StatementIndex = i, DragRect = rect };
                    Debug.Log("Now dragging " + proc.Body[currentlyDragged.StatementIndex] + " at index " + i);
                }
            }
        }
        // when mouse dragged, if the current proc contains the dragged statement, swap the statement to its new position
        else if (Event.current.type == EventType.MouseDrag && currentlyDragged != null && currentlyDragged.ProcName == procName) {
            currentlyDragged.DragRect.x = Event.current.mousePosition.x;
            currentlyDragged.DragRect.y = Event.current.mousePosition.y;
            Debug.Log("dragRect = " + currentlyDragged.DragRect);
            for (int i = 0; i < statementRects[procName].Count; i++) {
                var rect = statementRects[procName][i];
                Debug.Log(rect);
                if ((i < currentlyDragged.StatementIndex && currentlyDragged.DragRect.yMin < rect.yMin) || (i > currentlyDragged.StatementIndex && currentlyDragged.DragRect.yMin > rect.yMax)) {
                    var temp = proc.Body[currentlyDragged.StatementIndex];
                    Debug.Log(proc);
                    proc.Body.RemoveAt(currentlyDragged.StatementIndex);
                    proc.Body.Insert(i, temp);
                    currentlyDragged.StatementIndex = i;
                    Debug.Log("Moved statement to " + i);
                    Debug.Log(proc);
                    break;
                }
            }
        }
        // when mouse up, reset and remove if released outside procedure
        else if (Event.current.type == EventType.MouseUp && currentlyDragged != null && currentlyDragged.ProcName == procName) {
            if (!procRects[procName].Contains(Event.current.mousePosition)) {
                proc.Body.RemoveAt(currentlyDragged.StatementIndex);
            }
            currentlyDragged = null;
        }

        var codeStyle = new GUIStyle();
        setStyleBackground(codeStyle, new Color(0.2f, 0.2f, 0.2f, 0.5f));
        GUILayout.BeginVertical(codeStyle, GUILayout.Width(COLUMN_WIDTH));
        GUILayout.Space(proc.Body.Count > 0 ? SPACING/2 : SPACING * 5);
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
        background.alphaIsTransparency = true;
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
}
