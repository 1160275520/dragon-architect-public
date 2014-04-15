using UnityEngine;
using System.Collections.Generic;
using System.Linq;
using System;

public class Robot : MonoBehaviour {

    public enum Axis
    {
        X, Y, Z
    }

    public enum Direction
    {
        Neg = -1,
        Pos = 1,
    }

    private static int intFromDirection(Direction d)
    {
        return (int)d;
    }

    public enum Command
    {
        MoveForward,
        MoveUp,
        MoveDown,
        TurnLeft,
        TurnRight,
        PlaceBlock
    }

    public static Dictionary<Command, string> CommandNames = new Dictionary<Command, string>{
        {Command.MoveForward, "forward"},
        {Command.MoveUp, "up"},
        {Command.MoveDown, "down"},
        {Command.TurnLeft, "left"},
        {Command.TurnRight, "right"},
        {Command.PlaceBlock, "block"},
    };
    public static Dictionary<string, Command> CommandMapping = CommandNames.ToDictionary(kvp => kvp.Value, kvp => kvp.Key);

    public Axis FacingAxis;
    public Direction FacingDirection;
    public IntVec3 Position;

    public GameObject HeldPrefab;

	// Use this for initialization
	void Start () {
	
	}
	
	// Update is called once per frame
	void Update () {
        var grid = FindObjectOfType<Grid>();
        transform.position = grid.CenterOfCell(Position);
        transform.rotation = getRotation();
	}

    private void rotateCCW() {
        if (FacingAxis == Axis.X) {
            FacingDirection = FacingDirection == Direction.Neg ? Direction.Pos : Direction.Neg;
        }
        FacingAxis = FacingAxis == Axis.X ? Axis.Z : Axis.X;
    }

    private Quaternion getRotation() {
        float rot;
        switch (FacingAxis) {
            case Axis.X:
                rot = FacingDirection == Direction.Pos ? 90f : -90f;
                return Quaternion.Euler(new Vector3(0f, rot, 0f));
            case Axis.Z:
                rot = FacingDirection == Direction.Pos ? 0f : 180f;
                return Quaternion.Euler(new Vector3(0f, rot, 0f));
        }
        throw new InvalidOperationException("Rotation for FacingAxis == Axis.Y is ill-defined");
    }

    public void Execute(string command) {
        if (command == null) return;

        //Debug.Log(command);
        switch (CommandMapping[command]) {
            case Command.MoveForward:
                Position += forwardVec;
                break;
            case Command.MoveUp:
                Position += new IntVec3(0, 1, 0);
                break;
            case Command.MoveDown:
                if (Position.Y > 0) {
                    Position += new IntVec3(0, -1, 0);
                }
                break;
            case Command.PlaceBlock:
                FindObjectOfType<Grid>().AddObject(Position, HeldPrefab);
                break;
            case Command.TurnLeft:
                rotateCCW();
                rotateCCW();
                rotateCCW();
                break;
            case Command.TurnRight:
                rotateCCW();
                break;
        }
    }

    private IntVec3 forwardVec {
        get {
            var d = intFromDirection(FacingDirection);
            switch (FacingAxis) {
                case Axis.X:
                    return new IntVec3(d, 0, 0);
                case Axis.Y:
                    return new IntVec3(0, d, 0);
                case Axis.Z:
                    return new IntVec3(0, 0, d);
                default:
                    throw new ArgumentException();
            }
            
        }
    }
}
