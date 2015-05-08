// Learn more about F# at http://fsharp.net
// See the 'F# Tutorial' project for more help.

open Ruthefjord

let assemblyPath () =
    System.Reflection.Assembly.GetExecutingAssembly().Location
    |> System.IO.Path.GetDirectoryName

let exit code =
    System.Environment.Exit code
    failwith "unreachable"

let time fn numIter =
    let sw = System.Diagnostics.Stopwatch ()
    sw.Start ()
    for i = 1 to numIter do
        fn ()
    sw.Stop ()
    sw.Elapsed.TotalMilliseconds / (float numIter)

[<EntryPoint>]
let main argv =
    let filename =
        try
            argv.[0]
        with _ ->
            printfn "Usage: ProgramRunner <filename>\nRuns the program pointed to by filename."
            exit 1

    printfn "path: %s" (assemblyPath ())
    let stdlibPath = System.IO.Path.Combine (assemblyPath (), "../../../../unity/Assets/Resources/module/stdlib.txt")

    try
        let importedModules = Simulator.import (Parser.Parse (System.IO.File.ReadAllText stdlibPath, "stdlib"))
        let text = System.IO.File.ReadAllText filename
        let program = Parser.Parse (text, filename)

        //let t = time (fun () -> Simulator.SimulateWithRobot program importedModules runner |> ignore) 10
        //printfn "Time with robot: %.3f" t

        let t = time (fun () -> Simulator.SimulateWithoutRobot program importedModules |> ignore) 50
        printfn "Original:  %.3f" t

        let t = time (fun () -> Simulator.SimulateWithoutRobotOptimized program importedModules |> ignore) 50
        printfn "Optimized: %.3f" t

    with e ->
        printfn "An error: %A" e.Message
        exit 2

    0 // return an integer exit code
