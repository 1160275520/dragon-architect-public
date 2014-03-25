using UnityEngine;
using System.Collections;

public class AllTheGUI : MonoBehaviour {

    void OnGUI()
    {
        if (GUI.Button(new Rect(10, 10, 100, 150), "Forward"))
        {
            var dir = GameObject.Find("Robot").GetComponent<Robot>().forwardVec;
            Debug.Log(dir);
            GameObject.Find("Robot").transform.position += dir;
        }
    }
}
