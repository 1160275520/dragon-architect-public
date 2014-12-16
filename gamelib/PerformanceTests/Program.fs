
open System
open System.Diagnostics
open System.IO
open Ruthefjord

let programText = """
{"meta":{"language":"imperative_v01","version":{"major":0,"minor":1}},"procedures":{"MAIN":{"arity":0,"body":[{"numtimes":{"type":"literal","value":"250"},"meta":{"id":9},"stmt":{"meta":{"id":16},"body":[{"numtimes":{"type":"literal","value":"4"},"meta":{"id":50},"stmt":{"meta":{"id":17},"body":[{"numtimes":{"type":"literal","value":"10"},"meta":{"id":11},"stmt":{"meta":{"id":18},"body":[{"args":[{"type":"literal","value":"1"}],"meta":{"id":12},"proc":"Forward","type":"call"},{"args":[{"type":"literal","value":"#5cab32"}],"meta":{"id":13},"proc":"PlaceCube","type":"call"}],"type":"block"},"type":"repeat"},{"args":[],"meta":{"id":14},"proc":"Left","type":"call"}],"type":"block"},"type":"repeat"},{"args":[{"type":"literal","value":"1"}],"meta":{"id":15},"proc":"Up","type":"call"}],"type":"block"},"type":"repeat"}]}}}
"""

(*
let runBigProgram () =
    let prog = Serialization.Load programText
    let grid = ref (GridStateTracker Seq.empty)
    let sim = LazyProgramRunner (prog, !grid, Robot.BasicImperativeRobot (IntVec3.Zero, IntVec3.UnitZ))

    fun () ->
        while not sim.IsDone do
            let state = sim.UpdateOneStep !grid
            grid := GridStateTracker state.Grid
        printfn "Num blocks: %d" (!grid).CurrentState.Length
*)

let parseTest () =
    let text = System.IO.File.ReadAllText "../../../RuthefjordUnitTests/content/langtest.txt"

    try
        let ast = Parser.Parse (text, "foo")
        printf "%A\n" ast
    with e -> printf "%A\n" e.Message

    ()

let printTest () =
    let filename = "../../../../unity/Assets/Resources/stdlib.imperative.txt"

    let text = File.ReadAllText filename
    let prog = Parser.Parse (text, filename)
    use w = new StringWriter ()
    printf "ORIG:\n"
    printf "%s" text
    Parser.PrettyPrintTo w prog
    printf "\nNEW:\n"
    printf "%s" (w.ToString ())

let runTest f =
    let sw = Stopwatch ()
    sw.Start ()
    f ()
    sw.Stop ()
    sw.Elapsed

[<EntryPoint>]
let main argv =

    printTest ()

    //let time = runTest (runBigProgram ())
    //printfn "Elapsed time: %f" time.TotalSeconds

    // always run the same one for now

    0 // return an integer exit code
