using UnityEngine;
using System;
using System.Collections.Generic;

public class Grid : MonoBehaviour {

    public const int GRID_SIZE = 100;

    public GameObject TestPrefab;

    // the actual grid data
    private GameObject[,,] grid;
    // offset of origin in the grid (add to all indices)
    private IntVec3 offset;
    private List<IntVec3> additions = new List<IntVec3>();

    public Vector3 CenterOfCell(IntVec3 idx) {
        var marker = Component.FindObjectOfType<GridMarker>();
        var origin = marker.transform.position;
        var scale = marker.CellSize * Vector3.one;
        return origin + Vector3.Scale(scale, new Vector3(idx.X + 0.5f, idx.Y + 0.5f, idx.Z + 0.5f));
    }

    public GameObject this[IntVec3 idx] {
        get { return grid[idx.X + offset.X, idx.Y + offset.Y, idx.Z + offset.Z]; }
        set { grid[idx.X + offset.X, idx.Y + offset.Y, idx.Z + offset.Z] = value; }
    }

    public void AddObject(IntVec3 idx, GameObject prefab) {
        if (this[idx] != null) throw new ArgumentException("cell is not empty");
        var obj = (GameObject)Instantiate(prefab, CenterOfCell(idx), Quaternion.identity);
        this[idx] = obj;
        additions.Add(idx);
    }

    public void RemoveObject(IntVec3 idx) {
        var obj = this[idx];
        this[idx] = null;
        if (obj != null) {
            Destroy(obj);
        }
    }

    public void Undo() {
        foreach (var idx in additions) {
            RemoveObject(idx);
        }
        additions.Clear();
    }

	// Use this for initialization
	void Start() {
        grid = new GameObject[GRID_SIZE, GRID_SIZE, GRID_SIZE];
        offset = new IntVec3(GRID_SIZE / 2, GRID_SIZE / 2, GRID_SIZE / 2);

        //AddObject(new IntVec3(5, 0, 5), TestPrefab);
        //AddObject(new IntVec3(4, 0, 5), TestPrefab);
        //AddObject(new IntVec3(3, 0, 5), TestPrefab);
        //AddObject(new IntVec3(5, 0, 6), TestPrefab);
	}
	
	// Update is called once per frame
	void Update() {
	}
}
