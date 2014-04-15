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
            var prog = new Imperative.Program(Library.Builtins);
            var str = Json.Format(Serialization.JsonOfProgram(prog));
            Debug.WriteLine(str);
            var nprog = Serialization.ProgramOfJson(Json.Parse(str));
            Debug.WriteLine(Json.Format(Serialization.JsonOfProgram(nprog)));
        }
    }
}
