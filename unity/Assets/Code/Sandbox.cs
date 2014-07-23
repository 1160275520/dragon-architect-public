using UnityEngine;
using System.Collections;

public class Sandbox : MonoBehaviour {

	// Use this for initialization
	void Start () {
        // add a dummy program to the program manager to make it shut up
        GetComponent<ProgramManager>().Manipulator.CreateProcedure("MAIN");
        GetComponent<ExternalAPI>().NotifyOfSandbox();
	}
	
    public void EAPI_SetExperimentMode(string aIsExprMode) {
        bool isExprMode = aIsExprMode == "true";
        var plane = GameObject.Find("Plane");
        if (isExprMode) {
            var grass = (Material)Resources.Load("Grass", typeof(Material));
            var grassGrid = (Material)Resources.Load("GrassGrid", typeof(Material));
            plane.renderer.materials = new Material[] {grass, grassGrid};
        } else {
            var ground = (Material)Resources.Load("Ground", typeof(Material));
            plane.renderer.materials = new Material[] {ground};
        }
    }

	// Update is called once per frame
	void Update () {
	
	}
}
