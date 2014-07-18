using UnityEngine;
using System.Collections.Generic;
using System.Linq;
using System;
using Hackcraft;
using Hackcraft.Robot;

public class RobotController : MonoBehaviour {

    public IRobot Robot;
    public GameObject HeldPrefab;

	public bool moving { get; private set; }
	private readonly float maxMoveTime = 0.2f;
    private readonly float minAnimTime = 0.1f;

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
		if (!moving) {
	        transform.position = grid.CenterOfCell(Robot.Position);
	        transform.rotation = getRotation();
		}
	}

	private IEnumerator<object> moveRobot(Vector3 deltaPos, float time) {
		moving = true;
		var curPos = transform.position;
		var wait = Math.Max((time - maxMoveTime) / 2, 0);
		var moveTime = Math.Min (maxMoveTime, time);
        // below a threshold, use don't animate movement
        if (moveTime < minAnimTime) {
            moving = false;
            yield break;
        }
		for(float t = 0; t < time;) {
            if (t > wait && t < time - wait) {
                // use sinosoidal interpolation (equation from http://gizma.com/easing/#sin3)
                transform.position = -deltaPos / 2 * (float)(Math.Cos (Math.PI * (t - wait) / moveTime) - 1) + curPos;
            }
            t += Time.fixedDeltaTime;
            yield return null;
        }
        moving = false;
	}

    private IEnumerator<object> rotateRobot(float angle, float time) {
        moving = true;
        var curRot = transform.rotation;
        var newRot = curRot * Quaternion.AngleAxis(angle, Vector3.up);
        var wait = Math.Max((time - maxMoveTime) / 2, 0);
        var moveTime = Math.Min (maxMoveTime, time);
        // below a threshold, use don't animate rotation
        if (time < minAnimTime) {
            moving = false;
            yield break;
        }
        for(float t = 0; t < time;) {
            if (t > wait && t < time - wait) {
                transform.rotation = Quaternion.Slerp(curRot, newRot, (t - wait) / moveTime);
            }
            t += Time.fixedDeltaTime;
            yield return null;
        }
        moving = false;
    }

    public void SetRobot(IRobot robot, Command com, float? time) {
        Robot = robot;
        if (time.HasValue && com != null) {
            var anim = transform.FindChild("dragon_improved").gameObject.animation;
            if (com.Type == "block" && time.Value > minAnimTime) {
                anim["bite"].speed = anim["bite"].length / time.Value;
                anim.Play("bite");
                anim.PlayQueued("idle", QueueMode.CompleteOthers);
            } else if (com.Type == "forward") {
				StartCoroutine(moveRobot(Robot.Direction.AsVector3(), time.Value));
			} else if (com.Type == "up") {
				StartCoroutine(moveRobot(new Vector3(0, 1, 0), time.Value));
			} else if (com.Type == "down") {
				StartCoroutine(moveRobot(new Vector3(0, -1, 0), time.Value));
            } else if (com.Type == "left") {
                StartCoroutine(rotateRobot(-90, time.Value));
            } else if (com.Type == "right") {
                StartCoroutine(rotateRobot(90, time.Value));
            }
        }
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
