using UnityEngine;
using System.Collections;
using Rutherfjord;

public class YCue : MonoBehaviour
{
    public Material lineMat;

    // cached component references
    private RobotController robot;
    private Grid grid;

    void Awake() {
        robot = FindObjectOfType<RobotController>();
        grid = FindObjectOfType<Grid>();
    }

    // Use this for initialization
    void Start() {
        LineRenderer lineRenderer = gameObject.AddComponent<LineRenderer>();
        lineRenderer.material = lineMat;
        lineRenderer.SetWidth(0.05f, 0.05f);
        lineRenderer.SetVertexCount(2);
    }

    // Update is called once per frame
    void Update() {
        var robotPos = robot.transform.position;
        var yPos = 0.1f;
        for (int i = 0; i <= robot.Robot.Position.Y; i++) {
            if (grid[new IntVec3(robot.Robot.Position.X, i, robot.Robot.Position.Z)] != null) {
                yPos = i + 1.1f;
            }
        }
        transform.position = new Vector3(robotPos.x, yPos, robotPos.z);

        LineRenderer lineRenderer = GetComponent<LineRenderer>();
        lineRenderer.SetPosition(0, robotPos);
        lineRenderer.SetPosition(1, transform.position);
    }
}
