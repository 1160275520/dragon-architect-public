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

    private void handleLog(string logString, string stackTrace, LogType type) {
        string logfn;
        switch (type) {
            case LogType.Log:
                logfn = "info";
                break;
            case LogType.Warning:
                logfn = "warn";
                break;
            default:
                logfn = "error";
                break;
        }
        Application.ExternalEval(string.Format("console.{0}(\"UNITY {1}: {2}\")", logfn, type.ToString(), logString.Replace("\"", "\\\"")));
	}

    // External API function
    // apparently needs to be here, putting it in LoaderGUI didn't work >_>
    public void EAPI_SetStage(string id) {
        Debug.Log("setting stage to " + id);
        Application.LoadLevel(id);
    }
}
