using UnityEngine;
using Hackcraft;
using System.Linq;
using System.Collections.Generic;

public class Global : MonoBehaviour {

    public enum PuzzleFinishType
    {
        to_puzzle_select,
        to_next_puzzle,
    }

    public string CurrentSceneId { get; private set; }
    public Scene.PuzzleInfo CurrentPuzzle { get; set; }
    public PuzzleFinishType PuzzleFinish { get; private set; }

    void Awake() {
        DontDestroyOnLoad(this);
    }

    void OnEnable() {
        Application.RegisterLogCallbackThreaded(handleLog);

        var modules = Json.Parse(Resources.Load<TextAsset>("md_module1").text);
        var scenes = Json.Parse(Resources.Load<TextAsset>("sd_module1").text);
        var dict = new Dictionary<string, Json.JsonValue>();
        dict.Add("modules", modules);
        dict.Add("scenes", scenes);
        var json = Json.JsonValue.ObjectOf(dict);

        Application.ExternalCall(ExternalAPI.ExternalApiFunc, ExternalAPI.OnSystemStart, Json.Serialize(json));
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
        PuzzleFinish = (PuzzleFinishType)System.Enum.Parse(typeof(PuzzleFinishType), data.GetField("finish").AsString);

        Debug.Log("starting puzzle '" + CurrentSceneId + "'!");
        Application.LoadLevel("puzzle");
    }
}
