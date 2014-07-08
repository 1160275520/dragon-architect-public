using UnityEngine;
using System.Collections;

[ExecuteInEditMode]
public class SpeechBubble : MonoBehaviour
{
    //this game object's transform
    private Transform goTransform;
    //the game object's position on the screen, in pixels
    private Vector3 goScreenPos;
    //the game objects position on the screen
    private Vector3 goViewportPos;
    
    //the width of the speech bubble
    int BubbleWidth = 300;
    
    //an offset, to better position the bubble
    float OffsetX = 0;
    float OffsetY = 150;
    
    //an offset to center the bubble
    private int centerOffsetX;
    private int centerOffsetY;
    
    //a material to render the triangular part of the speech balloon
    public Material TailMaterial;
    //a guiSkin, to render the round part of the speech balloon
    public GUISkin CustomSkin;
    
    //use this for early initialization
    void Awake ()
    {
        //get this game object's transform
        goTransform = this.GetComponent<Transform>();
    }
    
    //use this for initialization
    void Start()
    {
        //if the material hasn't been found
        if (!TailMaterial)
        {
            Debug.LogError("Please assign a material on the Inspector.");
            return;
        }
        
        //if the guiSkin hasn't been found
        if (!CustomSkin)
        {
            Debug.LogError("Please assign a GUI Skin on the Inspector.");
            return;
        }
    }
    
    //Called once per frame, after the update
    void LateUpdate()
    {
        var grid = FindObjectOfType<Grid>();
        var robot = FindObjectOfType<RobotController>();
        var robotPos = grid.CenterOfCell(robot.Robot.Position);
        goTransform.position = robotPos;
        //find out the position on the screen of this game object
        goScreenPos = Camera.main.WorldToScreenPoint(goTransform.position); 
        
        //Could have used the following line, instead of lines 70 and 71
        //goViewportPos = Camera.main.WorldToViewportPoint(goTransform.position);
        goViewportPos.x = goScreenPos.x/(float)Screen.width;
        goViewportPos.y = goScreenPos.y/(float)Screen.height;
    }
    
    //Draw GUIs
    void OnGUI()
    {
        GUI.skin = CustomSkin;

        var msg = FindObjectOfType<AllTheGUI>().CurrentMessage;

        int bubbleHeight = (int)CustomSkin.FindStyle("label").CalcHeight(new GUIContent(msg), BubbleWidth - 80) + 110;
        Debug.Log(bubbleHeight);
        //Calculate the X and Y offsets to center the speech balloon exactly on the center of the game object
        centerOffsetX = BubbleWidth/2;
        centerOffsetY = bubbleHeight/2;
            
        //Begin the GUI group centering the speech bubble at the same position of this game object. After that, apply the offset
        GUI.BeginGroup(new Rect(goScreenPos.x - centerOffsetX - OffsetX, Screen.height - goScreenPos.y - centerOffsetY - OffsetY, BubbleWidth, bubbleHeight));
        
        //Render the round part of the bubble
        GUI.Label(new Rect(0,0,BubbleWidth,bubbleHeight), "", "SpeechBubble");
        
        //Render the text
//        var tm = new TextMesh();
//        tm.text = msg;
//        tm.ri
        GUI.Label(new Rect(35,30,BubbleWidth - 50,bubbleHeight - 25), msg);

        GUI.EndGroup();
    }
    
    //Called after camera has finished rendering the scene
//    void OnRenderObject()
//    {
//        //push current matrix into the matrix stack
//        GL.PushMatrix();
//        //set material pass
//        TailMaterial.SetPass(0);
//        //load orthogonal projection matrix
//        GL.LoadOrtho();
//        //a triangle primitive is going to be rendered
//        GL.Begin(GL.TRIANGLES);
//        
//        //Define the triangle vetices
//        GL.Vertex3(goViewportPos.x, goViewportPos.y+(OffsetY/3)/Screen.height, 0.1f);
//        GL.Vertex3(goViewportPos.x - (BubbleWidth/3)/(float)Screen.width, goViewportPos.y+OffsetY/Screen.height, 0.1f);
//        GL.Vertex3(goViewportPos.x - (BubbleWidth/8)/(float)Screen.width, goViewportPos.y+OffsetY/Screen.height, 0.1f);
//        
//        GL.End();
//        //pop the orthogonal matrix from the stack
//        GL.PopMatrix();
//    }
}