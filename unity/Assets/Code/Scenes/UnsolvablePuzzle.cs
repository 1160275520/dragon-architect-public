using UnityEngine;
using System.Collections;

public class UnsolvablePuzzle : MonoBehaviour {

    private PuzzleHelper lh;

    void Start() {
        lh = GetComponent<PuzzleHelper>();
        lh.WinPredicate = () => false;
    }

    void Update() {
    }
}
