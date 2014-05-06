using UnityEngine;
using System;
using Hackcraft;

public class TestLevel : MonoBehaviour
{
    Func<bool> winPredicate;

	void Start () {
        var lh = GetComponent<LevelHelper>();
        GetComponent<AllTheGUI>().CurrentMessage = "Bacon ipsum dolor sit amet pork jowl short ribs spare ribs. Frankfurter kevin andouille porchetta tri-tip. Salami jowl venison chuck doner pig andouille tail meatloaf short loin tongue pork belly sausage t-bone. T-bone tail cow, leberkas ball tip shankle tenderloin turkey ribeye venison landjaeger spare ribs pig. Sausage shankle bresaola meatloaf. Hamburger tri-tip shoulder spare ribs jerky beef leberkas tongue kevin shank landjaeger short loin pastrami filet mignon swine.";

        var template = new IntVec3[] {
            new IntVec3(0,0,1),
            new IntVec3(0,0,2),
            new IntVec3(0,0,3),
        };

        lh.CreateBlueprint(template);
        winPredicate = LevelHelper.All(new Func<bool>[] { lh.GameIsRunningButDoneExecuting, lh.CreateBlueprintPredicate(template) });
	}

    void Update() {

        if (winPredicate()) {
            GetComponent<AllTheGUI>().CurrentMessage = "YAYYYYYYYYYYYYYYYYYYYY";
        }
    }
}
