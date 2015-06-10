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

type TestType =
| Single = 0
| Jump = 1

[<EntryPoint>]
let main argv =
    let filename =
        try
            argv.[1]
        with _ ->
            printfn "Usage: ProgramRunner <test> <filename>\nRuns the program pointed to by filename."
            exit 1

    let testType =
        try
            Util.parseEnum<TestType> argv.[0]
        with _ ->
            printfn "Usage: ProgramRunner <test> <filename>\nRuns the program pointed to by filename."
            exit 1

    printfn "path: %s" (assemblyPath ())
    let stdlibPath = System.IO.Path.Combine (assemblyPath (), "../../../../unity/Assets/Resources/module/stdlib.txt")

    try
        let importedModules = Simulator.import (Parser.Parse (System.IO.File.ReadAllText stdlibPath, "stdlib"))
        let text = System.IO.File.ReadAllText filename
        let program = Parser.Parse (text, filename)
        let start: CanonicalWorldState = {Robot={Position=IntVec3.Zero; Direction=IntVec3.UnitZ}; Grid=Map.empty}

        let numSamples = 2
        let foo = System.Collections.Generic.List (10000000)

        let numStates =
            let runner = Debugger.makeSimulator (HashTableGrid ()) start
            Simulator.ExecuteToEnd program runner importedModules |> ignore
            runner.NumberOfCommandsExecuted

        printf "Num States: %d\n" numStates
        let deltaStateCount = RMath.floori ((float numStates) / 50.0)

        let test name f =
            let t = time f numSamples
            printf "%s\t%.3f\n" name t

        match testType with
        | TestType.Single ->

            let runToEnd grid =
                let runner = Debugger.makeSimulator grid start
                Simulator.ExecuteToEnd program runner importedModules |> (fun s -> foo.Add s.Robot.Position.X)

            test "StandardHT" (fun () -> runToEnd (HashTableGrid ()))
            test "StandardTM" (fun () -> runToEnd (TreeMapGrid ()))
            test "Cached" (fun () ->
                let cache = Simulator.MutableDict ()
                let initGrid = start.Grid |> Map.map (fun k v -> (v,{Robot.Command.Name="block"; Robot.Command.Args=[v:>obj]}))
                let initState () : BasicWorldState3 = {Robot=start.Robot; Grid=System.Collections.Generic.Dictionary initGrid}
                do Simulator.RunOptimized37 program importedModules Debugger.stateFunctions2 cache (initState ()) |> (fun s -> foo.Add s.Grid.Count)
            )

            ()

        | TestType.Jump ->

            let random = System.Random 387234678
            let jumps = Array.init 100 (fun _ -> random.Next numStates)

            let initData = {Program=program; BuiltIns=importedModules; State=start}

            let numJumps = 99

            let jumpTest (debugger:#IDebugger) =
                for i = 0 to numJumps do
                    let n = jumps.[i]
                    debugger.JumpToState n
                    foo.Add debugger.CurrentStateIndex

            if numStates < 10000 then
                test "Naive HT" (fun () -> jumpTest (WorkshopDebugger (initData, HashTableGrid (), None)))
            if numStates < 100000 then
                test "Naive TM" (fun () -> jumpTest (WorkshopDebugger (initData, TreeMapGrid (), None)))

            let checkpointTest vals gridName gridFn =
                for i in vals do
                    test (sprintf "Chk%3d %s" i gridName) (fun () -> jumpTest (CheckpointingWorkshopDebugger (initData, gridFn (), max (numStates / i) 1, None)))

            checkpointTest [100; 500;] "HT" (fun () -> HashTableGrid ())
            checkpointTest [100; 500;] "TM" (fun () -> TreeMapGrid ())

            test "Cache" (fun () -> jumpTest (CachingWorkshopDebugger (initData, None)))

        | _ -> invalidOp ""

    with e ->
        printfn "An error: %A" e.Message
        printfn "%O" e.StackTrace
        exit 2

    0 // return an integer exit code
