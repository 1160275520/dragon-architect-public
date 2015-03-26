using UnityEngine;
using System;
using System.Collections.Generic;
using System.Linq;
using Ruthefjord.Ast;

public class TitleGUI : MonoBehaviour
{
    private enum GUIStyleType {
        Standard = 0,
        Highlight = 1,
        CurrentHighlight = 2
    }

    public GUISkin CustomSkin;

    private bool hasRunBeenClicked = false;

    void OnGUI()
    {
        GUI.skin = CustomSkin;

        var hw = Screen.width / 2;
        var hh = Screen.height / 2;

        var hbw = 90;
        var hbh = 50;

        if (!hasRunBeenClicked && GUI.Button(new Rect(hw - hbw, 100 + hh - hbw, 2 * hbw, 2 * hbh), "Go!", "RunButton")) {
            hasRunBeenClicked = true;
            GetComponent<ExternalAPI>().SendTitleButtonClicked("tutorial");
        }
    }
}
