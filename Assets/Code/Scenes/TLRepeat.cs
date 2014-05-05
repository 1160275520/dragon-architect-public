using UnityEngine;
using Hackcraft.Ast;

public class TLRepeat : MonoBehaviour
{
	void Start() {
        GetComponent<AllTheGUI>().CurrentMessage = "The <b>Repeat</b> statement does a thing, blah blah. Use the <b>Repeat</b> statement.";
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

        bool isRepeat = false;

        Imperative.iterStatementPA(program.Procedures["MAIN"], (s) => {
            if (s.Stmt.IsRepeat) {
                isRepeat = true;
            }
        });

        return isRepeat;
    }
}
