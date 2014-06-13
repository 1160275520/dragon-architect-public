using UnityEngine;
using Hackcraft;
using System.Linq;

public class Global : MonoBehaviour {

    void Awake() {
        DontDestroyOnLoad(this);
    }

    void OnEnable() {
        Application.RegisterLogCallbackThreaded(handleLog);

        var levels = Json.JsonValue.NewArray(LoaderGUI.LEVELS.Select(x => Json.JsonValue.NewString(x)).ToArray());
        Application.ExternalCall(ExternalAPI.ExternalApiFunc, ExternalAPI.OnSystemStart, Json.Format(levels));
    }

    void OnDisable() {
        Application.RegisterLogCallback(null);
    }

    private void log(string logFn, string logTypeName, string message) {
        var s = Json.Format(Json.JsonValue.NewString("UNITY " + logTypeName + ": " + message));
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
    public void EAPI_SetStage(string id) {
        Debug.Log("setting stage to " + id);
        Application.LoadLevel(id);
    }
}
