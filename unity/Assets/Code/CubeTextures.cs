using UnityEngine;
using System.Collections.Generic;
using System;
using Ruthefjord;

public class CubeTextures : MonoBehaviour {

    public static readonly string[] AvailableColors = BasicImperativeRobotSimulator.Colors;
    public Texture StandardTexture;

    [HideInInspector]
    public Material[] AvailableMaterials;

	// Use this for initialization
	void Start () {
        var mats = new List<Material>();
        foreach (var color in AvailableColors) {
            var mat = new Material(Shader.Find("Diffuse"));
            mat.mainTexture = StandardTexture;
            mat.color = HTMLColorToColor(color);
            mats.Add(mat);
            //Debug.Log("adding material " + mat.color.ToString());
        }
        AvailableMaterials = mats.ToArray();
	}

    private static Color HTMLColorToColor(string hex) {
        float r = Convert.ToUInt32(hex.Substring(1, 2), 16);
        float g = Convert.ToUInt32(hex.Substring(3, 2), 16);
        float b = Convert.ToUInt32(hex.Substring(5, 2), 16);
        return new Color(r / 255.0f, g / 255.0f, b / 255.0f);
    }
}
