using UnityEngine;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Ruthefjord;
using Microsoft.FSharp.Collections;
using Microsoft.FSharp.Core;
using System.Text;

public class ExternalAPI : MonoBehaviour
{
    public const string ExternalApiFunc = "onRuthefjordEvent";
    public const string OnSystemStart = "onSystemStart";
    public const string OnPuzzleChange = "onPuzzleChange";
    public const string OnProgramStateChange = "onProgramStateChange";
    public const string OnStatementHighlight = "onStatementHighlight";

    private bool isFirstUpdate = true;

    void Start() {
        var global = FindObjectOfType<Global>();
    }

    void Update() {
        if (isFirstUpdate) {
            try {
                SendColors();
                // if we're not in a puzzle, don't send any of the stuff on the first update
                var global = FindObjectOfType<Global>();
                if (global != null && global.CurrentPuzzle != null) {
                    var progman = GetComponent<ProgramManager>();
                    var puzzle = global.CurrentPuzzle;
                    puzzle = puzzle.LoadStartingProgram(
                        progman.LoadProgram,
                        () => Json.Serialize(Serialization.JsonOfProgram(progman.Manipulator.Program))
                    );
                    NotifyOfPuzzle(global.CurrentSceneId, puzzle, true);
                }
            } catch (Exception e) {
                Debug.LogException(e);
            }

            isFirstUpdate = false;
        }
    }

    // startup and ui state changes
    //////////////////////////////////////////////////////////////////////////

    public void NotifyOfSandbox() {
        Application.ExternalCall(ExternalApiFunc, "onSandboxStart", "");
    }

    public void NotifyOfPuzzle(string id, Scene.PuzzleInfo info, bool isStarting) {
        var dict = new Dictionary<string, Json.JsonValue>();
        dict.Add("id", Json.JsonValue.NewString(id));
        dict.Add("puzzle", info.ToJson());
        dict.Add("checksum", Json.JsonValue.NewString(info.Checksum()));
        dict.Add("is_starting", Json.JsonValue.NewBool(isStarting));

        Application.ExternalCall(ExternalApiFunc, OnPuzzleChange, Json.Serialize(Json.JsonValue.ObjectOf(dict)));
    }

