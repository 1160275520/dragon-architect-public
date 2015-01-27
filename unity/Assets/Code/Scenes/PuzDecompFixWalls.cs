using UnityEngine;
using System;
using System.Linq;
using System.Collections.Generic;
using Ruthefjord;
using Ruthefjord.Ast;

public class PuzDecompFixWalls : MonoBehaviour
{

    PuzzleHelper lh;

    void Start ()
    {
        lh = GetComponent<PuzzleHelper>();

        var config = new Dictionary<string, Dictionary<string, Tuple<Func<int, bool>,string>>> ();
        config.Add("$FixedWall", new Dictionary<string, Tuple<Func<int, bool>,string>> ());
        config ["$FixedWall"].Add("WallSheet", new Tuple<Func<int, bool>,string>((n) => n >= 3, "FixedWall should use at least 3 WallSheet blocks"));
        config ["$FixedWall"].Add("WallTop", new Tuple<Func<int, bool>,string>((n) => n == 1, "FixedWall should use exactly one WallTop block"));

        lh.WinPredicate = lh.CreateCodeCountPredicate(config, lh.BlockingErrors);
    }
}
