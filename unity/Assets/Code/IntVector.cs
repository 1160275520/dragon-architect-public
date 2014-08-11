using System;
using UnityEngine;
using Ruthefjord;

public static class IntVecExtensions {
    public static Vector3 AsVector3(this IntVec3 v) {
        return new Vector3(v.X, v.Y, v.Z);
    }
}
