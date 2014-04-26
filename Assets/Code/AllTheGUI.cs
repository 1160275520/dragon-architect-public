using UnityEngine;
using System;
using System.Collections.Generic;
using System.Linq;

using Hackcraft.Ast;

public class Dragged
{
    public Imperative.Statement Statement;
    public string ProcName; // nullable
    public int? StatementIndex; // nullable
    public Rect DragRect;
    public float Delay;
}

public class AllTheGUI : MonoBehaviour
{
    private enum GUIStyleType {
        Standard = 0,
        Highlight = 1,
        CurrentHighlight = 2
    }
    private static readonly string[] BoxStyles = {"box", "BoxHighlight", "BoxCurrentHighlight"};
    private static readonly string[] TextStyles = {"textfield", "TextHighlight", "TextCurrentHighlight"};

    public static readonly int PROGRAM_COLUMN_WIDTH = 85;
    public static readonly int BUTTON_COLUMN_WIDTH = 110;
    public static readonly int BUTTON_HEIGHT = 25;
    public static readonly int SPACING = 10;
    public Font CodeFont;
    public Texture2D RepeatTex;
    public Texture2D RepeatTexHighlight;
    public GUISkin CustomSkin;
    private int curProc = 0;
    private Dictionary<string, List<Rect>> statementRects;
    private Dictionary<string, Rect> procRects;
    private Dictionary<string, Rect> buttonRects;
    private Dragged currentlyDragged;
    private Rect area;
    private float lastUpdateTime = 0.0f;
    private string[] PROCS = new string[] { "MAIN", "F1", "F2", "F3", "F4", "F5" };

    private bool isFirstUpdate = true;
    private Action currentModalWindow = null;
    private string currentlyTypedFilename = "";
    private int astIdCounter = 0;
    // important that this is prefix, 1 should be the first id
    private int NextId()
    {
        return ++astIdCounter;
    }

    void Start()
    {
        var prog = GetComponent<ProgramManager>().Manipulator;
        foreach (var p in PROCS) {
            prog.CreateProcedure(p);
        }
    }

    void Update() {
        if (isFirstUpdate) {
            isFirstUpdate = false;
            var manipulator = GetComponent<ProgramManager>().Manipulator;
            manipulator.Program = Hackcraft.Serialization.LoadFile("TestData/demo.txt");
            astIdCounter = manipulator.Program.AllIds.Max();
        }

        if (currentlyDragged != null && currentlyDragged.Delay > 0) {
            currentlyDragged.Delay -= Time.fixedTime - lastUpdateTime;
        }
        lastUpdateTime = Time.fixedTime;
    }

    Rect getLastRect()
    {
        var rect = GUILayoutUtility.GetLastRect();
        rect.x += area.x;
        rect.y += area.y;
        return rect;
    }

    void makeButton(string text, GUILayoutOption[] options, Action callback, bool draggable = false)
    {
        if (GUILayout.Button(text, options)) {
            callback();
        }
        if (draggable && Event.current.type == EventType.Repaint) {
            buttonRects [text] = getLastRect();
        }
    }

    Imperative.Statement makeStatement(string name)
    {
        switch (name.ToLower()) {
            case "forward":
                return Imperative.NewCall(NextId(), "Forward", new object[] { "1" });
            case "up":
                return Imperative.NewCall(NextId(), "Up", new object[] { "1" });
            case "down":
                return Imperative.NewCall(NextId(), "Down", new object[] { "1" });
            case "left":
                return Imperative.NewCall(NextId(), "Left", new object[] { });
            case "right":
                return Imperative.NewCall(NextId(), "Right", new object[] { });
            case "placeblock":
                return Imperative.NewCall(NextId(), "PlaceBlock", new object[] { });
            case "removeblock":
                return Imperative.NewCall(NextId(), "RemoveBlock", new object[] { });
            case "line":
                return Imperative.NewCall(NextId(), "Line", new object[] { "5" });
            case "repeat":
                return Imperative.NewRepeat(NextId(), Imperative.NewCall(0, "F5", new object[] { }), Imperative.Expression.NewLiteral("5"));
            case "call":
                return Imperative.NewCall(NextId(), "F5", new object[] { });
            default:
                throw new ArgumentException(name + " is not a recognized instruction name.");
        }
    }

