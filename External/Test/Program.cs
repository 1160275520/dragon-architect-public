using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;

using Hackcraft.Ast;

namespace Hackcraft
{
    class Program
    {
        static void Main(string[] args) {
            var prog = Serialization.LoadFile("../../../../TestData/test2.txt");
            var state = Simulator.CreateState(prog, "Main");
            while (true) {
                Simulator.ExecuteStep(prog, state);
                Debug.WriteLine(state.LastExecuted);
            }
        }
    }
}
