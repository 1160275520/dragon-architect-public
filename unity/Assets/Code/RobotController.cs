using UnityEngine;
using System.Collections.Generic;
using System.Linq;
using System;
using Hackcraft;
using Hackcraft.Robot;

public class RobotController : MonoBehaviour {

    public IRobot Robot;
    public GameObject HeldPrefab;

	// Use this for initialization
	void Start () {
        Reset();
	}

    public void Reset() {
        Robot = new BasicImperativeRobot(IntVec3.Zero, IntVec3.UnitZ);
    }

	// Update is called once per frame
	void Update () {
        var grid = FindObjectOfType<Grid>();
        transform.position = grid.CenterOfCell(Robot.Position);
        transform.rotation = getRotation();
	}

    private Quaternion getRotation() {
        var dir = Robot.Direction;
        float rot;
        if (dir.X != 0) {
            rot = dir.X > 0 ? 90 : -90;
        } else {
            rot = dir.Z > 0 ? 0 : 180;
        }
        return Quaternion.Euler(new Vector3(0f, rot, 0f));
    }
}
