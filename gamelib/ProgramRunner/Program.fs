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
//        let grid = GridStateTracker Seq.empty
//        let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
//        let runner = BasicImperativeRobotSimulator (robot, grid)
//        let result = Simulator.SimulateWithRobot program importedModules runner

        //let t = time (fun () -> Simulator.SimulateWithRobot program importedModules runner |> ignore) 10
        //printfn "Time with robot: %.3f" t

        let numIter = 50

        let t = time (fun () -> Simulator.SimulateWithoutRobot program importedModules |> ignore) numIter
        printfn "Original:  %.3f" t

        let t = time (fun () -> Simulator.SimulateWithoutRobotOptimized program importedModules |> ignore) numIter
        printfn "Optimized: %.3f" t

//        let numIter = 3

//        let t = time (fun () ->
//                        let grid = GridStateTracker Seq.empty
//                        let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
//                        let runner = BasicImperativeRobotSimulator (robot, grid)
//                        Simulator.SimulateWithRobot program importedModules runner |> ignore) numIter
//        printfn "Original with Robot: %.3f" t
//
//        let t = time (fun () ->
//                        let grid2 = GridStateTracker2 Seq.empty
//                        let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
//                        let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
//                        Simulator.SimulateWithRobot2 program importedModules runner2 |> ignore) numIter
//        printfn "Grid as Map with Robot: %.3f" t

//        let commands = Simulator.SimulateWithoutRobotOptimized program importedModules
//        let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
//        let grid2 = GridStateTracker2 Seq.empty
//        let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
//        let deltaOption = (runner2 :> Robot.IRobotSimulator2).GetDelta (List.ofArray commands)
//        System.Diagnostics.Debug.Assert(deltaOption.IsSome);
//        System.Diagnostics.Debug.Assert(deltaOption.Value :? BasicWorldStateDelta);
//        let delta = deltaOption.Value :?> BasicWorldStateDelta
//        let startState = {Robot={Position=IntVec3.Zero; Direction=IntVec3.UnitZ}; Grid=(GridStateTracker2 Seq.empty).CurrentState}:BasicWorldState2
//        let t = time (fun () ->
//                        for i = 1 to 10 do
//                            for command in commands do
//                                (runner2 :> Robot.IRobotSimulator2).Execute command) numIter
//        printfn "Execute every command 10 times: %.3f" t
//        let t = time (fun () ->
//                        let mutable state = startState
//                        for i = 1 to 10 do
//                            state <- delta.ApplyTo(state)) numIter
//        printfn "Apply delta 10 times: %.3f" t

//        let grid = GridStateTracker Seq.empty
//        let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
//        let runner = BasicImperativeRobotSimulator (robot, grid)
//        let grid2 = GridStateTracker2 Seq.empty
//        let runner2 = BasicImperativeRobotSimulator2 (robot, grid2)
//
//        let t = time (fun () -> Simulator.SimulateWithRobot program importedModules runner |> ignore) numIter
//        printfn "Simulate unoptimized: %.3f" t
//        let t = time (fun () -> Simulator.SimulateWithRobot3 program importedModules runner2 |> ignore) numIter
//        printfn "Simulate optimized: %.3f" t

//        printfn "Number of states: %d" result.States.Length

    with e ->
        printfn "An error: %A" e.Message
        exit 2

    0 // return an integer exit code
