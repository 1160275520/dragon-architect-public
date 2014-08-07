using UnityEngine;
using Ruthefjord;

public class GroundPlane : MonoBehaviour {

    private ProgramManager progman;
    private EditMode lastEditMode;

    void Awake() {
        progman = FindObjectOfType<ProgramManager>();
    }

	// Use this for initialization
	void Start () {
        lastEditMode = null;	
	}
	
	// Update is called once per frame
	void Update () {
        var em = progman.EditMode;
        if (!em.Equals(lastEditMode)) {
            Debug.Log(em);
            if (em.IsPersistent) {
//                var grass = Resources.Load<Material>("Grass");
//                var grassGrid = (Material)Resources.Load("GrassGrid", typeof(Material));
//                renderer.materials = new Material[] {grass, grassGrid};
                renderer.materials = new Material[] {Resources.Load<Material>("GrassGround")};
            } else {
                var ground = Resources.Load<Material>("Ground");
                renderer.materials = new Material[] {ground};
            }
            lastEditMode = em;
        }
	}
}
