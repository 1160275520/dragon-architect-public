using UnityEngine;
using System.Collections;

public class AllTheGUI : MonoBehaviour {

    void OnGUI()
    {
        if (GUI.Button(new Rect(10, 10, 100, 150), "Forward"))
        {
            FindObjectOfType<Robot>().Execute(AST.Command.MoveForward);
        }
    }
}
