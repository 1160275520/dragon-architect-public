using UnityEngine;
using System.Collections;

public class Viewer : MonoBehaviour {

    public float speed = 1;

	// Use this for initialization
	void Start () {
	
	}
	
	// Update is called once per frame
	void FixedUpdate () {
        var directionVector = new Vector3(Input.GetAxis("Horizontal"), 0, Input.GetAxis("Vertical"));
        var forward = new Vector3(transform.forward.x, 0, transform.forward.z);
        transform.position += forward * Input.GetAxis("Vertical") * speed;
        transform.position += new Vector3(-transform.forward.z, 0, transform.forward.x) * -Input.GetAxis("Horizontal") * speed;
        if (Input.GetKey(KeyCode.Space) || Input.GetKey(KeyCode.Q)) {
            transform.position = transform.position + (Vector3.up * speed);
        }
        if (Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.E)) {
            transform.position = transform.position + (Vector3.down * speed);;
        }
	}
}
