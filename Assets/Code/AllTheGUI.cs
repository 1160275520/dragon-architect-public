using UnityEngine;
using System.Collections.Generic;

public class AllTheGUI : MonoBehaviour
{
    public static readonly int COLUMN_WIDTH = 75;
    public static readonly int BUTTON_HEIGHT = 50;
    public static readonly int SPACING = 10;

    public Font codeFont;
    int curProc = 0;

    void Start() {
        FindObjectOfType<ProgramManager>().Program.Procedures = new List<AST.Procedure>();
        FindObjectOfType<ProgramManager>().Program.Procedures.Add(new AST.Procedure { Name = "Main" });
        FindObjectOfType<ProgramManager>().Program.Procedures.Add(new AST.Procedure { Name = "F1" });
        FindObjectOfType<ProgramManager>().Program.Procedures.Add(new AST.Procedure { Name = "F2" });
    }

    void OnGUI() {
        GUILayout.BeginArea(new Rect(SPACING, SPACING, COLUMN_WIDTH, Screen.height - SPACING));
        GUILayout.BeginVertical();
        var options = new GUILayoutOption[] { GUILayout.Width(COLUMN_WIDTH), GUILayout.Height(BUTTON_HEIGHT) };
        if (GUILayout.Button("Forward", options)) {
            FindObjectOfType<ProgramManager>().Program.Procedures[curProc].Body.Add(new AST.Statement { Type = AST.StatementType.Call, Arg1 = Robot.CommandNames[Robot.Command.MoveForward] });
        }
        if (GUILayout.Button("Left", options)) {
            FindObjectOfType<ProgramManager>().Program.Procedures[curProc].Body.Add(new AST.Statement { Type = AST.StatementType.Call, Arg1 = Robot.CommandNames[Robot.Command.TurnLeft] });
        }
        if (GUILayout.Button("Right", options)) {
            FindObjectOfType<ProgramManager>().Program.Procedures[curProc].Body.Add(new AST.Statement { Type = AST.StatementType.Call, Arg1 = Robot.CommandNames[Robot.Command.TurnRight] });
        }
        if (GUILayout.Button("Block", options)) {
            FindObjectOfType<ProgramManager>().Program.Procedures[curProc].Body.Add(new AST.Statement { Type = AST.StatementType.Call, Arg1 = Robot.CommandNames[Robot.Command.PlaceBlock] });
        }
        if (GUILayout.Button("Repeat", options)) {
            FindObjectOfType<ProgramManager>().Program.Procedures[curProc].Body.Add(new AST.Statement { Type = AST.StatementType.Repeat, Arg1 = "F1", Arg2 = "5"});
        }
        switch (curProc) {
            case 0:
                if (GUILayout.Button("F1", options)) {
                    FindObjectOfType<ProgramManager>().Program.Procedures[curProc].Body.Add(new AST.Statement { Type = AST.StatementType.Call, Arg1 = "F1" });
                }
                if (GUILayout.Button("F2", options)) {
                    FindObjectOfType<ProgramManager>().Program.Procedures[curProc].Body.Add(new AST.Statement { Type = AST.StatementType.Call, Arg1 = "F2" });
                }
                break;
        }
        if (GUILayout.Button("Execute", options)) {
            FindObjectOfType<ProgramManager>().Execute();
        }
        if (GUILayout.Button("Clear", options)) {
            FindObjectOfType<ProgramManager>().Program.Procedures[curProc].Body = new List<AST.Statement>();
        }
        GUILayout.EndVertical();
        GUILayout.EndArea();

       
        GUILayout.BeginArea(new Rect(Screen.width - 3 * (COLUMN_WIDTH + SPACING), SPACING, 3 * (COLUMN_WIDTH + SPACING), Screen.height));
        GUILayout.BeginVertical();
        curProc = GUILayout.SelectionGrid(curProc, new string[] { "Main", "F1", "F2" }, 3);
        GUILayout.BeginHorizontal();
        GUILayout.Space(SPACING / 2);
        makeProc(0);
        GUILayout.Space(SPACING);
        makeProc(1);
        GUILayout.Space(SPACING);
        makeProc(2);
        GUILayout.EndHorizontal();
        GUILayout.EndVertical();
        GUILayout.EndArea();
    }

    void makeProc(int procIndex) {
        var codeStyle = new GUIStyle();
        var codeBackground = new Texture2D(1, 1);
        codeBackground.SetPixel(0, 0, new Color(1.0f, 1.0f, 1.0f, 0.5f));
        codeBackground.Apply();
        codeBackground.alphaIsTransparency = true;
        codeStyle.normal.background = codeBackground;
        codeStyle.font = codeFont;
        codeStyle.alignment = TextAnchor.UpperCenter;
        GUILayout.BeginVertical(codeStyle, GUILayout.Width(COLUMN_WIDTH));
        GUILayout.Space(FindObjectOfType<ProgramManager>().Program.Procedures[procIndex].Body.Count > 0 ? SPACING : SPACING * 5);
        foreach (var command in FindObjectOfType<ProgramManager>().Program.Procedures[procIndex].Body) {
            switch (command.Type) {
                case AST.StatementType.Call:
                    makeCall(command);
                    GUILayout.Space(SPACING);
                    break;
                case AST.StatementType.Repeat:
                    makeRepeat(command);
                    GUILayout.Space(SPACING);
                    break;
            }
        }
        GUILayout.EndVertical();
    }

    void makeCall(AST.Statement statement) {
        var boxStyle = new GUIStyle();
        var boxBackground = new Texture2D(1, 1);
        boxBackground.SetPixel(0, 0, Color.black);
        boxBackground.Apply();
        boxStyle.normal.background = boxBackground;
        boxStyle.normal.textColor = Color.white;
        boxStyle.alignment = TextAnchor.MiddleCenter;
        boxStyle.padding = new RectOffset(0, 0, 5, 5);
        boxStyle.margin = new RectOffset(5, 5, 0, 0);
        GUILayout.Box((string)statement.Arg1, boxStyle);
    }

    void makeRepeat(AST.Statement statement) {
        var boxStyle = new GUIStyle();
        var boxBackground = new Texture2D(1, 1);
        boxBackground.SetPixel(0, 0, Color.black);
        boxBackground.Apply();
        boxStyle.normal.background = boxBackground;
        boxStyle.normal.textColor = Color.white;
        boxStyle.alignment = TextAnchor.MiddleCenter;
        boxStyle.padding = new RectOffset(0, 0, 5, 5);
        boxStyle.margin = new RectOffset(5, 5, 0, 0);
        GUILayout.BeginVertical(boxStyle);
        GUILayout.BeginHorizontal();
        GUILayout.Box("Repeat");
        statement.Arg1 = GUILayout.TextField((string)statement.Arg1, boxStyle);
        GUILayout.EndHorizontal();
        GUILayout.BeginHorizontal();
        statement.Arg2 = GUILayout.TextField((string)statement.Arg2, boxStyle);
        GUILayout.Box("times");
        GUILayout.EndHorizontal();
        GUILayout.EndVertical();
    }
}
