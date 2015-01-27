using UnityEngine;
using System;
using System.Linq;
using System.Collections.Generic;
using Ruthefjord;
using Ruthefjord.Ast;

public class PuzDecompFixTowers : MonoBehaviour
{

    PuzzleHelper lh;

    void Start ()
    {
        lh = GetComponent<PuzzleHelper>();

        var config = new Dictionary<string, Dictionary<string, Tuple<Func<int, bool>,string>>> ();
        config.Add("$FixedTower", new Dictionary<string, Tuple<Func<int, bool>,string>> ());
        config ["$FixedTower"].Add("TowerLayer", new Tuple<Func<int, bool>,string>((n) => n >= 15, "FixedTower should use at least 15 TowerLayer blocks"));
        config ["$FixedTower"].Add("TowerTop", new Tuple<Func<int, bool>,string>((n) => n == 1, "FixedTower should use exactly one TowerTop block"));

        lh.WinPredicate = lh.CreateCodeCountPredicate(config, lh.BlockingErrors);
    }
}
