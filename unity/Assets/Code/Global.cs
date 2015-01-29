using UnityEngine;
using Ruthefjord;
using System.Linq;
using System.Collections.Generic;

public class Global : MonoBehaviour {

    public enum PuzzleFinishType
    {
        to_puzzle_select,
        to_next_puzzle,
        to_sandbox,
    }

    public string CurrentSceneId { get; private set; }
    public Scene.PuzzleInfo CurrentPuzzle { get; set; }
    public string SandboxWorldData { get; private set; }

    void Awake() {
        DontDestroyOnLoad(this);
    }

    void OnEnable() {
        Ruthefjord.Logger.logAction = Debug.Log;

        Application.RegisterLogCallbackThreaded(handleLog);

        Application.ExternalCall(ExternalAPI.ExternalApiFunc, ExternalAPI.OnSystemStart, "");
    }

    void OnDisable() {
        Application.RegisterLogCallback(null);
    }

    private void log(string logFn, string logTypeName, string message) {
        var s = Json.Serialize(Json.JsonValue.NewString("UNITY " + logTypeName + ": " + message));
        Application.ExternalEval(string.Format("console.{0}({1})", logFn, s));
    }

    private void handleLog(string logString, string stackTrace, LogType type) {
        switch (type) {
            case LogType.Log:
                log("info", type.ToString(), logString);
                break;
            case LogType.Warning:
                log("warn", type.ToString(), logString);
                break;
            case LogType.Exception:
                log("error", type.ToString(), logString);
                log("error", type.ToString(), stackTrace);
                return;
            default:
                log("error", type.ToString(), logString);
                break;
        }
	}

    // External API function
    // apparently needs to be here, putting it in LoaderGUI didn't work >_>
    public void EAPI_RequestStartPuzzle(string json) {
        var data = Json.Parse(json);
        CurrentSceneId = data.GetField("id").AsString;
        CurrentPuzzle = Scene.PuzzleInfo.Parse(data.GetField("puzzle"));

        Debug.Log("starting puzzle '" + CurrentSceneId + "'!");
        Application.LoadLevel("puzzle");
    }

    public void EAPI_RequestStartSandbox(string worldData) {
        CurrentSceneId = null;
        CurrentPuzzle = null;
        SandboxWorldData = worldData != null && worldData.Length > 0 ? worldData : null;
        Application.LoadLevel("sandbox");
    }
}
