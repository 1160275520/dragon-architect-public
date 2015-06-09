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

        let numSamples = 5
        let foo = System.Collections.Generic.List (10000000)

        let numStates =
            let runner = Debugger.makeSimulator (HashTableGrid ()) start
            Simulator.ExecuteToEnd program runner importedModules |> ignore
            runner.NumberOfCommandsExecuted

        printf "Num States: %d\n" numStates
        let deltaStateCount = RMath.floori ((float numStates) / 50.0)

        let test name f =
            let t = time f numSamples
            printf "%s: %.3f\n" name t

        match testType with
        | TestType.Single ->

            let runToEnd grid =
                let runner = Debugger.makeSimulator (HashTableGrid ()) start
                Simulator.ExecuteToEnd program runner importedModules |> (fun s -> foo.Add s.Grid.Length)

            test "ToEnd HT" (fun () -> runToEnd (HashTableGrid ()))
            test "ToEnd TM" (fun () -> runToEnd (TreeMapGrid ()))
            test "ToEnd OP" (fun () ->
                let cache = Simulator.MutableDict ()
                let initGrid = start.Grid |> Map.map (fun k v -> (v,{Robot.Command.Name="block"; Robot.Command.Args=[v:>obj]}))
                let initState () : BasicWorldState3 = {Robot=start.Robot; Grid=System.Collections.Generic.Dictionary initGrid}
                do Simulator.RunOptimized37 program importedModules Debugger.stateFunctions2 cache (initState ()) |> (fun s -> foo.Add s.Grid.Count)
            )

            ()

        | TestType.Jump ->
            let initData = {Program=program; BuiltIns=importedModules; State=start}

            let numJumps = 99

            let jumpTest (debugger:#IDebugger) =
                for i = 0 to numJumps do
                    let n = RMath.floori (((float i) / (float numJumps)) * (float (numStates - 1)))
                    debugger.JumpToState n
                    foo.Add debugger.CurrentStateIndex

            if numStates < 10000 then
                test "Naive  HT" (fun () -> jumpTest (WorkshopDebugger (initData, HashTableGrid (), None)))
                test "Naive  TM" (fun () -> jumpTest (WorkshopDebugger (initData, TreeMapGrid (), None)))
            if numStates < 300000 then
                test "Chk20  HT" (fun () -> jumpTest (CheckpointingWorkshopDebugger (initData, HashTableGrid (), 20, None)))
                test "Chk20  TM" (fun () -> jumpTest (CheckpointingWorkshopDebugger (initData, TreeMapGrid (), 20, None)))
                test "Chk40  HT" (fun () -> jumpTest (CheckpointingWorkshopDebugger (initData, HashTableGrid (), 40, None)))
                test "Chk40  TM" (fun () -> jumpTest (CheckpointingWorkshopDebugger (initData, TreeMapGrid (), 40, None)))
            test "Chk60  HT" (fun () -> jumpTest (CheckpointingWorkshopDebugger (initData, HashTableGrid (), 60, None)))
            test "Chk60  TM" (fun () -> jumpTest (CheckpointingWorkshopDebugger (initData, TreeMapGrid (), 60, None)))
            test "Chk80  HT" (fun () -> jumpTest (CheckpointingWorkshopDebugger (initData, HashTableGrid (), 80, None)))
            test "Chk80  TM" (fun () -> jumpTest (CheckpointingWorkshopDebugger (initData, TreeMapGrid (), 80, None)))
            test "Chk100 HT" (fun () -> jumpTest (CheckpointingWorkshopDebugger (initData, HashTableGrid (), 100, None)))
            test "Chk100 TM" (fun () -> jumpTest (CheckpointingWorkshopDebugger (initData, TreeMapGrid (), 100, None)))
            test "Chk120 HT" (fun () -> jumpTest (CheckpointingWorkshopDebugger (initData, HashTableGrid (), 120, None)))
            test "Chk120 TM" (fun () -> jumpTest (CheckpointingWorkshopDebugger (initData, TreeMapGrid (), 120, None)))
            test "Cache    " (fun () -> jumpTest (CachingWorkshopDebugger (initData, None)))

        | _ -> invalidOp ""

    with e ->
        printfn "An error: %A" e.Message
        printfn "%O" e.StackTrace
        exit 2

    0 // return an integer exit code
