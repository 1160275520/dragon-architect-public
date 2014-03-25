using UnityEngine;
using System;
using System.Collections.Generic;

public class Grid : MonoBehaviour {

    public const int GRID_SIZE = 100;

    public GameObject TestPrefab;

    // the actual grid data
    private GameObject[,] grid;
    // offset of origin in the grid (add to all indices)
    private IntVec2 offset;

    public Vector3 CenterOfCell(IntVec2 idx) {
        var marker = Component.FindObjectOfType<GridMarker>();
        var origin = marker.transform.position;
        var scale = marker.CellSize * Vector3.one;
        return origin + Vector3.Scale(scale, new Vector3(idx.X + 0.5f, 0.5f, idx.Y + 0.5f));
    }

    public GameObject this[IntVec2 idx] {
        get { return grid[idx.X + offset.X, idx.Y + offset.Y]; }
        set { grid[idx.X + offset.X, idx.Y + offset.Y] = value; }
    }

    public void AddObject(IntVec2 idx, GameObject prefab) {
        if (this[idx] != null) throw new ArgumentException("cell is not empty");
        var obj = (GameObject)Instantiate(prefab, CenterOfCell(idx), Quaternion.identity);
        this[idx] = obj;
    }

    public void RemoveObject(IntVec2 idx) {
        var obj = this[idx];
        this[idx] = null;
        if (obj != null) {
            Destroy(obj);
        }
    }

	// Use this for initialization
	void Start() {
        grid = new GameObject[GRID_SIZE, GRID_SIZE];
        offset = new IntVec2(GRID_SIZE / 2, GRID_SIZE / 2);

        AddObject(new IntVec2(5, 5), TestPrefab);
        AddObject(new IntVec2(4, 5), TestPrefab);
        AddObject(new IntVec2(3, 5), TestPrefab);
        AddObject(new IntVec2(5, 6), TestPrefab);
	}
	
	// Update is called once per frame
	void Update() {
	}
}