    void OnGUI()
    {
        var progman = GetComponent<ProgramManager>();
        var manipulator = progman.Manipulator;
        GUI.skin = CustomSkin;

        if (currentModalWindow != null) {
            currentModalWindow();
        }
        if (Event.current.type == EventType.Repaint) {
            statementRects = new Dictionary<string, List<Rect>>();
            procRects = new Dictionary<string, Rect>();
            buttonRects = new Dictionary<string, Rect>();
        }

        // save/load dialog
        area = new Rect(Screen.width - 4 * 105, Screen.height - 2 * BUTTON_HEIGHT, 4 * 105, BUTTON_HEIGHT + SPACING);
        GUILayout.BeginArea(area);
        GUILayout.BeginVertical("ButtonBackground");
        GUILayout.BeginHorizontal();
        var options = new GUILayoutOption[] {
            GUILayout.Width(100),
            GUILayout.Height(BUTTON_HEIGHT)
        };
        makeButton("Clear", options, () => currentModalWindow = displayConfirmClear);
        makeButton("Save File", options, () => {
            string filename = null;
            if (currentlyTypedFilename.Length > 0) {
                filename = "TestData/" + currentlyTypedFilename;
            } else if (!Screen.fullScreen) {
                using (var dialog = new System.Windows.Forms.SaveFileDialog()) {
                    dialog.InitialDirectory = "TestData/";
                    if (dialog.ShowDialog() == System.Windows.Forms.DialogResult.OK) {
                        filename = dialog.FileName;
                    }
                }
            }
            if (filename != null) {
                Hackcraft.Serialization.SaveFile(filename, GetComponent<ProgramManager>().Manipulator.Program);
            }
        });
        makeButton("Load File", options, () => {
            string filename = null;
            if (currentlyTypedFilename.Length > 0) {
                filename = "TestData/" + currentlyTypedFilename;
            } else if (!Screen.fullScreen) {
                using (var dialog = new System.Windows.Forms.OpenFileDialog()) {
                    dialog.InitialDirectory = "TestData/";
                    if (dialog.ShowDialog() == System.Windows.Forms.DialogResult.OK) {
                        filename = dialog.FileName;
                    }
                }
            }
            if (filename != null) {
                manipulator.Program = Hackcraft.Serialization.LoadFile(filename);
                // reset the id counter to not overload with existing statements
                astIdCounter = manipulator.Program.AllIds.Max();
            }
        });
        var textStyle = new GUIStyle(GUI.skin.textField);
        textStyle.margin = new RectOffset(0, 0, 4, 0);
        currentlyTypedFilename = GUILayout.TextField(currentlyTypedFilename, textStyle, options);
        GUILayout.EndHorizontal();
        GUILayout.FlexibleSpace();
        GUILayout.EndVertical();
        GUILayout.EndArea();

        // instructions and other controls
        area = new Rect(SPACING, SPACING + 1.0f / 3 * Screen.height, BUTTON_COLUMN_WIDTH + 10, Screen.height - SPACING * 2);
        GUILayout.BeginArea(area);
        GUILayout.BeginVertical("ButtonBackground");
        options = new GUILayoutOption[] {
            GUILayout.Width(BUTTON_COLUMN_WIDTH),
            GUILayout.Height(BUTTON_HEIGHT)
        };
        GUILayout.Label("Click to\nadd to\nprogram", GUILayout.Width(BUTTON_COLUMN_WIDTH), GUILayout.Height(BUTTON_HEIGHT * 2.5f));
        makeButton("Forward", options, () => manipulator.AppendStatement(PROCS [curProc], makeStatement("forward")), true);
        makeButton("Up", options, () => manipulator.AppendStatement(PROCS [curProc], makeStatement("up")), true);
        makeButton("Down", options, () => manipulator.AppendStatement(PROCS [curProc], makeStatement("down")), true);
        makeButton("Left", options, () => manipulator.AppendStatement(PROCS [curProc], makeStatement("left")), true);
        makeButton("Right", options, () => manipulator.AppendStatement(PROCS [curProc], makeStatement("right")), true);
        makeButton("PlaceBlock", options, () => manipulator.AppendStatement(PROCS [curProc], makeStatement("placeblock")), true);
        makeButton("RemoveBlock", options, () => manipulator.AppendStatement(PROCS [curProc], makeStatement("removeblock")), true);
        makeButton("Line", options, () => manipulator.AppendStatement(PROCS [curProc], makeStatement("line")), true);
        makeButton("Repeat", options, () => manipulator.AppendStatement(PROCS [curProc], makeStatement("repeat")), true);
        makeButton("Call", options, () => manipulator.AppendStatement(PROCS [curProc], makeStatement("call")), true);
        GUILayout.EndVertical();
        GUILayout.EndArea();

        area = new Rect(SPACING, SPACING, BUTTON_COLUMN_WIDTH + 10, Screen.height - SPACING * 1.5f);
        GUILayout.BeginArea(area);
        GUILayout.BeginVertical("ButtonBackground");
        GUILayout.Label("Click to\ndo things", GUILayout.Width(BUTTON_COLUMN_WIDTH), GUILayout.Height(BUTTON_HEIGHT * 1.5f));
        if (progman.IsExecuting) {
            makeButton("Stop", options, () => progman.StopExecution());
        } else {
            makeButton("RUN!", options, () => progman.StartExecution());
        }
        //makeButton("Undo", options, () => progman.Undo());
        makeButton("Zoom In", options, () => FindObjectOfType<MyCamera>().Zoom(0.5f));
        makeButton("Zoom Out", options, () => FindObjectOfType<MyCamera>().Zoom(2f));
        makeButton("Roate Left", options, () => FindObjectOfType<MyCamera>().Rotate(90));
        makeButton("Roate Right", options, () => FindObjectOfType<MyCamera>().Rotate(-90));
        GUILayout.EndVertical();
        GUILayout.EndArea();

        // program display
        area = new Rect(Screen.width - 6 * (PROGRAM_COLUMN_WIDTH + SPACING), SPACING, 6 * (PROGRAM_COLUMN_WIDTH + SPACING), Screen.height - (BUTTON_HEIGHT * 3 + SPACING * 2));
        GUILayout.BeginArea(area);
        GUILayout.BeginVertical("ButtonBackground", GUILayout.Height (area.height));
        GUILayout.Label("Drag and Drop to edit program.", GUILayout.Width(6 * PROGRAM_COLUMN_WIDTH), GUILayout.Height(BUTTON_HEIGHT * .8f));
        curProc = GUILayout.SelectionGrid(curProc, PROCS, PROCS.Length);
        GUILayout.BeginHorizontal();
        GUILayout.Space(SPACING / 2);
        if (!progman.IsExecuting) {
            //Debug.Log(Event.current.type);
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
        if (currentlyDragged != null && currentlyDragged.Delay <= 0) {
            if (currentlyDragged.Statement.Stmt.IsCall) {
                GUI.Box(currentlyDragged.DragRect, currentlyDragged.Statement.Stmt.AsCall.Proc, "Dragged");
            } else if (currentlyDragged.Statement.Stmt.IsRepeat) {
                GUI.Box(currentlyDragged.DragRect, "Repeat", "Dragged");
            }
        }

        // time slider
        var sliderPos = progman.SliderPosition;
        var newSliderPos = GUI.HorizontalSlider(new Rect(20, Screen.height - 60, 400, 20), sliderPos, 0, 1);
        if (sliderPos != newSliderPos) {
            progman.SetProgramStateBySlider(newSliderPos);
        }

        // fps display
        makeFPS();
    }

    private void displayConfirmClear()
    {
        var midx = Screen.width / 2;
        var midy = Screen.height / 2;
        var hw = 100;
        var hh = 50;

        var r = new Rect(midx - hw, midy - hh, 2 * hw, 2 * hh);
        GUI.ModalWindow(213421345, r, (id) => {
            makeButton("Yes", null, () => {
                Hackcraft.Serialization.SaveFile(string.Format("TestData/autosave-{0:yyyy-MM-dd_HH-mm-ss}.txt", DateTime.Now), GetComponent<ProgramManager>().Manipulator.Program);
                GetComponent<ProgramManager>().Clear();
                currentModalWindow = null;
            } );
            makeButton("No", null, () => currentModalWindow = null);
        }, "Confirm Clear?");

    }

    void makeProc(string procName)
    {
        var progman = GetComponent<ProgramManager>();
        Imperative.Procedure proc;
        try {
            proc = progman.Manipulator.Program.Procedures [procName];
        } catch (KeyNotFoundException) {
            progman.Manipulator.CreateProcedure(procName);
            proc = progman.Manipulator.Program.Procedures [procName];
        }

        GUILayout.BeginVertical("CodeBackground", GUILayout.MaxWidth(PROGRAM_COLUMN_WIDTH));
        GUILayout.Space(SPACING / 2);
        var body = proc.Body;
        Imperative.Statement newStatement = null;

        var lastExecuted = progman.LastExecuted;

        for (int i = 0; i < body.Count(); i++) {
            if (body [i] == null) {
                GUILayout.Box("", "DragSnapped");
            } else {
                var command = body [i];
                var highlight = GUIStyleType.Standard;
                if (lastExecuted.FirstOrDefault() == body[i].Meta.Id) {
                    highlight = GUIStyleType.CurrentHighlight;
                } else if (lastExecuted.Contains(body [i].Meta.Id)) {
                    highlight = GUIStyleType.Highlight;
                }
                if (command.Stmt.IsCall) {
                    newStatement = makeCall(command, highlight);
                } else if (command.Stmt.IsRepeat) {
                    newStatement = makeRepeat(command, highlight);
                }
            }
            if (!progman.IsExecuting && Event.current.type == EventType.Repaint) {
                statementRects [procName].Add(getLastRect());
            }
            GUILayout.Space(SPACING / 2);

            if (newStatement != null) {
                progman.Manipulator.ReplaceStatement(procName, i, newStatement);
            }
        }
        GUILayout.FlexibleSpace();
        GUILayout.EndVertical();
        if (!progman.IsExecuting && Event.current.type == EventType.Repaint) {
            procRects.Add(procName, getLastRect());
        }
    }

    private Imperative.Statement makeCall(Imperative.Statement statement, GUIStyleType highlight)
    {
        GUILayout.BeginHorizontal();
        var call = statement.Stmt.AsCall;
        var procName = call.Proc;

        string newProcName = procName;
        if (!Library.Builtins.ContainsKey(procName)) {
            GUILayout.Box("Call", BoxStyles[(int)highlight]);
            GUI.SetNextControlName("Call" + statement.Meta.Id + "TextField");
            newProcName = GUILayout.TextField(procName, 2, TextStyles[(int)highlight], GUILayout.Width(25));
        } else {
            GUILayout.Box(procName, BoxStyles[(int)highlight]);
        }


        var arg1 = call.Args.Count() > 0 ? call.Args [0] as string : null;
        string newArg1 = null;
        if (arg1 != null) {
            GUI.SetNextControlName(procName + statement.Meta.Id + "TextField");
            newArg1 = GUILayout.TextField(arg1, 2, TextStyles[(int)highlight], GUILayout.Width(25));
        } 

        GUILayout.EndHorizontal();

        if (newArg1 == arg1 && newProcName == procName) {
            return null;
        } else {
            return Imperative.NewCall(NextId(), newProcName, newArg1 == null ? new object[] {} : new object[] { newArg1 });
        }
        
    }

    private Imperative.Statement makeRepeat(Imperative.Statement statement, GUIStyleType highlight)
    {
        var repeat = statement.Stmt.AsRepeat;
        var procName = repeat.Stmt.Stmt.AsCall.Proc;
        var numTimes = repeat.NumTimes.AsLiteral as string;

        GUILayout.BeginVertical(BoxStyles[(int)highlight]);
        GUILayout.BeginHorizontal();
        GUILayout.Box("Repeat", BoxStyles[(int)highlight]);
        GUI.SetNextControlName("Repeat" + statement.Meta.Id + "ProcTextField");
        var newProcName = GUILayout.TextField(procName, 2, TextStyles[(int)highlight], GUILayout.Width(25));
        GUILayout.EndHorizontal();
        GUILayout.BeginHorizontal();
        GUI.SetNextControlName("Repeat" + statement.Meta.Id + "NumTextField");
        var newNumTimes = GUILayout.TextField(numTimes, 3, TextStyles[(int)highlight], GUILayout.Width(35));
        GUILayout.Box("times", BoxStyles[(int)highlight]);
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

    void makeFPS()
    {
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

    bool rectIntersect(Rect r1, Rect r2)
    {
        return !(r1.xMin > r2.xMax ||
            r1.xMax < r2.xMin ||
            r1.yMin > r2.yMax ||
            r1.yMax < r2.yMin);
    }

    public bool IsDragging {
        get {
            return currentlyDragged != null;
        }
    }

    void doDragDrop()
    {
        var progman = GetComponent<ProgramManager>();
        var mousePosition = new Vector2(Input.mousePosition.x, Screen.height - Input.mousePosition.y); // bottom left is (0, 0)
//        if (currentlyDragged != null) { Debug.Log(currentlyDragged.ProcName); }
        // generate rects for statements
        if (Event.current.type == EventType.Repaint) {
            foreach (var procName in PROCS) {
                statementRects.Add(procName, new List<Rect>());
            }
        } else if (Input.GetMouseButtonDown(0) && currentlyDragged == null && GUI.GetNameOfFocusedControl() == "") {
            foreach (var procName in PROCS) {
                var proc = progman.Manipulator.Program.Procedures [procName];
                for (int i = 0; i < statementRects[procName].Count; i++) {
                    var rect = statementRects [procName] [i];
                    //Debug.Log(rect);
                    //Debug.Log(Event.current.mousePosition);
                    if (rect.Contains(mousePosition)) {
                        currentlyDragged = new Dragged { Statement = proc.Body[i], ProcName = procName, StatementIndex = i, DragRect = rect, Delay = 0.01f};
                        progman.IsCheckingForProgramChanges = false;
                        Debug.Log("Now dragging " + proc.Body[currentlyDragged.StatementIndex.Value] + " at index " + i);
                        return;
                    }
                }
            }
            //Debug.Log("checking buttons");
            foreach (var button in buttonRects) {
                //Debug.Log(button);
                if (button.Value.Contains(mousePosition)) {
                    currentlyDragged = new Dragged { Statement = makeStatement(button.Key), ProcName = null, StatementIndex = null, DragRect = button.Value, Delay = 0.1f };
                    progman.IsCheckingForProgramChanges = false;
                    Debug.Log("Now dragging " + button.Key + " starting at " + currentlyDragged.DragRect);
                    return;
                }
            }
        }
        // when mouse dragged, if the current proc contains the dragged statement, swap the statement to its new position
        else if (Input.GetMouseButton(0) && currentlyDragged != null && currentlyDragged.Delay <= 0) {
            // update position
            currentlyDragged.DragRect.x = mousePosition.x;
            currentlyDragged.DragRect.y = mousePosition.y; 
            //Debug.Log("dragRect = " + currentlyDragged.DragRect);
            Debug.Log(currentlyDragged.ProcName);
            // does it need to be removed from current proc (if it has one)
            if (currentlyDragged.ProcName != null && !rectIntersect(currentlyDragged.DragRect, procRects [currentlyDragged.ProcName])) {
                Debug.Log("removed from " + currentlyDragged.ProcName + "; no intersection");
                progman.Manipulator.RemoveStatement(currentlyDragged.ProcName, currentlyDragged.StatementIndex.Value);
                currentlyDragged.ProcName = null;
                currentlyDragged.StatementIndex = null;
            } else {
                foreach (var procName in PROCS) {
                    // should it be added to current procedure?
                    if (rectIntersect(currentlyDragged.DragRect, procRects [procName])) {
                        //Debug.Log("intersects with " + procName);
                        // where in the current procedure should it go?
                        int? swap = null;
                        if (currentlyDragged.ProcName != null) {
                            if (currentlyDragged.ProcName == procName) {
                                // remove in preparation for potential swap
                                progman.Manipulator.RemoveStatement(procName, currentlyDragged.StatementIndex.Value);
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
                        for (int i = 0; i < statementRects[procName].Count; i++) {
                            var rect = statementRects [procName] [i];
                            //Debug.Log(rect);
                            if ((swap.HasValue && ((i < swap && currentlyDragged.DragRect.yMin < rect.yMin + rect.height / 2) ||
                                (i >= swap && currentlyDragged.DragRect.yMin < rect.yMax + rect.height / 2))) ||
                                (!swap.HasValue && currentlyDragged.DragRect.yMin < rect.yMin)) {
                                // insert and return
                                if (progman.Manipulator.InsertStatement(procName, i, null)) {
                                    currentlyDragged.ProcName = procName;
                                    currentlyDragged.StatementIndex = i;
                                    Debug.Log("inserted in " + procName + " at " + i + " from " + swap);
                                }
                                return;
                            }
                        }
                        // insert at end
                        if (progman.Manipulator.AppendStatement(procName, null)) {
                            currentlyDragged.ProcName = procName;
                            currentlyDragged.StatementIndex = progman.Manipulator.Program.Procedures [procName].Body.Count() - 1;
                            Debug.Log("inserted in " + procName + " at " + (progman.Manipulator.Program.Procedures[procName].Body.Count() - 1));
                        }
                    }
                }
            }
        }
        if (!Input.GetMouseButton(0) && currentlyDragged != null) {
            //Debug.Log("drag ended");
            if (currentlyDragged.ProcName != null) {
                try {
                    progman.Manipulator.ReplaceStatement(currentlyDragged.ProcName, currentlyDragged.StatementIndex.Value, currentlyDragged.Statement);
                } catch (ArgumentOutOfRangeException) {}
            }
            currentlyDragged = null;
            progman.IsCheckingForProgramChanges = true;
        } 
    }
}
