using UnityEngine;
using System.Collections;
using System;
using System.Linq;
using Hackcraft;
using Microsoft.FSharp.Collections;

public class ExternalAPI : MonoBehaviour
{
    public const string ExternalApiFunc = "onHackcraftEvent";
    public const string OnSystemStart = "onSystemStart";
    public const string OnProgramChange = "onProgramChange";
    public const string OnLevelChange = "onLevelChange";

    private bool isFirstUpdate;

    void Start() {
        isFirstUpdate = true;
    }

    void Update() {
        if (isFirstUpdate) {
            try {
                SendProgram();
                SendLevel();
            } catch (NullReferenceException) {
                Debug.Log("null reference on first update, expected on level loader");
            }
            isFirstUpdate = false;
        }

        // check if current statement changed, if so send update


        // check if program changed, if so send update
        // TODO jk, ignore this for now because it never changes during puzzles!
    }

    public void ClearLevel() {
        Application.ExternalCall(ExternalApiFunc, OnProgramChange, "{}");
        Application.ExternalCall(ExternalApiFunc, OnLevelChange, "{}");
    }

    public void SendProgram() {
        var prog = Serialization.JsonOfProgram(GetComponent<ProgramManager>().Manipulator.Program);
        Application.ExternalCall(ExternalApiFunc, OnProgramChange, Json.Format(prog));
    }

    public void SendLevel() {
        var level = Serialization.JsonOfLevel(GetComponent<ProgramManager>().MakeLevelInfo());
        Application.ExternalCall(ExternalApiFunc, OnLevelChange, Json.Format(level));
    }

    public void SendCurrentStatement() {
        try {
            Application.ExternalCall(ExternalApiFunc, "onStatementHighlight", GetComponent<ProgramManager>().LastExecuted.First());
        } catch (InvalidOperationException) {
            Application.ExternalCall(ExternalApiFunc, "onStatementHighlight", ""); // clear final highlight when done executing

        }}

    // external API

    public void EAPI_SetProgramFromJson(string json) {
        var prog = Serialization.ProgramOfJson(Json.Parse(json));
        GetComponent<ProgramManager>().Manipulator.Program = prog;
    }

    public void EAPI_SetIsRunning(string aIsRunning) {
        bool isRunning = aIsRunning == "true";
        var progman = GetComponent<ProgramManager>();
        if (isRunning) {
            progman.StartExecution();
        } else {
            progman.StopRunning();
        }
    }
}
