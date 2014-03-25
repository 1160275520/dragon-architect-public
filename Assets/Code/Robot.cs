using UnityEngine;
using System.Collections;
using System.ComponentModel;

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

    public Axis FacingAxis;
    public Direction FacingDirection;
    public IntVec3 Position;

	// Use this for initialization
	void Start () {
	
	}
	
	// Update is called once per frame
	void Update () {
        var grid = FindObjectOfType<Grid>();
        transform.position = grid.CenterOfCell(Position);
	}

    public void ExecuteMoveForward() {
        Position += forwardVec;
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
                    throw new InvalidEnumArgumentException();
            }
            
        }
    }
}
