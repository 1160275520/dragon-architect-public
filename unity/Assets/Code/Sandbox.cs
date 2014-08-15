using UnityEngine;
using Ruthefjord;

public class Sandbox : MonoBehaviour {

	// Use this for initialization
	void Start () {
        var progman = GetComponent<ProgramManager>();

        GetComponent<ExternalAPI>().NotifyOfSandbox();

        // if we don't do this, the program manager will just clear the grid immediately
        // TODO consider making a really unintuitive hack like this unecessary
        progman.EditMode = EditMode.Persistent;

        var worldData = FindObjectOfType<Global>().SandboxWorldData;
        if (worldData != null) {
            var world = World.decodeFromString(worldData);
            var blocks = Ruthefjord.ImmArr.ofArray(world.Blocks);
            GetComponent<Grid>().SetGrid(blocks);
            if (world.Robots.Length > 0) {
                var d = world.Robots[0];
                FindObjectOfType<RobotController>().SetRobot(new Ruthefjord.Robot.BasicImperativeRobot(d.Position, d.Direction), null, 0.0f);
            }
        }
	}
	
	// Update is called once per frame
	void Update () {
	
	}
}
