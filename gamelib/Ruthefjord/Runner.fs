namespace Ruthefjord

// HACK this should really just give back the commands and will break once there are multiple robots.
// But for now it will suffice.
type LazyProgramRunner (program, builtIns, initialGrid:GridStateTracker, initialRobot:Robot.IRobot) =

    let MAX_ITER = 20000

    let robot = initialRobot.Clone
    let simulator = Simulator.LazySimulator (program, builtIns)
    let initialState : Simulator.StepState = {Command=null; LastExecuted=[]; Robot=robot.Clone; Grid=initialGrid.CurrentState}
    let mutable lastStep = initialState
    let mutable numSteps = 0

    member x.InitialState = initialState

    member x.IsDone = simulator.IsDone || numSteps >= MAX_ITER

    member x.UpdateOneStep (grid:GridStateTracker) : Simulator.StepState =
        let step = simulator.Step ()
        robot.Execute grid step.Command
        lastStep <- {Command=step.Command; LastExecuted=step.LastExecuted; Robot=robot.Clone; Grid=grid.CurrentState}
        numSteps <- numSteps + 1
        lastStep
