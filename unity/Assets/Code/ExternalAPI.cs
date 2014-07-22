using UnityEngine;
using System;
using System.Collections.Generic;
using System.Linq;
using Hackcraft;
using Microsoft.FSharp.Collections;
using Microsoft.FSharp.Core;

public class ExternalAPI : MonoBehaviour
{
    public const string ExternalApiFunc = "onHackcraftEvent";
    public const string OnSystemStart = "onSystemStart";
    public const string OnPuzzleChange = "onPuzzleChange";
    public const string OnStatementHighlight = "onStatementHighlight";

    private bool isFirstUpdate;

    void Start() {
        var global = FindObjectOfType<Global>();
        var puzzle = global.CurrentPuzzle;
        #warning "shouldn't need this hack, just stop this from getting added at the loader"
        if (puzzle != null) {
            isFirstUpdate = true;
        }
    }

    void Update() {
        if (isFirstUpdate) {
            try {
                SendColors();
                var global = FindObjectOfType<Global>();
                var puzzle = global.CurrentPuzzle;
                // only update program from ProgramManager if the json file didn't specify anything
                if (OptionModule.IsNone(puzzle.StartingProgram)) {
                    var prog = Serialization.JsonOfProgram(GetComponent<ProgramManager>().Manipulator.Program);
                    puzzle = puzzle.UpdateStartingProgram(Json.Serialize(prog));
                }
                NotifyOfPuzzle(global.CurrentSceneId, puzzle, true);
            } catch (Exception e) {
                Debug.LogException(e);
            }

            isFirstUpdate = false;
        }
    }

    public void NotifyOfPuzzle(string id, Scene.PuzzleInfo info, bool isStarting) {
        var dict = new Dictionary<string, Json.JsonValue>();
        dict.Add("id", Json.JsonValue.NewString(id));
        dict.Add("puzzle", info.ToJson());
        dict.Add("checksum", Json.JsonValue.NewString(info.Checksum()));
        dict.Add("is_starting", Json.JsonValue.NewBool(isStarting));

        Application.ExternalCall(ExternalApiFunc, OnPuzzleChange, Json.Serialize(Json.JsonValue.ObjectOf(dict)));
    }

    public void SendCurrentStatement() {
        try {
            Application.ExternalCall(ExternalApiFunc, OnStatementHighlight, GetComponent<ProgramManager>().LastExecuted.First());
        } catch (InvalidOperationException) {
            Application.ExternalCall(ExternalApiFunc, OnStatementHighlight, ""); // clear final highlight when done executing
        }
    }

    public void SendColors() {
        Application.ExternalCall(ExternalApiFunc, "onSetColors", Json.Serialize(Json.fromObject(CubeTextures.AvailableColors)));
    }

    public void SendPuzzleComplete() {
        Application.ExternalCall(ExternalApiFunc, "onPuzzleComplete", FindObjectOfType<Global>().CurrentSceneId);
    }

    public void SendPuzzleFinish() {
        Application.ExternalCall(ExternalApiFunc, "onPuzzleFinish", "");
    }

    public void SendTitleButtonClicked(string button) {
        Application.ExternalCall(ExternalApiFunc, "onTitleButtonClicked", button);
    }

    // external API

    public void EAPI_SetProgramFromJson(string json) {
        try {
            var prog = Serialization.ProgramOfJson(Json.Parse(json));
            GetComponent<ProgramManager>().Manipulator.Program = prog;
        } catch (Exception) {
            Debug.LogError("failed to parse program sent from webpage:");
            Debug.LogError(json);
            throw;
        }
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

    public void EAPI_ControlCamera(string action) {
        var camera = FindObjectOfType<MyCamera>();
        switch (action) {
            case "zoomin": camera.Zoom(0.5f); break;
            case "zoomout": camera.Zoom(2.0f); break;
            case "rotateleft": camera.Rotate(90); break;
            case "rotateright": camera.Rotate(-90); break;
        }
    }
}
