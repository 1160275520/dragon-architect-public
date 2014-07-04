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
    public const string OnStatementHighlight = "onStatementHighlight";
    public const string OnInstructionsChange = "onInstructionsChange";

    private bool isFirstUpdate;

    void Start() {
        isFirstUpdate = true;
    }

    void Update() {
        if (isFirstUpdate) {
            try {
                SendColors();
                SendProgram();
                SendLevel();
                SendInstructions();
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
        var level = GetComponent<ProgramManager>().MakeLevelInfo().ToJson();
        Application.ExternalCall(ExternalApiFunc, OnLevelChange, Json.Format(level));
    }

    public void SendCurrentStatement() {
        try {
            Application.ExternalCall(ExternalApiFunc, OnStatementHighlight, GetComponent<ProgramManager>().LastExecuted.First());
        } catch (InvalidOperationException) {
            Application.ExternalCall(ExternalApiFunc, OnStatementHighlight, ""); // clear final highlight when done executing
        }
    }

    public void SendInstructions() {
        Application.ExternalCall(ExternalApiFunc, OnInstructionsChange, GetComponent<AllTheGUI>().CurrentMessage);
    }

    public void SendColors() {
        Application.ExternalCall(ExternalApiFunc, "onSetColors", Json.Format(Json.fromObject(CubeTextures.AvailableColors)));
    }

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

    public void EAPI_SetProgramExecutionSpeed(string parameter) {
        var x = float.Parse(parameter);
        GetComponent<ProgramManager>().DelayPerCommand = (float)Math.Pow(0.1f, 2.0f * x);
    }
}
