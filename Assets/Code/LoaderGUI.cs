using UnityEngine;
using System.Collections;

public class LoaderGUI : MonoBehaviour {

    public static readonly string[] LEVELS = new string[] {
        "tl_movement2d", "tl_placement", "tl_movement_args", 
        "tl_movement3d", "tl_call", "tl_call2", "tl_repeat", "tl_repeat2",
        "tl_final",
    };

    public static int CURRENT_LEVEL_INDEX = 0;

	// Use this for initialization
	void Start () {
        FindObjectOfType<ExternalAPI>().ClearLevel();
	}
	
	// Update is called once per frame
	void Update () {
	
	}

    void OnGUI() {
        GUILayout.BeginArea(new Rect(0, 0, Screen.width, Screen.height));
        GUILayout.FlexibleSpace();
        GUILayout.BeginHorizontal();
        GUILayout.FlexibleSpace();
        var level = GUILayout.SelectionGrid(-1, LEVELS, 5);
        GUILayout.FlexibleSpace();
        GUILayout.EndHorizontal();
        GUILayout.FlexibleSpace();
        GUILayout.EndArea();
        if (level >= 0) {
            CURRENT_LEVEL_INDEX = level;
            Application.LoadLevel(LEVELS[CURRENT_LEVEL_INDEX]);
        }
    }
}
