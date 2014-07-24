namespace Hackcraft

type EditMode =
| Workshop = 0
| Persistent = 1

type RunState =
| Stopped = 0
| Executing = 1
| Paused = 2
| Finished = 3

// HACK this should really just give back the commands and will break once there are multiple robots.
// But for now it will suffice.
type LazyProgramRunner (program, grid:GridStateTracker, robot:Robot.IRobot) =

    let simulator = Simulator.LazySimulator program
    let initialState : Simulator.StepState = {Command=null; LastExecuted=[]; Robot=robot.Clone; Grid=grid.CurrentState}
    let mutable lastStep = initialState

    member x.InitialState = initialState

    member x.IsDone = simulator.IsDone

    member x.UpdateOneStep () : Simulator.StepState =
        let step = simulator.Step ()
        robot.Execute grid step.Command
        lastStep <- {Command=step.Command; LastExecuted=step.LastExecuted; Robot=robot.Clone; Grid=grid.CurrentState}
        lastStep