    public void SendColors() {
        Application.ExternalCall(ExternalApiFunc, "onSetColors", Json.Serialize(Json.fromObject(CubeTextures.AvailableColors)));
        Debug.Log("SendColors");
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

    private void notifyProgramStateChange(string name, Json.JsonValue value) {
        var arg = Json.JsonValue.ObjectOf(new[] { new KeyValuePair<string, Json.JsonValue>(name, value) });
        Application.ExternalCall(ExternalApiFunc, OnProgramStateChange, arg.Serialize());
    }

    public void NotifyPS_RunState(RunState rs) {
        notifyProgramStateChange("run_state", rs.ToJson());
    }

    public void NotifyPS_EditMode(EditMode em) {
        notifyProgramStateChange("edit_mode", em.ToJson());
    }

    public void NotifyPS_TicksPerSecond(int tps) {
        notifyProgramStateChange("ticks_per_second", Json.JsonValue.NewInt(tps));
    }

    public void NotifyPS_CurrentState(StateData sd) {
        notifyProgramStateChange("current_state", sd.ToJson());
    }

    public void EAPI_SetProgramState(string arg) {
        var json = Json.Parse(arg).AsObject.ToMap;
        var progman = GetComponent<ProgramManager>();

        foreach (var kvp in json) {
            var name = kvp.Key;
            var value = kvp.Value;
            switch (name) {
                case "run_state":
                    progman.RunState = RunState.FromJson(value);
                    break;
                case "edit_mode":
                    progman.EditMode = EditMode.FromJson(value);
                    break;
                case "ticks_per_step":
                    progman.TicksPerStep = value.AsInt;
                    break;
                case "current_block":
                    throw new NotImplementedException();
                default: throw new ArgumentException("Invalid program state property name " + name);
            }
        }
    }

    // other controls
    //////////////////////////////////////////////////////////////////////////

    public void EAPI_ControlCamera(string action) {
        var camera = FindObjectOfType<MyCamera>();
        switch (action) {
        case "zoomin":
            camera.Zoom(0.5f);
            break;
        case "zoomout":
            camera.Zoom(2.0f);
            break;
        case "rotateleft":
            camera.Rotate(90);
            break;
        case "rotateright":
            camera.Rotate(-90);
            break;
        case "tiltup":
            camera.Tilt(10);
            break;
        case "tiltdown":
            camera.Tilt(-10);
            break;
        case "gamemode":
            GameObject.Find("Camera").tag = "MainCamera";
            GameObject.Find("Viewer").tag = "";
            break; 
        case "viewmode": 
            GameObject.Find("Camera").tag = "";
            GameObject.Find("Viewer").tag = "MainCamera";
            break;
        }
    }

    // world state
    //////////////////////////////////////////////////////////////////////////

    public void SendWorldState(string data) {
        const int chunkSize = 8192;
        var numChunks = (data.Length + chunkSize - 1) / chunkSize;
        Application.ExternalCall(ExternalApiFunc, "onWorldDataStart", "");
        for (var i = 0; i < numChunks; i++) {
            var offset = chunkSize * i;
            var s = data.Substring(offset, Math.Min(chunkSize, data.Length - offset));
            Application.ExternalCall(ExternalApiFunc, "onWorldDataChunkSend", s);
        }
        Application.ExternalCall(ExternalApiFunc, "onWorldDataEnd", "");
    }

    public void EAPI_RequestWorldState(string ignored) {
        var blocks = GetComponent<Grid>().AllCells;
        var robot = FindObjectOfType<RobotController>().Robot;
        var robots = new List<BasicRobot>();
        if (robot != null) {
            robots.Add(robot);
        }
        var world = new WorldData(blocks, robots.ToArray());

        Debug.Log("Saving! num blocks: " + blocks.Length.ToString());
        SendWorldState(World.encodeToString(world));
    }

    public void EAPI_SetProgramExecutionSpeed(string parameter) {
        var x = float.Parse(parameter);
        GetComponent<ProgramManager>().TicksPerStep = Math.Max(1, (int)(60 * Math.Pow(0.1f, 2.0f * x)));
    }

    public void EAPI_SetProgramExecutionTime(string parameter) {
        var x = float.Parse(parameter);
        GetComponent<ProgramManager>().SetProgramStateBySlider(x);
    }

    public void EAPI_StepProgramExecution(string data) {
        var json = Json.Parse(data);
        var type = Util.parseEnum<ProgramStepType>(json.GetField("type").AsString);
        var dist = json.GetField("distance").AsInt;
        GetComponent<ProgramManager>().StepProgramState(type, dist);
    }

    public System.Collections.IEnumerator EAPI_RenderFinal(string json) {
        var data = Json.Parse(json);

        // switch main camera to render to texture
        var rt = new RenderTexture (Screen.width, Screen.height, 24);
        rt.Create();
        Graphics.SetRenderTarget(rt);
        var cullingMask = Camera.main.cullingMask;
        var clearFlags = Camera.main.clearFlags;
        Camera.main.clearFlags = CameraClearFlags.Nothing;
        Camera.main.cullingMask = 0;

        // set up game state
        EAPI_SetProgramFromJson(data.GetField("prog").AsString);
        var progman = GetComponent<ProgramManager>();
        progman.EditMode = EditMode.Workshop;
        progman.SetProgramStateBySlider(1.0f);

        // render to texture
        yield return new WaitForEndOfFrame();
        int width = Screen.width;
        int height = Screen.height;
        Texture2D tex = new Texture2D(width, height, TextureFormat.RGB24, false);
        tex.ReadPixels(new Rect(0, 0, width, height), 0, 0);
        tex.Apply();
        byte[] bytes = tex.EncodeToPNG();

        // cleanup 
        Destroy(tex);
        Camera.main.cullingMask = cullingMask;
        Camera.main.clearFlags = clearFlags;

        // encode and ship data
        var dict = new Dictionary<string, Json.JsonValue>();
        dict.Add("id", Json.JsonValue.NewString(data.GetField("id").AsString));
        dict.Add("src", Json.JsonValue.NewString(Convert.ToBase64String(bytes)));
        Application.ExternalCall(ExternalApiFunc, "onRenderFinal", Json.Serialize(Json.JsonValue.ObjectOf(dict)));
        yield return null;
    }
}
