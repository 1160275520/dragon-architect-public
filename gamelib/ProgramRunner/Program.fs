// Learn more about F# at http://fsharp.net
// See the 'F# Tutorial' project for more help.

open Ruthefjord

let assemblyPath () =
    System.Reflection.Assembly.GetExecutingAssembly().Location
    |> System.IO.Path.GetDirectoryName

let exit code =
    System.Environment.Exit code
    failwith "unreachable"

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
        let grid = GridStateTracker Seq.empty
        let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
        let runner = BasicImperativeRobotSimulator (robot, grid)
        let result = Simulator.SimulateWithRobot program importedModules runner

        printfn "Number of states: %d" result.States.Length

    with e ->
        printfn "An error: %A" e.Message
        exit 2

    0 // return an integer exit code
