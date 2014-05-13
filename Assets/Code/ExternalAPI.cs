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

    private void sendProgram() {
        var prog = Serialization.JsonOfProgram(GetComponent<ProgramManager>().Manipulator.Program);
        Application.ExternalCall(ExternalApiFunc, OnProgramChange, Json.Format(prog));
    }

    // external API

    public void EAPI_SetProgramFromJson(string json) {
        Debug.Log("setting program woo!");
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
}
