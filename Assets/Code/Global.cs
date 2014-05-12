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
        Application.ExternalEval(string.Format("console.log(\"UNITY {0}: {1}\")", type.ToString(), logString.Replace("\"", "\\\"")));
	}

    // External API function
    // apparently needs to be here, putting it in LoaderGUI didn't work >_>
    public void SetStage(string id) {
        Debug.Log("setting stage to " + id);
        Application.LoadLevel(id);
    }
}
