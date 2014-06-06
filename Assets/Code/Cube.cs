using UnityEngine;
using System.Collections.Generic;
using System;

public class Cube : MonoBehaviour {

    public static string[] AvailableColors = new string[] { "#5cab32", "#ff0000" };

    [HideInInspector] public Dictionary<string, Material> AvailableMaterials;
    public Texture StandardTexture;

	// Use this for initialization
	void Start () {
        AvailableMaterials = new Dictionary<string, Material>();
        foreach (var color in AvailableColors) {
            var mat = new Material(Shader.Find("Diffuse"));
            mat.mainTexture = StandardTexture;
            mat.color = HTMLColorToColor(color);
            AvailableMaterials.Add(color, mat);
        }
	}

    private Color HTMLColorToColor(string hex) {
        float r = Convert.ToUInt32(hex.Substring(1, 2), 16);
        float g = Convert.ToUInt32(hex.Substring(3, 2), 16);
        float b = Convert.ToUInt32(hex.Substring(5, 2), 16);
        return new Color(r, g, b);
    }
	
	// Update is called once per frame
	void Update () {
	
	}
}
