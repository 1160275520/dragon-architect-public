using UnityEngine;
using System.Collections.Generic;
using System;
using Ruthefjord;

public class PuzDecompCastle : MonoBehaviour {

    private PuzzleHelper lh;

    void Start() {
        lh = GetComponent<PuzzleHelper>();

        var config = new Dictionary<string, Dictionary<string, Tuple<Func<int, bool>,string>>> ();
        config.Add("MAIN", new Dictionary<string, Tuple<Func<int, bool>,string>> ());
        config ["MAIN"].Add("Castle", new Tuple<Func<int, bool>,string>((n) => n == 1, "Run the program with one Castle block to see what it does"));

        lh.WinPredicate = PuzzleHelper.All(new Func<bool>[] { lh.CreateCodeCountPredicate(config, lh.BlockingErrors)});
    }
}
