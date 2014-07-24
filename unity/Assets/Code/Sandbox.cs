using UnityEngine;
using System.Collections;

public class Sandbox : MonoBehaviour {

	// Use this for initialization
	void Start () {
        // add a dummy program to the program manager to make it shut up
        var progman = GetComponent<ProgramManager>();
        progman.Manipulator.CreateProcedure("MAIN");
        GetComponent<ExternalAPI>().NotifyOfSandbox();

        // default to persistent mode, not workshop
        EAPI_SetExperimentMode("false");
	}
	
    public void EAPI_SetExperimentMode(string aIsExprMode) {
        bool isExprMode = aIsExprMode == "true";
        var plane = GameObject.Find("Plane");
        var progman = GetComponent<ProgramManager>();

        if (!isExprMode) {
            var grass = (Material)Resources.Load("Grass", typeof(Material));
            var grassGrid = (Material)Resources.Load("GrassGrid", typeof(Material));
            plane.renderer.materials = new Material[] {grass, grassGrid};
            progman.EditMode = Hackcraft.EditMode.Persistent;
        } else {
            var ground = (Material)Resources.Load("Ground", typeof(Material));
            plane.renderer.materials = new Material[] {ground};
            progman.EditMode = Hackcraft.EditMode.Workshop;
        }
    }

	// Update is called once per frame
	void Update () {
	
	}
}
