using UnityEngine;
using System;
using System.Collections.Generic;
using System.Linq;
using Hackcraft.Ast;

public class TitleGUI : MonoBehaviour
{
    private enum GUIStyleType {
        Standard = 0,
        Highlight = 1,
        CurrentHighlight = 2
    }

    public GUISkin CustomSkin;

    private bool hasRunBeenClicked = false;

    void Start() {
        // add a dummy program to the program manager to make it shut up
        GetComponent<ProgramManager>().Manipulator.CreateProcedure("MAIN");
    }

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

        // fps display
        makeFPS();
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

}
