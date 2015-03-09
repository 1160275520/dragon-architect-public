using UnityEngine;
using System.Collections;
using Ruthefjord;

public class BlueprintCube : MonoBehaviour {

    public Material OriginalMaterial;
    public Material SatisfiedMaterial;
    public IntVec3 GridPosition;

	void Start () {
        var pos = transform.position;
        transform.FindChild("Shadow").transform.position = new Vector3(pos.x, 0.01f, pos.z);
	}
	
	void Update () {
        var grid = FindObjectOfType<Grid>();
        if (grid[GridPosition] != null) {
            GetComponent<Renderer>().material = SatisfiedMaterial;
        } else {
            GetComponent<Renderer>().material = OriginalMaterial;
        }
	}
}
