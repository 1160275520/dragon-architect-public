using UnityEngine;
using Hackcraft.Ast;

public class TLCall : MonoBehaviour
{
	void Start() {
        GetComponent<AllTheGUI>().CurrentMessage = "The <b>Call</b> statement does a thing, blah blah. Use the call statement.";
        var progman = GetComponent<ProgramManager>();
        progman.SetIsEditable("F1", false);
        foreach (var p in progman.AvailableProcedures) progman.Manipulator.ClearProcedure(p);
	}

    void Update() {

        var progman = GetComponent<ProgramManager>();
        if (progman.IsRunning && !progman.IsExecuting && WinPredicate()) {
            GetComponent<AllTheGUI>().CurrentMessage = "Yay, you win!";
        }

    }

    private bool WinPredicate() {
        var program = GetComponent<ProgramManager>().Manipulator.Program;

        bool isCall = false;

        Imperative.iterStatementPA(program.Procedures["MAIN"], (s) => {
            if (s.Stmt.IsCall) {
                isCall = true;
            }
        });

        return isCall;
    }
}
