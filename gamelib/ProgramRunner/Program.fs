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
    // run it twice to trigger the JIT
    fn ()
    fn ()
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

        let numSamples = 5
        let foo = System.Collections.Generic.List (10000000)

        let numStates =
            let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
            let runner = BasicRobotSimulator (HashTableGrid (), robot)
            Simulator.ExecuteToEnd program runner importedModules |> ignore
            runner.NumberOfCommandsExecuted

        printf "Num States: %d\n" numStates
        let deltaStateCount = RMath.floori ((float numStates) / 50.0)

        let ns2 =
            let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
            let runner = BasicRobotSimulator (TreeMapGrid (), robot)
            Simulator.CollectEveryNStates program runner importedModules deltaStateCount None |> (fun s -> s.Length)
        printf "NS2: %d\n" ns2

//        let t =
//            time (fun () ->
//                let grid = GridStateTracker Seq.empty
//                let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
//                let runner = BasicImperativeRobotSimulator (robot, grid)
//                Simulator.SimulateWithRobot program importedModules runner |> (fun s -> foo.Add s.States.Length)
//            ) numSamples
//        printfn "Simulate unoptimized HTB ALL: %.3f" t
//        let t =
//            time (fun () ->
//                let grid = GridStateTracker Seq.empty
//                let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
//                let runner = BasicImperativeRobotSimulator (robot, grid)
//                Simulator.SimulateWithRobotLastSateOnly program importedModules runner |> (fun s -> foo.Add (if s.Command = null then 1 else 0))
//            ) numSamples
//        printfn "Simulate unoptimized HTB LSO: %.3f" t
        let t =
            time (fun () ->
                let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
                let runner = BasicRobotSimulator (HashTableGrid (), robot)
                Simulator.ExecuteToEnd program runner importedModules |> (fun s -> foo.Add s.Grid.Length)
            ) numSamples
        printfn "Simulate unoptimized HT2 LSO: %.3f" t
        let t =
            time (fun () ->
                let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
                let runner = BasicRobotSimulator (HashTableGrid (), robot)
                Simulator.CollectEveryNStates program runner importedModules deltaStateCount None |> (fun s -> foo.Add s.Length)
            ) numSamples
        printfn "Simulate unoptimized HT2 50x: %.3f" t
//        let t =
//            time (fun () ->
//                let grid = GridStateTracker2 Seq.empty
//                let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
//                let runner = BasicImperativeRobotSimulator2 (robot, grid)
//                Simulator.SimulateWithRobot2 program importedModules runner |> (fun s -> foo.Add s.States.Length)
//            ) numSamples
//        printfn "Simulate unoptimized MAP ALL: %.3f" t
//        let t =
//            time (fun () ->
//                let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
//                let runner = BasicRobotSimulator (TreeMapGrid (), robot)
//                Simulator.CollectAllStates program runner importedModules None |> (fun s -> foo.Add s.Length)
//            ) numSamples
//        printfn "Simulate unoptimized MP2 ALL: %.3f" t
//        let t =
//            time (fun () ->
//                let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
//                let runner = BasicRobotSimulator (TreeMapGrid (), robot)
//                Simulator.CollectEveryNStates program runner importedModules deltaStateCount None |> (fun s -> foo.Add s.Length)
//            ) numSamples
//        printfn "Simulate unoptimized MP2 50x: %.3f" t
//        let t =
//            time (fun () ->
//                let grid = GridStateTracker2 Seq.empty
//                let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
//                let runner = BasicImperativeRobotSimulator2 (robot, grid)
//                Simulator.SimulateWithRobot2LastStateOnly program importedModules runner |> (fun s -> foo.Add (s :?> BasicWorldState2).Robot.Position.X)
//            ) numSamples
//        printfn "Simulate unoptimized MAP LSO: %.3f" t
//        let t =
//            time (fun () ->
//                let cache = Simulator.Dict ()
//                let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
//                let initState: BasicWorldState2 = {Robot=robot; Grid=Map.empty}
//                Simulator.RunOptimized37 program importedModules Debugger.stateFunctionsNoOp cache initState |> (fun s -> foo.Add s.Robot.Position.X)
//            ) numSamples
//        printfn "Simulate optimized NOP: %.3f" t
//        let t = time (fun () ->
//            let cache = Simulator.Dict ()
//            let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
//            let initState: BasicWorldState2 = {Robot=robot; Grid=Map.empty}
//            Simulator.RunOptimized37 program importedModules Debugger.stateFunctions cache initState |> ignore) numSamples
//        printfn "Simulate optimized MAP: %.3f" t

        let t =
            time (fun () ->
                let cache = Simulator.MutableDict ()
                let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
                let initState: BasicWorldState3 = {Robot=robot; Grid=System.Collections.Generic.Dictionary()}
                Simulator.RunOptimized37 program importedModules Debugger.stateFunctions2 cache initState |> (fun s -> foo.Add s.Robot.Position.X)
            ) numSamples
        printfn "Simulate optimized HTB: %.3f" t

        let t =
            time (fun () ->
                let cache = Simulator.MutableDict ()
                let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
                let initState () : BasicWorldState3 = {Robot=robot; Grid=System.Collections.Generic.Dictionary()}
                for i = 1 to 50 do
                    Simulator.RunOptimized37 program importedModules Debugger.stateFunctions2 cache (initState ()) |> (fun s -> foo.Add s.Robot.Position.X)
            ) numSamples
        printfn "Simulate opt x50 HTB: %.3f" t

        let t =
            time (fun () ->
                let cache = Simulator.MutableDict ()
                let robot:BasicRobot = {Position=IntVec3.Zero; Direction=IntVec3.UnitZ}
                let initState () : BasicWorldState3 = {Robot=robot; Grid=System.Collections.Generic.Dictionary()}
                for i = 1 to 50 do
                    let n = RMath.floori (((float i) / 50.0) * (float (numStates - 1)))
                    Simulator.RunToState program importedModules Debugger.stateFunctions2 cache (initState ()) n |> (fun s -> foo.Add s.Robot.Position.X)
            ) numSamples
        printfn "Simulate jump x50 HTB: %.3f" t

        System.IO.File.WriteAllText("temp.txt", (List.ofSeq foo).ToString())

    with e ->
        printfn "An error: %A" e.Message
        exit 2

    0 // return an integer exit code
