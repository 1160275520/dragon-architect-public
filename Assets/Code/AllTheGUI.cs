using UnityEngine;
using System.Collections.Generic;
using System.Linq;

public class AllTheGUI : MonoBehaviour
{
    public static readonly int COLUMN_WIDTH = 75;
    public static readonly int BUTTON_HEIGHT = 25;
    public static readonly int SPACING = 10;

    public Font CodeFont;
    public Texture2D RepeatTex;
    public Texture2D RepeatTexHighlight; 
    int curProc = 0;

    void Start() {
        FindObjectOfType<ProgramManager>().Program.Procedures = new Dictionary<string, AST.Procedure>();
        FindObjectOfType<ProgramManager>().Program.Procedures.Add("Main", new AST.Procedure { Name = "Main" });
        FindObjectOfType<ProgramManager>().Program.Procedures.Add("F1", new AST.Procedure { Name = "F1" });
        FindObjectOfType<ProgramManager>().Program.Procedures.Add("F2", new AST.Procedure { Name = "F2" });
    }

    void OnGUI() {
        GUILayout.BeginArea(new Rect(SPACING, SPACING, COLUMN_WIDTH+10, Screen.height - SPACING));
        var buttonStyle = new GUIStyle();
        setStyleBackground(buttonStyle, new Color(0.2f, 0.2f, 0.2f, 0.5f));
        GUILayout.BeginVertical(buttonStyle);
        var options = new GUILayoutOption[] { GUILayout.Width(COLUMN_WIDTH), GUILayout.Height(BUTTON_HEIGHT) };
        if (GUILayout.Button("Forward", options)) {
            FindObjectOfType<ProgramManager>().Program.Procedures.ElementAt(curProc).Value.Body.Add(new AST.Statement { Type = AST.StatementType.Call, Arg1 = Robot.CommandNames[Robot.Command.MoveForward] });
        }
        if (GUILayout.Button("Up", options)) {
            FindObjectOfType<ProgramManager>().Program.Procedures.ElementAt(curProc).Value.Body.Add(new AST.Statement { Type = AST.StatementType.Call, Arg1 = Robot.CommandNames[Robot.Command.MoveUp] });
        }
        if (GUILayout.Button("Down", options)) {
            FindObjectOfType<ProgramManager>().Program.Procedures.ElementAt(curProc).Value.Body.Add(new AST.Statement { Type = AST.StatementType.Call, Arg1 = Robot.CommandNames[Robot.Command.MoveDown] });
        }
        if (GUILayout.Button("Left", options)) {
            FindObjectOfType<ProgramManager>().Program.Procedures.ElementAt(curProc).Value.Body.Add(new AST.Statement { Type = AST.StatementType.Call, Arg1 = Robot.CommandNames[Robot.Command.TurnLeft] });
        }
        if (GUILayout.Button("Right", options)) {
            FindObjectOfType<ProgramManager>().Program.Procedures.ElementAt(curProc).Value.Body.Add(new AST.Statement { Type = AST.StatementType.Call, Arg1 = Robot.CommandNames[Robot.Command.TurnRight] });
        }
        if (GUILayout.Button("Block", options)) {
            FindObjectOfType<ProgramManager>().Program.Procedures.ElementAt(curProc).Value.Body.Add(new AST.Statement { Type = AST.StatementType.Call, Arg1 = Robot.CommandNames[Robot.Command.PlaceBlock] });
        }
        if (GUILayout.Button("Repeat", options)) {
            FindObjectOfType<ProgramManager>().Program.Procedures.ElementAt(curProc).Value.Body.Add(new AST.Statement { Type = AST.StatementType.Repeat, Arg1 = "F1", Arg2 = "5"});
        }
        switch (curProc) {
            case 0:
                if (GUILayout.Button("F1", options)) {
                    FindObjectOfType<ProgramManager>().Program.Procedures.ElementAt(curProc).Value.Body.Add(new AST.Statement { Type = AST.StatementType.Call, Arg1 = "F1" });
                }
                if (GUILayout.Button("F2", options)) {
                    FindObjectOfType<ProgramManager>().Program.Procedures.ElementAt(curProc).Value.Body.Add(new AST.Statement { Type = AST.StatementType.Call, Arg1 = "F2" });
                }
                break;
        }
        if (FindObjectOfType<ProgramManager>().IsExecuting) {
            if (GUILayout.Button("Stop", options)) {
                FindObjectOfType<ProgramManager>().Stop();
            }
        }
        else if (GUILayout.Button("Execute", options)) {
            FindObjectOfType<ProgramManager>().Execute();
        }
        if (GUILayout.Button("Clear", options)) {
            FindObjectOfType<ProgramManager>().Program.Procedures.ElementAt(curProc).Value.Body = new List<AST.Statement>();
        }
        GUILayout.EndVertical();
        GUILayout.EndArea();

       
        GUILayout.BeginArea(new Rect(Screen.width - 3 * (COLUMN_WIDTH + SPACING), SPACING, 3 * (COLUMN_WIDTH + SPACING), Screen.height));
        GUILayout.BeginVertical(buttonStyle);
        var procNames = FindObjectOfType<ProgramManager>().Program.Procedures.Keys;
        curProc = GUILayout.SelectionGrid(curProc, procNames.ToArray(), procNames.Count);
        GUILayout.BeginHorizontal();
        GUILayout.Space(SPACING / 2);
        makeProc("Main");
        GUILayout.Space(SPACING);
        makeProc("F1");
        GUILayout.Space(SPACING);
        makeProc("F2");
        GUILayout.EndHorizontal();
        GUILayout.EndVertical();
        GUILayout.EndArea();
    }

    void makeProc(string procName) {
        var codeStyle = new GUIStyle();
        setStyleBackground(codeStyle, new Color(0.2f, 0.2f, 0.2f, 0.5f));
        GUILayout.BeginVertical(codeStyle, GUILayout.Width(COLUMN_WIDTH));
        GUILayout.Space(FindObjectOfType<ProgramManager>().Program.Procedures[procName].Body.Count > 0 ? SPACING/2 : SPACING * 5);
        var body = FindObjectOfType<ProgramManager>().Program.Procedures[procName].Body;
        for (int i = 0; i < body.Count; i++) {
            var command = body[i];
            var programState = FindObjectOfType<ProgramManager>().programState;
            var highlight = programState != null ? procName == programState.Proc.Name && i == programState.Statement : false;
            switch (command.Type) {
                case AST.StatementType.Call:
                    makeCall(command, highlight);
                    GUILayout.Space(SPACING / 2);
                    break;
                case AST.StatementType.Repeat:
                    makeRepeat(command, highlight);
                    GUILayout.Space(SPACING / 2);
                    break;
            }
        }
        GUILayout.EndVertical();
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
        GUILayout.Box((string)statement.Arg1, boxStyle);
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

    public void setStyleBackground(GUIStyle style, Color color) {
        var background = new Texture2D(1, 1);
        background.SetPixel(0, 0, color);
        background.alphaIsTransparency = true;
        background.Apply();
        style.normal.background = background;
    }
}
