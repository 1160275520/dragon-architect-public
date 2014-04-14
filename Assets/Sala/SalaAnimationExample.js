#pragma strict

var faceTex:Texture[];

private var mesh:Transform;

private var animState:int=0;
private var animCounter:float=0.0;


function Awake () {
	mesh=transform.Find("BONE_Body_0");
}

function Update () {
	animCounter+=Time.deltaTime;
	
	
	if(animState==0){
		if(animCounter>=2.0){
			//after 2 seconds, Sala starts his cheering animation
		
			animation.CrossFade("sala_Cheer_Start",0.2);
			
			//this "setFace" function will change Sala's facial expression.
			setFace(3);
			
			animState++;
			animCounter=0.0;
			
		}
	}
	
	
	if(animState==1){
		if(animCounter>=0.6){
			//the animation then cross fades into the cheering animation loop.
			//this part of the animation can loop indefinately.
		
			animation.CrossFade("sala_Cheer_Loop",0.15);
			setFace(4);
			
			animState++;
			animCounter=0.0;
		}
	}
	
	
	if(animState==2){
		if(animCounter>=2.6){
			//the ending section of the animation then plays, to help blend the cheering back into swimming.
		
			animation.CrossFade("sala_Cheer_End",0.05);
			setFace(3);
			
			animState++;
			animCounter=0.0;
		}
	}
	
	if(animState==3){
		if(animCounter>=0.55){
			//finally, the animation cross fades back to the standard swimming animation.
			
			animation.CrossFade("sala_Swim",0.2);
			setFace(0);
			
			animState++;
			animCounter=0.0;
		}
	}
}


private function setFace(newFace:int){
	//Sala's facial expressions are stored in an Array of Textures called "faceTex".
	//The material for Sala's face is stored on "BONE_Body_0", which was defined in the Awake function.
	mesh.renderer.materials[0].mainTexture=faceTex[newFace];
}