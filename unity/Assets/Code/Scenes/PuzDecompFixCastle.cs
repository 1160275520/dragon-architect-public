using UnityEngine;
using System;
using System.Linq;
using System.Collections.Generic;
using Ruthefjord;
using Ruthefjord.Ast;

public class PuzDecompFixCastle : MonoBehaviour
{

    PuzzleHelper lh;

    void Start ()
    {
        lh = GetComponent<PuzzleHelper>();

        var config = new Dictionary<string, Dictionary<string, Tuple<Func<int, bool>,string>>> ();
        config.Add("$FixedCastle", new Dictionary<string, Tuple<Func<int, bool>,string>> ());
        config ["$FixedCastle"].Add("Wall", new Tuple<Func<int, bool>,string>((n) => n == 4, "FixedCastle should use exactly four Wall blocks"));
        config ["$FixedCastle"].Add("Tower", new Tuple<Func<int, bool>,string>((n) => n == 4, "FixedCastle should use exactly four Tower blocks"));

        lh.WinPredicate = lh.CreateCodeCountPredicate(config, lh.BlockingErrors);
    }
}
