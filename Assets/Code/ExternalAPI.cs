using UnityEngine;
using System.Collections;
using Hackcraft;
using Microsoft.FSharp.Collections;

public class ExternalAPI : MonoBehaviour
{
    public const string ExternalApiFunc = "onHackcraftEvent";
    public const string OnSystemStart = "onSystemStart";
    public const string OnProgramChange = "onProgramChange";

    private bool isFirstUpdate;

    void Start() {
        isFirstUpdate = true;
    }

    void Update() {
        if (isFirstUpdate) {
            sendProgram();
            isFirstUpdate = false;
        }

        // check if current statement changed, if so send update


        // check if program changed, if so send update
        // TODO jk, ignore this for now because it never changes during puzzles!
    }

    /*
    private string newMessage(string name, Json.JsonValue value) {
        var json = MapModule.Empty<string, Json.JsonValue>().Add("name", Json.JsonValue.NewString(name)).Add("value", value);
        return Json.Format(Json.JsonValue.NewObject(json));
    }
    */

    private void sendProgram() {
        var prog = Serialization.JsonOfProgram(GetComponent<ProgramManager>().Manipulator.Program);
        Application.ExternalCall(ExternalApiFunc, OnProgramChange, Json.Format(prog));
    }

    public void SetProgram(string json) {
        var prog = Serialization.ProgramOfJson(Json.Parse(json));
        GetComponent<ProgramManager>().Manipulator.Program = prog;
    }

    public void SetState() {
        // load a stage
    }

    public void ExternalTest(string arg) {
        Debug.Log("Hello, " + arg + "!");
        Application.ExternalCall("somefunc", "somearg");
    }
	
}
