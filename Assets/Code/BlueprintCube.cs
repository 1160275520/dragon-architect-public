using UnityEngine;
using System.Collections;

public class BlueprintCube : MonoBehaviour {

	// Use this for initialization
	void Start () {
        var pos = transform.position;
        transform.FindChild("Shadow").transform.position = new Vector3(pos.x, 0.01f, pos.z);
	}
	
	// Update is called once per frame
	void Update () {
	
	}
}
