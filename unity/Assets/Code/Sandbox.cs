using UnityEngine;
using System.Collections;

public class Sandbox : MonoBehaviour {

	// Use this for initialization
	void Start () {
        // add a dummy program to the program manager to make it shut up
        GetComponent<ProgramManager>().Manipulator.CreateProcedure("MAIN");
	}
	
	// Update is called once per frame
	void Update () {
	
	}
}
