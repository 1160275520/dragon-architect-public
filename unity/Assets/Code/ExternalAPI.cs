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
                    puzzle = puzzle.LoadPrograms((r) => Resources.Load<TextAsset>(r).text);
                    if (OptionModule.IsSome(puzzle.StartingProgram)) {
                        progman.Manipulator.Program = puzzle.StartingProgram.Value.AsAst;
                    }
                    foreach (Scene.Program p in puzzle.Library.AutoImportedModules) {
                        progman.AddImportedModule(p.AsAst);
                    }
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

    public void EAPI_ExecuteProgramTo(string time) {
        GetComponent<ProgramManager>().ExecuteProgramTo(float.Parse(time));
    }

    public void EAPI_ParseProgramFromConcrete(string code) {
        Application.ExternalCall(ExternalApiFunc, "onProgramParse", Json.Serialize(Serialization.JsonOfProgram(Ruthefjord.Parser.Parse(code, "submitted text"))));
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

    public void NotifyStepHighlight(int id) {
        Application.ExternalCall(ExternalApiFunc, "onStepHighlight", id);
    }

    public void NotifyDebugHighlight(int id) {
        Application.ExternalCall(ExternalApiFunc, "onDebugHighlight", id);
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

    public void SendErrorMessages(List<string> errors) {
        Application.ExternalCall(ExternalApiFunc, "onErrorMessages", Json.Serialize(Json.fromObject(errors)));
    }

    // other controls
    //////////////////////////////////////////////////////////////////////////

    public void EAPI_ControlCamera(string action) {
        var camera = FindObjectOfType<MyCamera>();
        switch (action) {
        case "zoomin":
            camera.Zoom(0.8f);
            break;
        case "zoomout":
            camera.Zoom(1.2f);
            break;
        case "rotateleft":
            camera.Rotate(45);
            break;
        case "rotateright":
            camera.Rotate(-45);
            break;
        case "tiltup":
            camera.Tilt(10);
            break;
        case "tiltdown":
            camera.Tilt(-10);
            break;
        case "gamemode":
            Camera.allCameras.Where((c) => c.name == "Viewer").Single().depth = -1;
            break;
        case "viewmode":
            Camera.allCameras.Where((c) => c.name == "Viewer").Single().depth = 1;
            break;
        }
    }

    public void EAPI_SubmitSolution(string ignored) {
        var helper = FindObjectOfType<PuzzleHelper>();
        helper.BlockingErrors.Clear(); // clear any existing error messages
        if (helper.WinPredicate()) { // check for win
            helper.WinLevel();
        } else { // send back new error messages
            SendErrorMessages(helper.BlockingErrors);
        }
    }
    // world state
    //////////////////////////////////////////////////////////////////////////

	public void SendWorldState(string data, string mode) {
		const int chunkSize = 8192;
		var numChunks = (data.Length + chunkSize - 1) / chunkSize;
		Application.ExternalCall(ExternalApiFunc, "onWorldDataStart", "");
		for (var i = 0; i < numChunks; i++) {
			var offset = chunkSize * i;
			var s = data.Substring(offset, Math.Min(chunkSize, data.Length - offset));
			Application.ExternalCall(ExternalApiFunc, "onWorldDataChunkSend", s);
		}
		Application.ExternalCall(ExternalApiFunc, "onWorldDataEnd", mode);
	}
	
	private string EncodeCurrentWorld() {
		var blocks = GetComponent<Grid>().AllCells;
		var robot = FindObjectOfType<RobotController>().Robot;
		var robots = new List<BasicRobot>();
		if (robot != null) {
			robots.Add(robot);
		}
		var world = new WorldData(blocks, robots.ToArray());
		return World.encodeToString(world);
	}
	
	public void SendCurrentWorldState(float dt) {
		SendWorldState(EncodeCurrentWorld(), "{\"mode\":\"render\", \"dt\":" + dt + "}");
	}
	
	public void EAPI_RequestWorldState(string ignored) {
		SendWorldState(EncodeCurrentWorld(), "{\"mode\":\"save\"}");
	}

    public void EAPI_SetProgramExecutionSpeed(string parameter) {
        var x = float.Parse(parameter);
        GetComponent<ProgramManager>().TicksPerStep = Math.Max(1, (int)(60 * Math.Pow(0.1f, 2.0f * x)));
    }

    public void EAPI_SetProgramExecutionTime(string parameter) {
        var x = float.Parse(parameter);
        GetComponent<ProgramManager>().SliderPosition = x;
    }

    public void EAPI_StepProgramExecution(string data) {
        var json = Json.Parse(data);
        var type = Util.parseEnum<ProgramStepType>(json.GetField("type").AsString);
        var dist = json.GetField("distance").AsInt;
        GetComponent<ProgramManager>().StepProgramState(type, dist);
    }

    public void EAPI_NextInterestingStep() {
        //GetComponent<ProgramManager>().AdvanceToNextInterestingStep();
        Debug.LogError("unimplemented!");
    }

    public System.Collections.IEnumerator EAPI_RenderCurrent(string id) {
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

        // encode and ship data
        var dict = new Dictionary<string, Json.JsonValue>();
        dict.Add("id", Json.JsonValue.NewString(id));
        dict.Add("src", Json.JsonValue.NewString(Convert.ToBase64String(bytes)));
        Application.ExternalCall(ExternalApiFunc, "onRender", Json.Serialize(Json.JsonValue.ObjectOf(dict)));
        yield return null;
    }
    
    public void EAPI_RenderFinal(string json) {
        var data = Json.Parse(json);

        // set up game state
        var camera = FindObjectOfType<MyCamera>();
        camera.ForceFullTranslation = true;
        EAPI_SetProgramFromJson(data.GetField("program").AsString);
        var progman = GetComponent<ProgramManager>();
        progman.EditMode = EditMode.Workshop;
        progman.SliderPosition = 1.0f;

        EAPI_RenderCurrent(data.GetField("id").AsString);
        camera.ForceFullTranslation = false;
    }
}
