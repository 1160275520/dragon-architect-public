using UnityEngine;
using System.Collections;

public class AllTheGUI : MonoBehaviour
{

    void OnGUI()
    {
        int offset = 10;
        if (GUI.Button(new Rect(10, offset, 75, 50), "Forward"))
        {
            FindObjectOfType<ProgramManager>().AppendCommand(AST.Command.MoveForward);
        }
        offset += 60;
        if (GUI.Button(new Rect(10, offset, 75, 50), "Left"))
        {
            FindObjectOfType<ProgramManager>().AppendCommand(AST.Command.TurnLeft);
        }
        offset += 60;
        if (GUI.Button(new Rect(10, offset, 75, 50), "Right"))
        {
            FindObjectOfType<ProgramManager>().AppendCommand(AST.Command.TurnRight);
        }
        offset += 60;
        if (GUI.Button(new Rect(10, offset, 75, 50), "Block"))
        {
            FindObjectOfType<ProgramManager>().AppendCommand(AST.Command.PlaceBlock);
        }
        offset += 60;
        if (GUI.Button(new Rect(10, offset, 75, 50), "Execute"))
        {
            FindObjectOfType<ProgramManager>().Execute();
        }
        offset += 60;
        if (GUI.Button(new Rect(10, offset, 75, 50), "Clear"))
        {
            FindObjectOfType<ProgramManager>().Clear();
        }

        offset = 10;
        foreach (var command in FindObjectOfType<ProgramManager>().Program.Body)
        {
            string text = "";
            switch (command)
            {
                case AST.Command.MoveForward:
                    text = "Forward";
                    break;
                case AST.Command.PlaceBlock:
                    text = "Block";
                    break;
                case AST.Command.TurnLeft:
                    text = "Left";
                    break;
                case AST.Command.TurnRight:
                    text = "Right";
                    break;
            }
            makeBox(Screen.width - 85, offset, 75, 50, text);
            offset += 60;
        }

    }

    void makeBox(float x, float y, float width, float height, string text)
    {
        var boxStyle = new GUIStyle();
        var boxBackground = new Texture2D(1, 1);
        boxBackground.SetPixel(0, 0, Color.black);
        boxBackground.Apply();
        boxStyle.normal.background = boxBackground;
        boxStyle.normal.textColor = Color.white;
        boxStyle.alignment = TextAnchor.MiddleCenter;
        GUI.Box(new Rect(x, y, width, height), text, boxStyle);
    }
}
