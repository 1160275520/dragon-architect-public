using UnityEngine;
using System.Collections.Generic;
using System;
using Hackcraft;

public class TLFinal : MonoBehaviour {

    void Start() {
//		GetComponent<AllTheGUI>().CurrentMessage = "Use what you've learned to help me build something awesome!";
    }

    void Update() {
        var progman = GetComponent<ProgramManager>();
        if (progman.IsRunning) {
            GetComponent<AllTheGUI>().CurrentMessage = null;
            this.enabled = false;
        }
    }
}
