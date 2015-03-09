using UnityEngine;
using System.Collections.Generic;

public class Cube : MonoBehaviour {

    private int lastCubeId = 0;

    public int CubeId = 0;
	
	// Update is called once per frame
	void LateUpdate () {
        if (lastCubeId != CubeId && CubeId > 0) {
            lastCubeId = CubeId;
            var ct = GameObject.FindGameObjectWithTag("System").GetComponent<CubeTextures>();
            GetComponent<Renderer>().material = ct.AvailableMaterials[CubeId - 1];
        }
	}
}
