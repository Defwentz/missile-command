// everything got 2 sets, first one contains triangles, second one contains ellipsoids
var selectedIds = [-1, -1];
var movSpeed = 0.05;
var rotSpeed = 0.5;
var modelSelection = 1;

// part4-part7
// with code taken from solution to prog2
function setupListener() {
	
	function selectScale(obj) {
		obj.highlight = true;
	}

	function deselectScale(obj) {
		obj.highlight = false; 
	}
	function selectTranslate(x, y, z) {
		for(var i = 0; i < selectedIds.length; i++) {
			var id = selectedIds[i];
			if(id != -1) {
				var obj = objs[i][id];
				vec3.add(obj.translation, obj.translation, vec3.fromValues(x, y, z));
			}
		}
	}
	function selectRotate(rad, axis) {
		for(var i = 0; i < selectedIds.length; i++) {
			var id = selectedIds[i];
			if(id != -1) {
				var obj = objs[i][id];
				var newRotation = mat4.create();

	            mat4.fromRotation(newRotation,rad,axis); // get a rotation matrix around passed axis
	            vec3.transformMat4(obj.xAxis,obj.xAxis,newRotation); // rotate model x axis tip
	            vec3.transformMat4(obj.yAxis,obj.yAxis,newRotation); // rotate model y axis tip
			}
		}
	}
	
	function nextId(which, isLeft) {
		var id = which;
		if(isLeft == 1) {
			if(selectedIds[id] != -1) {
				deselectScale(objs[id][selectedIds[id]]);
				selectedIds[id]--;
				if(selectedIds[id] == -1) selectedIds[id] = objs[id].length-1;
			} else {
				selectedIds[id] = 0;
			}
		} else {
			if(selectedIds[id] != -1) {
				deselectScale(objs[id][selectedIds[id]]);
				selectedIds[id] = (++selectedIds[id])%(objs[id].length);
			} else {
				selectedIds[id] = 0;
			}
		}
		selectScale(objs[id][selectedIds[id]]);
	}
	
	document.addEventListener('keydown', function(event) {
		switch (event.keyCode) {
		// part 4 interactively change view
		case 65:
			if(isCapsLockOn(event)) {
				//  rotate view left and right around view Y (yaw)
				console.log('A');
			} else {
				// translate view left and right along view X
				console.log('a');
				Eye = vec3.add(Eye,Eye,vec3.scale(temp,viewRight,-movSpeed));
			}
			Center = vec3.add(Center,Center,vec3.scale(temp,viewRight,-movSpeed));
			break;
		case 68:
			if(isCapsLockOn(event)) {
				//  rotate view left and right around view Y (yaw)
				console.log('D');
			} else {
				// translate view left and right along view X
		        console.log('d');
				Eye = vec3.add(Eye,Eye,vec3.scale(temp,viewRight,movSpeed));
			}
			Center = vec3.add(Center,Center,vec3.scale(temp,viewRight,movSpeed));
			break;
		case 87:
			if(isCapsLockOn(event)) {
				// rotate view forward and backward around view X (pitch)
				console.log('W');
				Center = vec3.add(Center,Center,vec3.scale(temp,LookUp,movSpeed));
				LookUp = vec3.cross(LookUp,viewRight,vec3.subtract(LookAt,Center,Eye)); /* global side effect */
			} else {
				// translate view forward and backward along view Z
		        console.log('w');
				Eye = vec3.add(Eye,Eye,vec3.scale(temp,LookAt,movSpeed));
				Center = vec3.add(Center,Center,vec3.scale(temp,LookAt,movSpeed));
			}
			break;
		case 83:
			if(isCapsLockOn(event)) {
				// rotate view forward and backward around view X (pitch)
				console.log('S');
				Center = vec3.add(Center,Center,vec3.scale(temp,LookUp,-movSpeed));
				LookUp = vec3.cross(LookUp,viewRight,vec3.subtract(LookAt,Center,Eye)); /* global side effect */
			} else {
				// translate view forward and backward along view Z
		        console.log('s');
				Eye = vec3.add(Eye,Eye,vec3.scale(temp,LookAt,-movSpeed));
				Center = vec3.add(Center,Center,vec3.scale(temp,LookAt,-movSpeed));
			}
			break;
		case 81:
			if(isCapsLockOn(event)) {
				console.log('Q');
				LookUp = vec3.normalize(LookUp,vec3.add(LookUp,LookUp,vec3.scale(temp,viewRight,-movSpeed)));
			} else {
		        console.log('q');
				Eye = vec3.add(Eye,Eye,vec3.scale(temp,LookUp,movSpeed));
				Center = vec3.add(Center,Center,vec3.scale(temp,LookUp,movSpeed));
			}
			break;
		case 69:
			if(isCapsLockOn(event)) {
				console.log('E');
				LookUp = vec3.normalize(LookUp,vec3.add(LookUp,LookUp,vec3.scale(temp,viewRight,movSpeed)));
			} else {
		        console.log('e');
				Eye = vec3.add(Eye,Eye,vec3.scale(temp,LookUp,-movSpeed));
				Center = vec3.add(Center,Center,vec3.scale(temp,LookUp,-movSpeed));
			}
			break;
			
		// part 6 Interactively change lighting on a model
		case 66:
			// toggle from blinn-phong to phone
			console.log('b');
	        modelSelection = 1 - modelSelection;
			break;
		case 78:
			// increase specular integer exponent
			console.log('n');
			for(var i = 0; i < selectedIds.length; i++) {
				var id = selectedIds[i];
				if(id != -1) {
					var obj = objs[i][id];
					obj.n = (++obj.n)%21;
				}
			}
			break;
		case 49:
			// increase the ambient weight
			console.log('1');
			for(var i = 0; i < selectedIds.length; i++) {
				var id = selectedIds[i];
				if(id != -1) {
					var obj = objs[i][id];
					obj.ambientWeight += 0.1;
					if(obj.ambientWeight >= 1.0) {
						obj.ambientWeight = 0.0
					}
				}
			}
			break;
		case 50:
			// increase the diffuse weight
			console.log('2');
			for(var i = 0; i < selectedIds.length; i++) {
				var id = selectedIds[i]
				if(id != -1) {
					var obj = objs[i][id];
					obj.diffuseWeight += 0.1;
					if(obj.diffuseWeight >= 1.0) {
						obj.diffuseWeight = 0.0
					}
				}
			}
			break;
		case 51:
			// increase the specular weight
			console.log('3');
			for(var i = 0; i < selectedIds.length; i++) {
				var id = selectedIds[i];
				if(id != -1) {
					var obj = objs[i][id];
					obj.specularWeight += 0.1;
					if(obj.specularWeight >= 1.0) {
						obj.specularWeight = 0.0
					}
				}
			}
			break;
		
		// part 5 Interactively select a model
		case 32:
			// deselect model
			console.log('space');
			for(var i = 0; i < selectedIds.length; i++) {
				var id = selectedIds[i];
				if(id != -1) {
					var obj = objs[i][id];
					deselectScale(obj);
					selectedIds[i] = -1;
				}
			}
			break;
		case 37:
			// traverse triangles
			console.log('left');
			nextId(0, 1);
			break;
		case 39:
			// traverse triangles
			console.log('right');
			nextId(0, 0);
			break;
		case 38:
			// traverse ellipsoids
			console.log('up');
			nextId(1, 1);
			break;
		case 40:
			// traverse ellipsoids
			console.log('down');
			nextId(1, 0);
			break;
		
		// part 7 Interactively transform models
		case 75:
			if(isCapsLockOn(event)) {
				// rotate selection left and right around view Y (yaw)
				console.log('K');
				selectRotate(-rotSpeed, LookUp);
			} else {
				// translate selection left and right along view X
				console.log('k');
				selectTranslate(+movSpeed, 0.0, 0.0);
			}
			break;
		case 186:
			if(isCapsLockOn(event)) {
				// rotate selection left and right around view Y (yaw)
				console.log(':');
				selectRotate(+rotSpeed, LookUp);
			} else {
				// translate selection left and right along view X
		        console.log(';');
				selectTranslate(-movSpeed, 0.0, 0.0);
			}
			break;
		case 79:
			if(isCapsLockOn(event)) {
				// rotate selection forward and backward around view X (pitch)
				console.log('O');
				selectRotate(+rotSpeed, viewRight);
			} else {
				// translate selection forward and backward along view Z
		        console.log('o');
				selectTranslate(0.0, 0.0, +movSpeed);
			}
			break;
		case 76:
			if(isCapsLockOn(event)) {
				// rotate selection forward and backward around view X (pitch)
				console.log('L');
				selectRotate(-rotSpeed, viewRight);
			} else {
				// translate selection forward and backward along view Z
		        console.log('l');
				selectTranslate(0.0, 0.0, -movSpeed);
			}
			break;
		case 73:
			if(isCapsLockOn(event)) {
				// rotate selection clockwise and counterclockwise around view Z (roll)
				console.log('I');
				selectRotate(+rotSpeed, LookAt);
			} else {
				// translate selection up and down along view Y
		        console.log('i');
				selectTranslate(0.0, +movSpeed, 0.0);
			}
			break;
		case 80:
			if(isCapsLockOn(event)) {
				// rotate selection clockwise and counterclockwise around view Z (roll)
				console.log('P');
				selectRotate(-rotSpeed, LookAt);
			} else {
				// translate selection up and down along view Y
		        console.log('p');
				selectTranslate(0.0, -movSpeed, 0.0);
			}
			break;
		default:
			console.log('irrevelent stuff');
		}
	});
}

// using code from toturial: https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
function resize(canvas) {
  // Lookup the size the browser is displaying the canvas.
  var displayWidth  = document.getElementById('canvasW').value;
  var displayHeight = document.getElementById('canvasH').value;
 
  // Check if the canvas is not the same size.
  if (canvas.width  != displayWidth ||
      canvas.height != displayHeight) {
 
    // Make the canvas the same size
    canvas.width  = displayWidth;
    canvas.height = displayHeight;
  }
}

function refresh() {
	// resize canvas
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it
	
	resize(gl.canvas);
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	
	// adjust speed
	movSpeed = document.getElementById("movSpd").value/100.0;
	rotSpeed = document.getElementById("rotSpd").value/100.0;
}