using UnityEngine;
using System;
using System.Collections.Generic;
using System.Linq;
using Rutherfjord;

public class Grid : MonoBehaviour {

    public const int GRID_SIZE = 100;

    public GameObject TestPrefab;

    // the actual grid data
    private Dictionary<IntVec3,GameObject> grid;
    // offset of origin in the grid (add to all indices)
    private IntVec3 offset;
    private List<IntVec3> additions = new List<IntVec3>();

    // HACK the state that was handed to us by SetGrid.
    // just kept around to make AllCells and serialization work for now
    private ImmArr<KeyValuePair<IntVec3, int>> state;

    // cached component references
    private RobotController robot;
    private GridMarker marker;

    public Vector3 CenterOfCell(IntVec3 idx) {
        var origin = marker.transform.position;
        var scale = marker.CellSize * Vector3.one;
        return origin + Vector3.Scale(scale, new Vector3(idx.X + 0.5f, idx.Y + 0.5f, idx.Z + 0.5f));
    }

    public GameObject this[IntVec3 idx] {
        get {
            var key = idx + offset;
            return grid.ContainsKey(key) ? grid[key] : null;
        }
        set {
            var key = idx + offset;
            if (value != null) {
                grid.Add(key, value);
            } else {
                grid.Remove(key);
            }
        }
    }

    void Awake() {
        robot = FindObjectOfType<RobotController>();
        marker = FindObjectOfType<GridMarker>();
        grid = new Dictionary<IntVec3, GameObject>();
        state = ImmArr.empty<KeyValuePair<IntVec3,int>>();
        offset = new IntVec3(GRID_SIZE / 2, GRID_SIZE / 2, GRID_SIZE / 2);
    }

	void Start() {
	}

    public KeyValuePair<IntVec3,int>[] AllCells {
        get {
            return state.ToArray();
        }
    }

    public int CellsFilled {
        get {
            return state.Length;
        }
    }

    public IEnumerable<IntVec3> AllCellLocations {
        get {
            var offsetKeys = new List<IntVec3>();
            foreach (var key in grid.Keys) {
                offsetKeys.Add(key - offset);
            }
            return offsetKeys;
        }
    }

    public void AddObject(IntVec3 idx, GameObject prefab) {
        if (this[idx] != null) {
            return;
        }
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

    public void SetGrid(ImmArr<KeyValuePair<IntVec3,int>> state) {
        Profiler.BeginSample("Grid.SetGrid");
        this.state = state;
        Profiler.BeginSample("Grid.SetGrid.calculateChange");
        var set = new HashSet<IntVec3>(state.Select(x => x.Key));
        var toRemove = new List<IntVec3>();
        var prefab = robot.HeldPrefab;
        foreach (var kvp in grid) {
            var idx = kvp.Key - offset;
            if (!set.Contains(idx)) {
                toRemove.Add(idx);
            }
        }
        Profiler.EndSample();

        Profiler.BeginSample("Grid.SetGrid.addObjects");
        foreach (var idx in state) {
            AddObject(idx.Key, prefab);
        }
        Profiler.EndSample();
        Profiler.BeginSample("Grid.SetGrid.removeObjects");
        foreach (var idx in toRemove) {
            RemoveObject(idx);
        }
        Profiler.EndSample();
        Profiler.BeginSample("Grid.SetGrid.assignCubeValues");
        foreach (var kvp in state) {
            var obj = this[kvp.Key];
            obj.GetComponent<Cube>().CubeId = kvp.Value;
        }
        Profiler.EndSample();
        Profiler.EndSample();
    }

    public void Undo() {
        foreach (var idx in additions) {
            RemoveObject(idx);
        }
        additions.Clear();
    }

    public void Clear() {
        foreach (var obj in grid.Values) {
            if (obj != null) {
                Destroy(obj);
            }
        }
        grid.Clear();
        additions.Clear();
    }

    public void ResetUndo() {
        additions.Clear();
    }
}
