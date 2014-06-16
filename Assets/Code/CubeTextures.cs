using UnityEngine;
using System.Collections.Generic;
using System;
using Hackcraft.Robot;

public class CubeTextures : MonoBehaviour {

    public static readonly string[] AvailableColors = BasicImperativeRobot.Colors;
    public Texture StandardTexture;

    [HideInInspector]
    public Dictionary<string, Material> AvailableMaterials;

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

    private static Color HTMLColorToColor(string hex) {
        float r = Convert.ToUInt32(hex.Substring(1, 2), 16);
        float g = Convert.ToUInt32(hex.Substring(3, 2), 16);
        float b = Convert.ToUInt32(hex.Substring(5, 2), 16);
        return new Color(r, g, b);
    }
}
