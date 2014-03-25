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
        Pos, Neg
    }

    public static int intFromDirection(Direction d)
    {
        if (d == Direction.Neg)
            return -1;
        return 1;
    }

    public Axis axis;
    public Direction dir;

    public IntVec2 pos;

	// Use this for initialization
	void Start () {
	
	}
	
	// Update is called once per frame
	void Update () {
        var grid = gameObject.GetComponent<Grid>();
        transform.position = grid.CenterOfCell(pos);
	}

    public Vector3 forwardVec
    {
        get
        {
            switch (axis)
            {
                case Axis.X:
                    return new Vector3(intFromDirection(dir), 0, 0);
                case Axis.Y:
                    return new Vector3(0, intFromDirection(dir), 0);
                case Axis.Z:
                    return new Vector3(0, 0, intFromDirection(dir));
                default:
                    throw new InvalidEnumArgumentException();
            }
            
        }
    }
}
