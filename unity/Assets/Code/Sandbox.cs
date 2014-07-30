using UnityEngine;
using System.Collections;

public class Sandbox : MonoBehaviour {

	// Use this for initialization
	void Start () {
        // add a dummy program to the program manager to make it shut up
        var progman = GetComponent<ProgramManager>();
        progman.Manipulator.CreateProcedure("MAIN");
        GetComponent<ExternalAPI>().NotifyOfSandbox();

        // if we don't do this, the program manager will just clear the grid immediately
        // TODO consider making a really unintuitive hack like this unecessary
        EAPI_SetWorkshopMode("false");

        var worldData = FindObjectOfType<Global>().SandboxWorldData;
        if (worldData != null) {
            var blocks = Hackcraft.ImmArr.ofArray(Hackcraft.Grid.decodeFromString(worldData));
            GetComponent<Grid>().SetGrid(blocks);
        }
	}
	
    public void EAPI_SetWorkshopMode(string aIsWorkshopMode) {
        bool isWorkshopMode = aIsWorkshopMode == "true";
        var plane = GameObject.Find("Plane");
        var progman = GetComponent<ProgramManager>();

        if (!isWorkshopMode) {
            var grass = Resources.Load<Material>("Grass");
            var grassGrid = (Material)Resources.Load("GrassGrid", typeof(Material));
            plane.renderer.materials = new Material[] {grass, grassGrid};
            progman.EditMode = Hackcraft.EditMode.Persistent;
        } else {
            var ground = Resources.Load<Material>("Ground");
            plane.renderer.materials = new Material[] {ground};
            progman.EditMode = Hackcraft.EditMode.Workshop;
        }
    }

	// Update is called once per frame
	void Update () {
	
	}
}
