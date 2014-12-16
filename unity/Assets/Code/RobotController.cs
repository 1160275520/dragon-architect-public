using UnityEngine;
using System.Collections.Generic;
using System.Linq;
using System;
using Ruthefjord;
using Ruthefjord.Robot;

public class RobotController : MonoBehaviour {

    public BasicRobot Robot { get; private set; }
    public GameObject HeldPrefab;

    // if animation would take longer than this, take this time and then just sit idle
	private const float MAX_ANIMATION_TIME = 0.2f;
    // if animation would take less than this, just don't bother animating anything
    private const float MIN_ANIMATION_TIME = 0.1f;

    // used by coroutines to detect when a new SetRobot has been called so they can stop running once invalid.
    private long counter = 0;

    // cached component references
    private Grid grid;

    void Awake() {
        grid = FindObjectOfType<Grid>();
    }

	// Use this for initialization
	void Start () {
        // check if the robot is still null here before resetting, in case sandbox/puzzle set the robot for us
        // TODO find a system with less bulls@$# initialization procedures.
        if (Robot == null) {
            Reset();
        }
    }

    public void Reset() {
        SetRobot(new BasicRobot(IntVec3.Zero, IntVec3.UnitZ), null, 0.0f);
    }

	private IEnumerator<object> moveRobot(Vector3 deltaPos, float time, long id) {
		var curPos = transform.position;
		var wait = Math.Max((time - MAX_ANIMATION_TIME) / 2.0f, 0.0f);
		var moveTime = Math.Min(MAX_ANIMATION_TIME, time);

        // animate until either: animation is cancelled (indicated via counter changing) or the animation time finishes
		for (float t = 0; counter == id && t < time;) {
            if (t > wait && t < time - wait) {
                // use sinosoidal interpolation (equation from http://gizma.com/easing/#sin3)
                transform.position = -deltaPos / 2 * (float)(Math.Cos (Math.PI * (t - wait) / moveTime) - 1) + curPos;
            }
            t += Time.fixedDeltaTime;
            yield return null;
        }
        yield break;
	}

    private IEnumerator<object> rotateRobot(float angle, float time, long id) {
        var curRot = transform.rotation;
        var newRot = curRot * Quaternion.AngleAxis(angle, Vector3.up);
		var wait = Math.Max((time - MAX_ANIMATION_TIME) / 2.0f, 0.0f);
        var moveTime = Math.Min(MAX_ANIMATION_TIME, time);

        // animate until either: animation is cancelled (indicated via counter changing) or the animation time finishes
		for (float t = 0; counter == id && t < time;) {
            if (t > wait && t < time - wait) {
                transform.rotation = Quaternion.Slerp(curRot, newRot, (t - wait) / moveTime);
            }
            t += Time.fixedDeltaTime;
            yield return null;
        }
        yield break;
    }

    public void SetRobot(BasicRobot robot, Command com, float secondsPerCommand) {
        Profiler.BeginSample("RobotController.SetRobot");
        // increment the counter to kill off the other coroutines
        counter++;

        Profiler.BeginSample("RobotController.SetRobot.resetPosition");
        // immediately teloport to "old" position so animations start from correct spot
        if (Robot != null) {
            transform.position = grid.CenterOfCell(Robot.Position);
            transform.rotation = getRotation();
        }
        Profiler.EndSample();

        Robot = robot;

        if (secondsPerCommand > MIN_ANIMATION_TIME && com != null) {
            Profiler.BeginSample("RobotController.SetRobot.setAnim");
            // if time is large enough, animmate the robot going to the new position
            var anim = transform.FindChild("dragon_improved").gameObject.animation;
            switch (com.Name) {
                case "cube":
                    anim["bite"].speed = anim["bite"].length / secondsPerCommand;
                    anim.Play("bite");
                    anim.PlayQueued("idle", QueueMode.CompleteOthers);
                    break;
                case "remove":
                    anim["get_hit_front"].speed = anim["get_hit_front"].length / secondsPerCommand;
                    anim.Play("get_hit_front");
                    anim.PlayQueued("idle", QueueMode.CompleteOthers);
                    break;
                case "forward":
                    StartCoroutine(moveRobot(Robot.Direction.AsVector3(), secondsPerCommand, counter));
                    break;
                case "up":
                    StartCoroutine(moveRobot(Vector3.up, secondsPerCommand, counter));
                    break;
                case "down":
                    StartCoroutine(moveRobot(Vector3.down, secondsPerCommand, counter));
                    break;
                case "left":
                    StartCoroutine(rotateRobot(-90, secondsPerCommand, counter));
                    break;
                case "right":
                    StartCoroutine(rotateRobot(90, secondsPerCommand, counter));
                    break;
            }
            Profiler.EndSample();
        } else {
            Profiler.BeginSample("RobotController.SetRobot.setImmediate");
            // otherwise just teleport the robot there
	        transform.position = grid.CenterOfCell(Robot.Position);
	        transform.rotation = getRotation();
            Profiler.EndSample();
        }
        Profiler.EndSample();
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
