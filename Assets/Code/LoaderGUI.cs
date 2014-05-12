using UnityEngine;
using System.Collections;

public class LoaderGUI : MonoBehaviour {

    public static readonly string[] LEVELS = new string[] {
        "tl_movement2d", "tl_placement", "tl_personify", "tl_movement_args", 
        "tl_movement3d", "tl_call", "tl_call2", "tl_repeat", "tl_repeat2",
        "tl_line", "tl_line", "tl_debug", "tl_loop",
    };

	// Use this for initialization
	void Start () {
	
	}
	
	// Update is called once per frame
	void Update () {
	
	}

    void OnGUI() {
        GUILayout.BeginArea(new Rect(0, 0, Screen.width, Screen.height));
        GUILayout.FlexibleSpace();
        GUILayout.BeginHorizontal();
        GUILayout.FlexibleSpace();
        var levelIndex = GUILayout.SelectionGrid(-1, LEVELS, 5);
        GUILayout.FlexibleSpace();
        GUILayout.EndHorizontal();
        GUILayout.FlexibleSpace();
        GUILayout.EndArea();
        if (levelIndex >= 0) {
            Application.LoadLevel(LEVELS[levelIndex]);
        }
    }
}
