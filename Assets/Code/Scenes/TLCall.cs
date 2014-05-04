using UnityEngine;

public class TLCall : MonoBehaviour
{
	void Start ()
    {
        GetComponent<AllTheGUI>().CurrentMessage = "Bacon ipsum dolor sit amet pork jowl short ribs spare ribs. Frankfurter kevin andouille porchetta tri-tip. Salami jowl venison chuck doner pig andouille tail meatloaf short loin tongue pork belly sausage t-bone. T-bone tail cow, leberkas ball tip shankle tenderloin turkey ribeye venison landjaeger spare ribs pig. Sausage shankle bresaola meatloaf. Hamburger tri-tip shoulder spare ribs jerky beef leberkas tongue kevin shank landjaeger short loin pastrami filet mignon swine.";
        GetComponent<ProgramManager>().SetIsEditable("F1", false);
	}	
}
