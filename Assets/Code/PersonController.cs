using UnityEngine;
using Hackcraft;
using System.Collections.Generic;
using System.Linq;

public class PersonController : MonoBehaviour {

    public IntVec3 Position;
    public IntVec3 Direction;
    public GameObject HeldPrefab;

    private enum Command {
        Forward,
        Left,
        Right,
        PlaceBlock,
        RemoveBlock
    }
    private List<Command> commands;
    private float lastCommandExecutionTime = 0.0f;
    struct CommandDisplay
    {
        public Command command;
        public float displayTime;
    }
    CommandDisplay displayInfo;

    public float DelayPerCommand;
    public GUISkin CustomSkin;
    
	void Start () {
        Position = new IntVec3(-4, 0, 0);
        Direction = new IntVec3(0, 0, 1);
        commands = new List<Command>();
	}
	
	void Update () {
        var grid = FindObjectOfType<Grid>();
        displayInfo.displayTime -= Time.deltaTime;
        if (Input.GetKeyDown(KeyCode.UpArrow)) {
            commands.Add(Command.Forward);
            displayInfo.command = Command.Forward;
            displayInfo.displayTime = 1.0f;
        }
        if (Input.GetKeyDown(KeyCode.LeftArrow)) {
            commands.Add(Command.Left);
            displayInfo.command = Command.Left;
            displayInfo.displayTime = 1.0f;
        }
        if (Input.GetKeyDown(KeyCode.RightArrow)) {
            commands.Add(Command.Right);
            displayInfo.command = Command.Right;
            displayInfo.displayTime = 1.0f;
        }
        if (Input.GetKeyDown(KeyCode.Space)) {
            if (grid[Position] != null) {
                commands.Add(Command.RemoveBlock);
                displayInfo.command = Command.RemoveBlock;
            } else {
                commands.Add(Command.PlaceBlock);
                displayInfo.command = Command.PlaceBlock;
            }
            displayInfo.displayTime = 1.0f;
        }

        if (lastCommandExecutionTime + DelayPerCommand < Time.fixedTime && commands.Count > 0) {
            switch (commands.First()) {
                case Command.Forward:
                    Position += Direction;
                    break;
                case Command.Left:
                    Direction = new IntVec3(-Direction.Z, 0, Direction.X);
                    break;
                case Command.Right:
                    Direction = new IntVec3(Direction.Z, 0, -Direction.X);
                    break;
                case Command.PlaceBlock:
                    grid.AddObject(Position, HeldPrefab);
                    break;
                case Command.RemoveBlock:
                    grid.RemoveObject(Position);
                    break;
            }
            commands.RemoveAt(0);
            lastCommandExecutionTime = Time.fixedTime;
        }

        transform.position = grid.CenterOfCell(Position);
        transform.rotation = getRotation();

	}

    void OnGUI() {
        GUI.skin = CustomSkin;
        if (displayInfo.displayTime > 0) {
            GUI.Box(new Rect(200, AllTheGUI.SPACING, AllTheGUI.BUTTON_COLUMN_WIDTH, AllTheGUI.BUTTON_HEIGHT), displayInfo.command.ToString());
        }
    }

    private Quaternion getRotation() {
        var dir = Direction;
        float rot;
        if (dir.X != 0) {
            rot = dir.X > 0 ? 90 : -90;
        } else {
            rot = dir.Z > 0 ? 0 : 180;
        }
        return Quaternion.Euler(new Vector3(0f, rot, 0f));
    }
}
