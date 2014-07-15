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
    public Vector2 MouseOffset;
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

    public GUISkin CustomSkin;
    public GameObject SpeechBubble;

    public bool IsActiveMainControls = true;
    public bool IsActiveCodeEditor = true;
    public bool IsActiveTimeSlider = true;
    public bool IsActiveSaveLoad = true;
    public bool IsActiveReturnToLevelSelect = false;
    public bool IsActiveBlockly = true;

    public string CurrentMessage { get; set; }

    private int curProc = 0;
    private Dictionary<string, List<Rect>> statementRects;
    private Dictionary<string, Rect> procRects;
    private Dictionary<string, Rect> buttonRects;
    private Dragged currentlyDragged;
    private Rect area;
    private float lastUpdateTime = 0.0f;

    private bool isFirstUpdate = true;
    private Action currentModalWindow = null;
    private string currentlyTypedFilename = "";
    private int astIdCounter = 0;
    // important that this is prefix, 1 should be the first id
    private int NextId()
    {
        return ++astIdCounter;
    }

    void Start() {
//        Instantiate(SpeechBubble);
    }

    void Update() {
        if (isFirstUpdate) {
            isFirstUpdate = false;
            var manipulator = GetComponent<ProgramManager>().Manipulator;
            var allIds = manipulator.Program.AllIds;
            if (allIds.Count > 0) {
                astIdCounter = allIds.Max();
            }
        }

        if (currentlyDragged != null && currentlyDragged.Delay > 0) {
            currentlyDragged.Delay -= Time.fixedTime - lastUpdateTime;
        }
        lastUpdateTime = Time.fixedTime;

        if (Input.GetKey(KeyCode.LeftControl) && Input.GetKey(KeyCode.LeftShift) && Input.GetKey(KeyCode.L)) {
            Application.LoadLevel("loader");
        }
    }

    Rect getLastRect()
    {
        var rect = GUILayoutUtility.GetLastRect();
        rect.x += area.x;
        rect.y += area.y;
        return rect;
    }

    void makeButton(string text, GUILayoutOption[] options, Action callback, bool draggable = false, string style = "button")
    {
        if (GUILayout.Button(text, style, options)) {
            callback();
        }
        if (draggable && Event.current.type == EventType.Repaint) {
            buttonRects [text] = getLastRect();
        }
    }

    Imperative.Statement makeStatement(string name)
    {
        var lastProc = GetComponent<ProgramManager>().AvailableProcedures.Last();

        switch (name.ToLower()) {
            case "forward":
                return Imperative.NewCallL1(NextId(), "Forward", "1");
            case "up":
                return Imperative.NewCallL1(NextId(), "Up", "1");
            case "down":
                return Imperative.NewCallL1(NextId(), "Down", "1");
            case "left":
                return Imperative.NewCall0(NextId(), "Left");
            case "right":
                return Imperative.NewCall0(NextId(), "Right");
            case "placeblock":
                return Imperative.NewCall0(NextId(), "PlaceBlock");
            case "removeblock":
                return Imperative.NewCall0(NextId(), "RemoveBlock");
            case "line":
                return Imperative.NewCallL1(NextId(), "Line", "5");
            case "repeat":
                return Imperative.NewRepeat(NextId(), Imperative.NewCall0(0, lastProc), Imperative.Expression.NewLiteral("5"));
            case "call":
                return Imperative.NewCall0(NextId(), lastProc);
            default:
                throw new ArgumentException(name + " is not a recognized instruction name.");
        }
    }

    void OnGUI()
    {
        var progman = GetComponent<ProgramManager>();
        var procedures = progman.AvailableProcedures;
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

        GUILayoutOption[] options;

        if (CurrentMessage != null) {
//            GUI.Box(new Rect(160, SPACING, Math.Min(600, Screen.width - 160 - SPACING), 125), CurrentMessage, "ButtonBackground");
//            var offsetX = 25;
//            if (Camera.main.transform.position.x < salaPos.x) {
//                offsetX *= -1;
//            }
//            Debug.Log(offsetX);
//            var screenPos = Camera.main.WorldToScreenPoint(salaPos);
//            GUI.BeginGroup(new Rect(screenPos.x, Screen.height - screenPos.y - 75, 50, 50));
//            GUI.Label(new Rect(0, 0, 50, 50), "", "SpeechBubble");
//            var style = new GUIStyle("Label");
//            style.normal.textColor = Color.black;
//            GUI.Label(new Rect(13, 13, 35, 35), "...", style);
//            GUI.EndGroup();
        }
        if (IsActiveReturnToLevelSelect) {
            area = new Rect(Screen.width/2 - 100, Screen.height/2 - 50, 200, 100);
            GUILayout.BeginArea(area);
            GUILayout.BeginVertical("ButtonBackground");
            GUILayout.Label("Yay, you win!");
            var style = new GUIStyle("button");
            style.fontSize = 24;
            style.fontStyle = FontStyle.Bold;
            if (GUILayout.Button("Return to level select", style)) {
                GetComponent<ExternalAPI>().SendReturnToSelect();
            }
            GUILayout.EndVertical();
            GUILayout.EndArea();
        }
        // save/load dialog
        if (IsActiveSaveLoad) {
            area = new Rect(Screen.width - 4 * 105, Screen.height - 2 * BUTTON_HEIGHT, 4 * 105, BUTTON_HEIGHT + SPACING);
            GUILayout.BeginArea(area);
            GUILayout.BeginVertical("ButtonBackground");
            GUILayout.BeginHorizontal();
            options = new GUILayoutOption[] {
                GUILayout.Width(100),
                GUILayout.Height(BUTTON_HEIGHT)
            };
            makeButton("Clear", options, () => currentModalWindow = displayConfirmClear);
            makeButton("Save File", options, () => {
                string filename = null;
                if (currentlyTypedFilename.Length > 0) {
                    filename = "TestData/" + currentlyTypedFilename;
                }
                /*
                if (filename != null) {
                    Hackcraft.Serialization.SaveFile(filename, GetComponent<ProgramManager>().Manipulator.Program);
                }
                */
            });
            makeButton("Load File", options, () => {
                string filename = null;
                if (currentlyTypedFilename.Length > 0) {
                    filename = currentlyTypedFilename;
                }
                if (filename != null) {
                    progman.LoadProgram(filename);
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
        }

        // instructions and other controls
        if (IsActiveCodeEditor && !IsActiveBlockly) {
            area = new Rect(SPACING, SPACING + 1.0f / 3 * Screen.height, BUTTON_COLUMN_WIDTH + 10, Screen.height - SPACING * 2);
            GUILayout.BeginArea(area);
            GUILayout.BeginVertical("ButtonBackground");
            options = new GUILayoutOption[] {
                GUILayout.Width(BUTTON_COLUMN_WIDTH),
                GUILayout.Height(BUTTON_HEIGHT)
            };
            if (progman.IsEditable(procedures[curProc])) {
                GUILayout.Label("Click to\nadd to\nprogram", GUILayout.Width(BUTTON_COLUMN_WIDTH), GUILayout.Height(BUTTON_HEIGHT * 2.5f));
                makeButton("Forward", options, () => manipulator.AppendStatement(procedures[curProc], makeStatement("forward")), true);
                makeButton("Left", options, () => manipulator.AppendStatement(procedures[curProc], makeStatement("left")), true);
                makeButton("Right", options, () => manipulator.AppendStatement(procedures[curProc], makeStatement("right")), true);
                makeButton("Up", options, () => manipulator.AppendStatement(procedures[curProc], makeStatement("up")), true);
                makeButton("Down", options, () => manipulator.AppendStatement(procedures[curProc], makeStatement("down")), true);
                makeButton("PlaceBlock", options, () => manipulator.AppendStatement(procedures[curProc], makeStatement("placeblock")), true);
                makeButton("RemoveBlock", options, () => manipulator.AppendStatement(procedures[curProc], makeStatement("removeblock")), true);
                makeButton("Line", options, () => manipulator.AppendStatement(procedures[curProc], makeStatement("line")), true);
                makeButton("Call", options, () => manipulator.AppendStatement(procedures[curProc], makeStatement("call")), true);
                makeButton("Repeat", options, () => manipulator.AppendStatement(procedures[curProc], makeStatement("repeat")), true);
            } else {
                GUILayout.Label(procedures[curProc] + " is not\neditable.\nSelect a\ndifferent\nprocedure.", GUILayout.Width(BUTTON_COLUMN_WIDTH), GUILayout.Height(BUTTON_HEIGHT * 4.5f));
            }
            GUILayout.EndVertical();
            GUILayout.EndArea();
        }

        if (IsActiveMainControls && !IsActiveBlockly) {
            area = new Rect(SPACING, SPACING, BUTTON_COLUMN_WIDTH + 30, Screen.height - SPACING * 1.5f);
            GUILayout.BeginArea(area);
            GUILayout.BeginVertical("ButtonBackground");
            GUILayout.Label("Click to\ndo things", GUILayout.Width(BUTTON_COLUMN_WIDTH), GUILayout.Height(BUTTON_HEIGHT * 1.5f));
            options = new GUILayoutOption[] {
                GUILayout.Width(BUTTON_COLUMN_WIDTH+20),
                GUILayout.Height(BUTTON_HEIGHT)
            };
            if (!IsActiveBlockly) {
                if (progman.IsRunning) {
                    makeButton("Reset", new GUILayoutOption[] {
                        GUILayout.Width(BUTTON_COLUMN_WIDTH),
                        GUILayout.Height(2 * BUTTON_HEIGHT)
                    }, () => progman.StopRunning(), false, "StopButton");
                } else {
                    makeButton("RUN!", new GUILayoutOption[] {
                        GUILayout.Width(BUTTON_COLUMN_WIDTH),
                        GUILayout.Height(2 * BUTTON_HEIGHT)
                    }, () => progman.StartExecution(), false, "RunButton");
                }
            }
            //makeButton("Undo", options, () => progman.Undo());
            makeButton("Zoom In", options, () => FindObjectOfType<MyCamera>().Zoom(0.5f));
            makeButton("Zoom Out", options, () => FindObjectOfType<MyCamera>().Zoom(2f));
            makeButton("Rotate Left", options, () => FindObjectOfType<MyCamera>().Rotate(90));
            makeButton("Rotate Right", options, () => FindObjectOfType<MyCamera>().Rotate(-90));
            GUILayout.EndVertical();
            GUILayout.EndArea();
        }

        // program display
        if (IsActiveCodeEditor && !IsActiveBlockly) {
            area = new Rect(Screen.width - procedures.Length * (PROGRAM_COLUMN_WIDTH + SPACING) - SPACING, SPACING, procedures.Length * (PROGRAM_COLUMN_WIDTH + SPACING) + SPACING, Screen.height - (BUTTON_HEIGHT * 3 + SPACING * 2));
            GUILayout.BeginArea(area);
            GUILayout.BeginVertical("ButtonBackground", GUILayout.Height(area.height));
            GUILayout.Label("Drag and Drop to edit program.", GUILayout.Width(procedures.Length * PROGRAM_COLUMN_WIDTH), GUILayout.Height(BUTTON_HEIGHT * 2.0f));
            curProc = GUILayout.SelectionGrid(curProc, procedures, procedures.Length);
            GUILayout.BeginHorizontal();
            GUILayout.Space(SPACING);
            if (!progman.IsExecuting) {
                //Debug.Log(Event.current.type);
                dragDropFunctionOfDoom(procedures);
            }
            foreach (var procName in procedures) {
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
        }

        // time slider
        if (IsActiveTimeSlider) {
            var sliderPos = progman.SliderPosition;
            var newSliderPos = GUI.HorizontalSlider(new Rect(20, Screen.height - 60, 400, 20), sliderPos, 0, 1);
            if (sliderPos != newSliderPos) {
                progman.SetProgramStateBySlider(newSliderPos);
            }
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
                //Hackcraft.Serialization.SaveFile(string.Format("TestData/autosave-{0:yyyy-MM-dd_HH-mm-ss}.txt", DateTime.Now), GetComponent<ProgramManager>().Manipulator.Program);
                GetComponent<ProgramManager>().Clear();
                currentModalWindow = null;
            } );
            makeButton("No", null, () => currentModalWindow = null);
        }, "Confirm Clear?");

    }

    private void makeProc(string procName)
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
            GUIStyle style = new GUIStyle(BoxStyles[(int)highlight]);
            if (procName == "RemoveBlock") {
                style.fontSize = 12;
            }
            GUILayout.Box(procName, style);
        }


        var arg1 = call.Args.Count() > 0 ? (call.Args[0] as Imperative.Expression.Literal).Item as string : null;
        string newArg1 = null;
        if (arg1 != null) {
            GUI.SetNextControlName(procName + statement.Meta.Id + "TextField");
            newArg1 = GUILayout.TextField(arg1, 2, TextStyles[(int)highlight], GUILayout.Width(25));
        } 

        GUILayout.EndHorizontal();

        if (newArg1 == arg1 && newProcName == procName) {
            return null;
        } else {
            return Imperative.NewCall(NextId(), newProcName, newArg1 == null ? new Imperative.Expression[] {} : new Imperative.Expression[] { Imperative.Expression.NewLiteral(newArg1) });
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
            return Imperative.NewRepeat(NextId(), Imperative.NewCall0(0, newProcName), Imperative.Expression.NewLiteral(newNumTimes));
        }
    }

    private const float updateInterval = 0.5F;
    private float accum = 0; // FPS accumulated over the interval
    private int frames = 0; // Frames drawn over the interval
    private float timeleft = 0.5f; // Left time for current interval
    private float fps = 60;

    private void makeFPS()
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

    private bool rectIntersect(Rect r1, Rect r2)
    {
        return !(r1.xMin > r2.xMax ||
            r1.xMax < r2.xMin ||
            r1.yMin > r2.yMax ||
            r1.yMax < r2.yMin);
    }

    private float rectIntersectArea(Rect r1, Rect r2) {
        if (rectIntersect(r1, r2)) {
            float width, height;
            if (r1.xMin < r2.xMin) {
                width = r1.xMax - r2.xMin;
            } else {
                width = r2.xMax - r1.xMin;
            }
            if (r1.yMin < r2.yMin) {
                height = r1.yMax - r2.yMin;
            } else {
                height = r2.yMax - r1.yMin;
            }
            return width * height;
        }
        return 0;
    }

    private void dragDropFunctionOfDoom(string[] procedures)
    {
        var progman = GetComponent<ProgramManager>();
        var mousePosition = new Vector2(Input.mousePosition.x, Screen.height - Input.mousePosition.y); // bottom left is (0, 0)
        // generate rects for statements
        if (Event.current.type == EventType.Repaint) {
            foreach (var procName in procedures) {
                statementRects.Add(procName, new List<Rect>());
            }
        } 
        // detect drag in existing tiles or buttons, ignoring dragges in text fields
        else if (Input.GetMouseButtonDown(0) && currentlyDragged == null && GUI.GetNameOfFocusedControl() == "") {
            foreach (var procName in procedures) { // check existing tiles
                if (!progman.IsEditable(procName)) continue;

                var proc = progman.Manipulator.Program.Procedures [procName];
                for (int i = 0; i < statementRects[procName].Count; i++) {
                    var rect = statementRects [procName] [i];
                    //Debug.Log(rect);
                    //Debug.Log(Event.current.mousePosition);
                    if (rect.Contains(mousePosition)) {
                        currentlyDragged = new Dragged { Statement = proc.Body[i], ProcName = procName, StatementIndex = i, DragRect = rect, Delay = 0.01f, 
                                                         MouseOffset = new Vector2(rect.x - mousePosition.x, rect.y - mousePosition.y) };
                        progman.IsCheckingForProgramChanges = false;
                        //Debug.Log("Now dragging " + proc.Body[currentlyDragged.StatementIndex.Value] + " at index " + i);
                        return;
                    }
                }
            }
            //Debug.Log("checking buttons");
            foreach (var button in buttonRects) { // check buttons
                //Debug.Log(button);
                if (button.Value.Contains(mousePosition)) {
                    currentlyDragged = new Dragged { Statement = makeStatement(button.Key), ProcName = null, StatementIndex = null, DragRect = button.Value, Delay = 0.1f,
                                                     MouseOffset = new Vector2(button.Value.x - mousePosition.x, button.Value.y - mousePosition.y) };
                    progman.IsCheckingForProgramChanges = false;
                    //Debug.Log("Now dragging " + button.Key + " starting at " + currentlyDragged.DragRect);
                    return;
                }
            }
        }
        // when mouse dragged, remove the dragged statement from its current procedure and reinsert it in the appropriate one (may be the same one)
        else if (Input.GetMouseButton(0) && currentlyDragged != null && currentlyDragged.Delay <= 0) {
            // update position
            currentlyDragged.DragRect.x = currentlyDragged.MouseOffset.x + mousePosition.x;
            currentlyDragged.DragRect.y = currentlyDragged.MouseOffset.y + mousePosition.y;
            //Debug.Log("dragRect = " + currentlyDragged.DragRect);
            // remove from current proc (if it has one)
            if (currentlyDragged.ProcName != null) {
                //Debug.Log("removed from " + currentlyDragged.ProcName + "; no intersection");
                progman.Manipulator.RemoveStatement(currentlyDragged.ProcName, currentlyDragged.StatementIndex.Value);
                currentlyDragged.ProcName = null;
                currentlyDragged.StatementIndex = null;
            }
            // compute overlapping areas with procedure rectangles
            var areas = procedures.Select((procName, index) => new { Name=procName, Value = rectIntersectArea(currentlyDragged.DragRect, procRects[procName]), Index = index }).Where(x => progman.IsEditable(x.Name));
            if (areas.Any((x) => x.Value > 0)) { // if any overlap exists
                // find procedure with greatest overlap, and insert statement there
                var procName = procedures[areas.Aggregate((a, b) => a.Value > b.Value ? a : b).Index];
                //Debug.Log("intersects with " + procName);
                for (int i = 0; i < statementRects[procName].Count; i++) {
                    var rect = statementRects[procName][i];
                    //Debug.Log(rect);
                    if (currentlyDragged.DragRect.yMin < rect.yMin) {
                        // insert and return
                        if (progman.Manipulator.InsertStatement(procName, i, null)) {
                            currentlyDragged.ProcName = procName;
                            currentlyDragged.StatementIndex = i;
                            //Debug.Log("inserted in " + procName + " at " + i + " from " + swap);
                        }
                        return;
                    }
                }
                // insert at end
                if (progman.Manipulator.AppendStatement(procName, null)) {
                    currentlyDragged.ProcName = procName;
                    currentlyDragged.StatementIndex = progman.Manipulator.Program.Procedures[procName].Body.Count() - 1;
                    //Debug.Log("inserted in " + procName + " at " + (progman.Manipulator.Program.Procedures[procName].Body.Count() - 1));
                }
            }
        }
        // check for end of drag
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
