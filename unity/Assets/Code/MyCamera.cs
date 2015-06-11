using UnityEngine;
using System.Collections;
using System;
using Microsoft.FSharp.Collections;

public class MyCamera : MonoBehaviour
{
    public float TranslationSmoothness = 1.5f;         // The relative speed at which the camera will catch up.
    public float RotationSmoothness = 5.0f;         // The relative speed at which the camera will catch up.
    public float WobblePeriod = 3.0f;
    public float WobbleMagnitude = 3.0f;
    public bool ForceFullTranslation = false;
    public GameObject CubeHighlight;

    private Transform player;           // Reference to the player's transform.
    private Vector3 relCameraPos;       // The relative position of the camera from the player.
    private float relCameraPosMag;      // The distance of the camera from the player.
    private Vector3 newPos;             // The position the camera is trying to reach.
    private GameObject currentCubeHighlight;

    void Awake() {
        // Setting up the reference.
        player = GameObject.Find("Robot").transform;

        // Setting the relative position as the initial relative position of the camera in the scene.
        relCameraPos = transform.position - player.position;
        relCameraPosMag = relCameraPos.magnitude - 0.5f;

        Rotate(10);
    }

    public void SetCameraTarget(GameObject target) {
        player = target.transform;
    }

    void FixedUpdate() {
        var t = Time.fixedTime;
        var y = WobbleMagnitude * Mathf.Sin(t * 4 * Mathf.PI / WobblePeriod) * Vector3.up;
        var x = WobbleMagnitude * Mathf.Cos(t * 2 * Mathf.PI / WobblePeriod) * Vector3.right;
        var offset = x + y;


        // The standard position of the camera is the relative position of the camera from the player.
        newPos = player.position + (relCameraPos + offset);

        // The abovePos is directly above the player at the same distance as the standard position.
//        Vector3 abovePos = player.position + Vector3.up * relCameraPosMag;
//
//        // An array of 5 points to check if the camera can see the player.
//        Vector3[] checkPoints = new Vector3[5];
//
//        // The first is the standard position of the camera.
//        checkPoints[0] = standardPos;
//
//        // The next three are 25%, 50% and 75% of the distance between the standard position and abovePos.
//        checkPoints[1] = Vector3.Lerp(standardPos, abovePos, 0.25f);
//        checkPoints[2] = Vector3.Lerp(standardPos, abovePos, 0.5f);
//        checkPoints[3] = Vector3.Lerp(standardPos, abovePos, 0.75f);
//
//        // The last is the abovePos.
//        checkPoints[4] = abovePos;
//
//        // Run through the check points...
//        for (int i = 0; i < checkPoints.Length; i++) {
//            // ... if the camera can see the player...
//            if (ViewingPosCheck(checkPoints [i])) {
//                newPos = checkPoints [i];
//                // ... break from the loop.
//                break;
//            }
//        }

        if (ForceFullTranslation) {
            transform.position = newPos;
        } else {
            // Lerp the camera's position between it's current position and it's new position.
            transform.position = Vector3.Lerp(transform.position, newPos, TranslationSmoothness * Time.deltaTime);
        }

        SmoothLookAt();
    }

    void Update() {
        if (Input.GetMouseButtonDown(0))
        {
            RaycastHit hitInfo = new RaycastHit();
            var ray = Camera.main.ScreenPointToRay(Input.mousePosition);
            bool hit = Physics.Raycast(ray, out hitInfo);
            if (hit)
            {
                clearCubeHighlight();
                if (hitInfo.transform.gameObject.name.StartsWith("Cube") && FindObjectOfType<ProgramManager>().EditMode.IsWorkshop) {
                    // highlight cube
                    currentCubeHighlight = (GameObject)GameObject.Instantiate(CubeHighlight, hitInfo.transform.position, Quaternion.identity);
                    // the command StatementT will be first, so we want the execute right after that with the id for the corresponding code block
                    var id = FindObjectOfType<Grid>().CommandForCube(hitInfo.transform.gameObject).LastExecuted.Tail.Head.Meta.Id;
                    FindObjectOfType<ExternalAPI>().NotifyDebugHighlight(id);
                }
            }
        }
    }

    public void clearCubeHighlight() {
        if (currentCubeHighlight) {
            Destroy(currentCubeHighlight);
        }
    }

    private bool ViewingPosCheck(Vector3 checkPos) {
        RaycastHit hit;

        // If a raycast from the check position to the player hits something...
        if (Physics.Raycast(checkPos, player.position - checkPos, out hit, relCameraPosMag)) {
            // ... if it is not the player...
            if (hit.transform != player && !hit.transform.IsChildOf(player)) {
                // This position isn't appropriate.
                return false;
            }
        }
        // If we haven't hit anything or we've hit the player, this is an appropriate position.
        return true;
    }


    private void SmoothLookAt() {
        // Create a vector from the camera towards the player.
        Vector3 relPlayerPosition = player.position - transform.position;

        // Create a rotation based on the relative position of the player being the forward vector.
        Quaternion lookAtRotation = Quaternion.LookRotation(relPlayerPosition, Vector3.up);

        //transform.rotation = lookAtRotation;

        // Lerp the camera's rotation between it's current rotation and the rotation that looks at the player.
        transform.rotation = Quaternion.Lerp(transform.rotation, lookAtRotation, RotationSmoothness * Time.deltaTime);
    }

    public void Rotate(float degrees) {
        relCameraPos = Quaternion.AngleAxis(degrees, Vector3.up) * relCameraPos;
    }

    public void Tilt(float degrees) {
        var curDot = Vector3.Dot(relCameraPos.normalized, Vector3.up);
        if ((curDot > 0.05 || degrees > 0) & (curDot < 0.95 || degrees < 0)) {
            relCameraPos = Quaternion.AngleAxis(degrees, Vector3.Cross(relCameraPos, Vector3.up)) * relCameraPos;
        }
    }

    public void Zoom(float scale) {
        if ((relCameraPosMag > 5 && scale < 1) || (relCameraPosMag < 100 && scale > 1)) { // limits on how far or close camera can zoom
            relCameraPos *= scale;
            relCameraPosMag = relCameraPos.magnitude - 0.5f;
        }
    }
}