/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
var Eye = new vec4.fromValues(0.5,0.5,-1.5,1.0); // default eye position in world space
var LookAt = new vec4.fromValues(0.0,0.0,1.0,1.0);
var LookUp = new vec4.fromValues(0.0,1.0,0.0,1.0);
var Center = new vec4.fromValues(0.5,0.5,0.5,1.0);

var viewRight = vec3.create()
var temp = vec3.create()
viewRight = vec3.normalize(viewRight,vec3.cross(temp,LookAt,LookUp));

var numberofTri = 30-1; // this many slipt in both direction, for parameterization of ellipsoids

var friendMissileFact = [];
var enemeyMissileFact = null;

var suggestScreen = null;
var goodjobScreen = null;
var strategicCoords = [];
var missiles = [[],[],[],[]];
var buildings = [];
var friendMissileNum = 20;
var enemyAtkNum = [1,3,3,10,20,3];
var enemyAtkTurn = 0;
var friendMissileSpd = 0.008;
var enemeyMissileSpd = 0.003;

function loadTexture(url) {
	var texture = gl.createTexture();
	texture.img = new Image(); 
    texture.img.crossOrigin = "Anonymous";
	texture.img.onload = function() {
		handleLoadedTexture(texture);
	}
    texture.img.src = url;
	return texture
}

// code from https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
function handleLoadedTexture(texture) {
	var img = texture.img
	gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.img);
	
	if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
       // Yes, it's a power of 2. Generate mips.
       gl.generateMipmap(gl.TEXTURE_2D);
    } else {
       // No, it's not a power of 2. Turn of mips and set
       // wrapping to clamp to edge
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
}

// set up the webGL environment
function setupWebGL() {
	
	// var pMatrix = mat4.create(); // projection matrix
	//     var vMatrix = mat4.create(); // view matrix
	//     var mMatrix = mat4.create(); // model matrix
	//     var pvMatrix = mat4.create(); // hand * proj * view matrices
	//     var pvmMatrix = mat4.create(); // hand * proj * view * model matrices
	//
	// mat4.identity(pMatrix);
	// var fov = Math.PI/4;
	// var ratio = 512/512.0;
	// var near = 0.1;
	// var far = 10.0;
	// mat4.perspective(pMatrix, fov, ratio, near, far);
	//
	// var lookat = mat4.create();
	// mat4.lookAt(lookat, Eye, Center, LookUp);
	// mat4.mul(pMatrix, pMatrix, lookat);
	
    // Get the canvas and context
	var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it
	
	canvas.addEventListener("click", function( event ) {
		if(gamestate == 1) {
		    // display the current click count inside the clicked div
		    event.target.textContent = "click count: " + event.detail;
			var screenCoord = getMousePosition(event, canvas);
			//console.log(screenCoord);
			screenCoord.x = (canvas.width - screenCoord.x) / canvas.width;
			screenCoord.y = (canvas.height - screenCoord.y) / canvas.height;
			//
			// // double x = 2.0 * winX / clientWidth - 1;
			// //         double y = - 2.0 * winY / clientHeight + 1;
			//     var viewProjectionInverse = mat4.create();
			// mat4.invert(viewProjectionInverse, pMatrix);
			//
			// var coord = vec4.fromValues(screenCoord.x, screenCoord.y, 0,0);
			// mat4.mul(coord, viewProjectionInverse, coord);
			console.log(screenCoord);
			launchMissile(screenCoord, friendMissileSpd);
		}
	}, false);
  
    try {
      if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
      } else {
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
		//gl.disable(gl.DEPTH_TEST);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      }
    } // end try
    
    catch(e) {
      console.log(e);
    } // end catch
} // end setupWebGL

// read triangles and ellipsoids in, load them into webgl buffers
function loadBasic() {
    var inputBasic = getJSONFile(INPUT_BASIC_URL,"basic");
	
	var objOffset = 0;
    var whichSetVert; // index of vertex in current triangle set
    var whichSetTri; // index of triangle in current triangle set
    var vtxBufferSize = 0; // the number of vertices in the vertex buffer
    var vtxToAdd = []; // vtx coords to add to the coord array
    var triToAdd = vec3.create(); // tri indices to add to the index array
	
    if (inputBasic != String.null) { 
        
        for (var whichSet=0; whichSet<inputBasic.length; whichSet++) {
			var object = inputBasic[whichSet]
			object.length = 0
			
			var center = vec3.create();
			for(i=0; i< object.vertices.length; i++) {
				vtxToAdd = object.vertices[i];
				vec3.add(center, center, vec3.fromValues(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]));
			}
			vec3.scale(center, center, 1./object.vertices.length);
			
			for(i=0; i < object.coords.length; i++) {
				var obj = new GlObject(object.material.ambient,
								object.material.diffuse,
								object.material.specular,
								object.material.n,
								center);
				if (object.material.texture == "none") {
					
				} else {
					obj.textureURL = INPUT_HEAD_URL + object.material.texture;
					obj.texture = loadTexture(INPUT_HEAD_URL + object.material.texture);
				}
				obj.alpha = object.material.alpha;
				vec3.add(obj.translation, obj.translation, vec3.fromValues(object.coords[i][0], object.coords[i][1], 0));
				objs[0].push(obj);
				objOffset++;
				
				if (whichSet == 0 || whichSet == 2) {
					strategicCoords.push(object.coords[i]);
				}
				if(whichSet == 2) {
					buildings.push(obj)
				} else if(whichSet == 5) {
					suggestScreen = obj;
				} else if (whichSet == 6) {
					goodjobScreen = obj;
				}
			}
			
		    var coordArray = []; // 1D array of vertex coords for WebGL
		    var indexArray = []; // 1D array of vertex indices for WebGL
			var normalArray = [];// 1D array of normal vector for WebGL
			var textArray = [];
			
            // set up the triangle index array, adjusting indices across sets
            for (whichSetTri=0; whichSetTri<object.triangles.length; whichSetTri++) {
				var tri = object.triangles[whichSetTri]
				
				var a = object.vertices[tri[0]];
				var b = object.vertices[tri[1]];
				var c = object.vertices[tri[2]];
				var ab = vec3.create();
				vec3.negate(ab, a);
				vec3.add(ab, ab, b);
				
				var bc = vec3.create();
				vec3.negate(bc, b);
				vec3.add(bc, bc, c);
				
				var normal = vec3.create();
				vec3.cross(normal, ab, bc);
				vec3.normalize(normal, normal);
				
				for (i=0; i<tri.length; i++) {
					vtxToAdd = object.vertices[tri[i]];
					coordArray.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]);
					
					var uv = object.uvs[tri[i]];
					textArray.push(uv[0], uv[1]);
					
					normalArray.push(normal[0], normal[1], normal[2]);
					
					indexArray.push(object.length);
					object.length += 1;
				}
				
				
            } // end for triangles in set
			
			for(i=objOffset-object.coords.length; i < objOffset; i++) {
				var obj = objs[0][i]
				
				if(whichSet == 0) {
					var friendMissileFactA = new GlObjectFactory(
						obj, 
						coordArray,					    
						indexArray,
						normalArray,
						textArray);
					friendMissileFact.push(friendMissileFactA);
				}
				if(i == objOffset-object.coords.length && whichSet == 1) {
					enemeyMissileFact = new GlObjectFactory(
						obj, 
						coordArray,					    
						indexArray,
						normalArray,
						textArray);
				}
				
				obj.triBufferSize += object.triangles.length; // total number of tris
				obj.triBufferSize *= 3;
			    // send the vertex coords to webGL
			    gl.bindBuffer(gl.ARRAY_BUFFER,obj.vertexBuffer); // activate that buffer
			    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coordArray),gl.STATIC_DRAW); // coords to that buffer
    
			    // send the triangle indices to webGL
			    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.triangleBuffer); // activate that buffer
			    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexArray),gl.STATIC_DRAW); // indices to that buffer
	
				gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer); // activate that buffer
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalArray), gl.STATIC_DRAW);
			
			    gl.bindBuffer(gl.ARRAY_BUFFER,obj.textureCoordBuffer); // activate that buffer
			    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(textArray),gl.STATIC_DRAW); // coords to that buffer
			}
        } // end for each triangle set 
		
    } // end if triangles found
	console.log(objs)
} // end load triangles and ellipsoids

function setupEnvironment() {
	for(j = 0; j < friendMissileFact.length; j++) {
		missiles[j].push(friendMissileFact[j].model);
		for(i = 0; i < friendMissileNum-1; i++) {
			var newObj = friendMissileFact[j].createObject();
			if(friendMissileFact[j].model.textureURL != null) {
				newObj.texture = loadTexture(friendMissileFact[j].model.textureURL);
			}
			vec3.add(newObj.translation, newObj.translation, vec3.fromValues(i*0.001,0,i*0.01));
			objs[0].push(newObj);
			missiles[j].push(newObj);
		}
	}
	goodjobScreen.rmFrom(goodjobScreen, objs[0]);
}

function setupEnemyAtk() {
	if(enemyAtkTurn >= enemyAtkNum.length) {
		return;
	}
	if(gametime % 200 == 0) {
		console.log("enemy approach");
		for(i = 0; i < enemyAtkNum[enemyAtkTurn]; i++) {
			var newObj = enemeyMissileFact.createObject();
			if(enemeyMissileFact.model.textureURL != null) {
				newObj.texture = loadTexture(enemeyMissileFact.model.textureURL);
			}
			newObj.translation = vec3.create();
			vec3.add(newObj.translation, newObj.translation, vec3.fromValues(Math.random(),randomDouble(1.5,3),0));

			objs[0].push(newObj);
			missiles[3].push(newObj);
			newObj.target = randomInt(0,strategicCoords.length-1);
			var target = strategicCoords[newObj.target];
			launchMissileAt(newObj, {x:target[0],y:target[1]}, enemeyMissileSpd);
		}
		
		enemyAtkTurn++;
	}
	
	
	// for(i = 0; i < enemyAtkNum; i++) {
	// 	var newObj = enemeyMissileFact.createObject();
	// 	if(enemeyMissileFact.model.textureURL != null) {
	// 		newObj.texture = loadTexture(enemeyMissileFact.model.textureURL);
	// 	}
	// 	newObj.translation = vec3.create();
	// 	vec3.add(newObj.translation, newObj.translation, vec3.fromValues(Math.random(),randomDouble(1.5,7),0));
	//
	// 	objs[0].push(newObj);
	// 	missiles[3].push(newObj);
	// 	newObj.target = randomInt(0,strategicCoords.length-1);
	// 	var target = strategicCoords[newObj.target];
	// 	launchMissileAt(newObj, {x:target[0],y:target[1]}, enemeyMissileSpd);
	// }
}

function getClosestMssile(coord) {
	var whichSpace = (Math.floor(coord.x*3));
	var missile = null;
	for(i = 0; i < missiles[whichSpace].length; i++) {
		if(missiles[whichSpace][i].state == 0) {
			missile = missiles[whichSpace][i];
			return missile;
		}
	}
	if(whichSpace != 1) {
		for(i = 0; i < missiles[1].length; i++) {
			if(missiles[1][i].state == 0) {
				missile = missiles[1][i];
				return missile;
			}
		}
		for(i = 0; i < missiles[3-whichSpace].length; i++) {
			if(missiles[3-whichSpace][i].state == 0) {
				missile = missiles[3-whichSpace][i];
				console.log("fse")
				return missile;
			} 
		}
	} else {
		for(i = 0; i < missiles[0].length; i++) {
			if(missiles[0][i].state == 0) {
				missile = missiles[0][i];
				return missile;
			}
		}
		for(i = 0; i < missiles[2].length; i++) {
			if(missiles[2][i].state == 0) {
				missile = missiles[2][i];
				return missile;
			}
		}
	}
	return null;
}

function launchMissile(coord,spd) {
	launchMissileAt(getClosestMssile(coord), coord,spd);
}

function launchMissileAt(missile, coord, spd) {
	if(missile != null) {
		var dir = vec3.create();
		vec3.copy(dir, missile.actualCenter());
		vec3.sub(dir, vec3.fromValues(coord.x, coord.y, 0), dir);
		vec3.normalize(dir, dir);
		vec3.scale(dir, dir, spd);
		missile.velocity = dir;
		missile.launch(objs[0]);
	}
}

function batteryExplode(which) {
	for(i = 0; i < missiles[which].length; i++) {
		if(missiles[which][i].state == 0) {
			missiles[which][i].state = 2;
			missiles[which][i].rmFrom(missiles[which][i],objs[0]);
		}
	}
}

function checkCollision() {
	for(j = 0; j < missiles[3].length; j++) {
		if(missiles[3][j].state == 1) {
			for(xi = 0; xi < missiles.length-1; xi++) {
				for(xj = 0; xj < missiles[xi].length; xj++) {
					if(missiles[xi][xj].state == 1) {
						var enemyMissileCenter = vec3.clone(missiles[3][j].actualCenter());
						vec3.sub(enemyMissileCenter, enemyMissileCenter, missiles[xi][xj].actualCenter());
						if(vec3.length(enemyMissileCenter) < 0.1) {
							missiles[3][j].rmFrom(missiles[3][j],objs[0]);
							missiles[3][j].state = 2;
							missiles[xi][xj].rmFrom(missiles[xi][xj],objs[0]);
							missiles[xi][xj].state = 2;
						}
					}
				}
			}
			var enemyMissileCenter = vec3.clone(missiles[3][j].actualCenter());
			vec3.sub(enemyMissileCenter, enemyMissileCenter, 
				vec3.fromValues(strategicCoords[missiles[3][j].target][0], 
					strategicCoords[missiles[3][j].target][1], 0));
					
			if(missiles[3][j].target < 3) {
				if(vec3.length(enemyMissileCenter) < 0.1) {
					missiles[3][j].rmFrom(missiles[3][j],objs[0]);
					missiles[3][j].state = 2;
					batteryExplode(missiles[3][j].target);
				}
			} else {
				if(vec3.length(enemyMissileCenter) < 0.2) {
					missiles[3][j].rmFrom(missiles[3][j],objs[0]);
					missiles[3][j].state = 2;
					buildings[missiles[3][j].target-3].rmFrom(buildings[missiles[3][j].target-3],objs[0]);
				}
			}
		}
	}
}

function checkIfOver() {
	if(enemyAtkTurn >= enemyAtkNum.length) {
		for(j = 0; j < missiles[3].length; j++) {
			if(missiles[3][j].state != 2) {
				return;
			}
		}
		objs[0].push(goodjobScreen);
		gamestate = 0;
		
	}
	
	for(j = 0; j < buildings.length; j++) {
		if(buildings[j].state != 2) {
			return;
		}
	}
	objs[0].push(goodjobScreen);
	gamestate = 0;
}

// setup the webGL shaders
function setupShaders() {
    
    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
		uniform mat4 uMVMatrix;
		uniform mat4 upMatrix;
		uniform mat3 uNMatrix;
		
        attribute vec3 aVertexPosition;
		attribute vec3 aVertexNormal;
		attribute vec2 aVertexTextCoord;
		
		varying vec4 vPosition;
		varying vec3 vNormal;
		varying vec2 vTextCoord;

        void main(void) {
			vec4 mvPos = uMVMatrix * vec4(aVertexPosition, 1.0);
            gl_Position = upMatrix * mvPos; // use the untransformed position
			
			vPosition = vec4(aVertexPosition, 1.0);
			vNormal = uNMatrix * aVertexNormal;
			vTextCoord = aVertexTextCoord;
        }
    `;
	
    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
		precision mediump float;
		
		varying vec4 vPosition;
		varying vec3 vNormal;
		varying vec2 vTextCoord;
		
		// you can only use uniform once, apparently
		uniform vec4 uShapeAmbient;
		uniform vec4 uShapeDiffuse;
		uniform vec4 uShapeSpecular;
		uniform float uShapeN;
		
		uniform vec3 uEyePos;
		uniform vec3 uLightPos;
		uniform vec3 uLightAmbi;
		uniform vec3 uLightDiff;
		uniform vec3 uLightSepc;
		
		uniform int uModel;
		
		uniform sampler2D uSampler;
		uniform float uAlpha;
		
        void main(void) {
			
			vec3 vLVec = normalize(uLightPos - vPosition.xyz);
			vec3 vNVec = normalize(vNormal);
			vec3 vVVec = normalize(uEyePos - vPosition.xyz);

			float NdotL = max(dot(vNVec, vLVec), 0.0);
			
			vec3 vHVec = normalize(vVVec + vLVec);
			float NdotH = max(dot(vNVec, vHVec), 0.0);

			// blinn-phong
			vec4 fragColor = uShapeAmbient*vec4(uLightAmbi,1.0) + 
					uShapeDiffuse*vec4(uLightDiff,1.0) * NdotL + 
					uShapeSpecular*vec4(uLightSepc,1.0) * pow(NdotH, uShapeN);
					
			vec4 txtColor = texture2D(uSampler, vec2(vTextCoord.s, vTextCoord.t));
			
			if (uModel == 1) {		// modulate: C = CfCt, A = AfAt
				gl_FragColor = vec4(txtColor.rgb * fragColor.rgb, txtColor.a * uAlpha);
			} else {				// replace: C = Ct, A = At
				gl_FragColor = vec4(txtColor.rgb, txtColor.a);
			}
			
			//
			// if(uModel == 1) {		// blinn-phong
			// 	vec3 vHVec = normalize(vVVec + vLVec);
			// 	float NdotH = max(dot(vNVec, vHVec), 0.0);
			//
			// 	gl_FragColor = uShapeAmbient*vec4(uLightAmbi,1.0)
			// 	+ uShapeDiffuse*vec4(uLightDiff,1.0) * NdotL
			// 	 			+ uShapeSpecular*vec4(uLightSepc,1.0) * pow(NdotH, uShapeN);
			// } else {				// phong
			// 	float LdotN = dot(vLVec, vNVec);
			// 	vec3 vRVec = normalize(2.0*LdotN*vNVec - vLVec);
			// 	float RdotV = max(dot(vRVec, vVVec), 0.0);
			//
			// 	gl_FragColor = uShapeAmbient*vec4(uLightAmbi,1.0)
			// 	+ uShapeDiffuse*vec4(uLightDiff,1.0) * NdotL
			// 	 			+ uShapeSpecular*vec4(uLightSepc,1.0) * pow(RdotV, uShapeN);
			// }
        }
    `;
	
    try {
        // console.log("fragment shader: "+fShaderCode);
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        // console.log("vertex shader: "+vShaderCode);
        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution
            
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);  
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);  
            gl.deleteShader(vShader);
        } else { // no compile errors
            shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
				
                shaderProgram.vertexPositionAttrib = // get pointer to vertex shader input
                    gl.getAttribLocation(shaderProgram, "aVertexPosition"); 
                gl.enableVertexAttribArray(shaderProgram.vertexPositionAttrib); // input to shader from array
				shaderProgram.vertexNormalAttribute = 
					gl.getAttribLocation(shaderProgram, "aVertexNormal");
				gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
				shaderProgram.vertexTextCoordAttribute = 
					gl.getAttribLocation(shaderProgram, "aVertexTextCoord");
				gl.enableVertexAttribArray(shaderProgram.vertexTextCoordAttribute);
				
				shaderProgram.shapeAmbientUniform = gl.getUniformLocation(shaderProgram, "uShapeAmbient");
				shaderProgram.shapeDiffuseUniform = gl.getUniformLocation(shaderProgram, "uShapeDiffuse");
				shaderProgram.shapeSpecularUniform = gl.getUniformLocation(shaderProgram, "uShapeSpecular");
				shaderProgram.shapeNUniform = gl.getUniformLocation(shaderProgram, "uShapeN");
				
				shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
				shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "upMatrix");
				shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
				
				shaderProgram.ModelSelectionUniform = gl.getUniformLocation(shaderProgram, "uModel");
				shaderProgram.eyePosUniform = gl.getUniformLocation(shaderProgram, "uEyePos");
				shaderProgram.lightPosUniform = gl.getUniformLocation(shaderProgram, "uLightPos");
				shaderProgram.lightAmbientUniform = gl.getUniformLocation(shaderProgram, "uLightAmbi");
				shaderProgram.lightDiffuseUniform = gl.getUniformLocation(shaderProgram, "uLightDiff");
				shaderProgram.lightSpecularUniform = gl.getUniformLocation(shaderProgram, "uLightSepc");
				shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
				shaderProgram.alphaUniform = gl.getUniformLocation(shaderProgram, "uAlpha");
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders

function tick() {
	requestAnimFrame(tick);
	if(gamestate == 1) {
		checkIfOver();
		setupEnemyAtk();
		checkCollision();
		gametime++;
	}
	renderScene();
}

function setLightingUniform() {
	// TODO: deal with multiple light sources
	var inputLights = getJSONFile(INPUT_LIGHTS_URL,"lights");
	if(inputLights != String.null) {
		for(var i=0; i<inputLights.length; i++) {
			gl.uniform3f(
			                shaderProgram.lightPosUniform,
			                inputLights[i].x,
			                inputLights[i].y,
			                inputLights[i].z
			            );
			gl.uniform3f(
			                shaderProgram.lightAmbientUniform,
			                inputLights[i].ambient[0],
			                inputLights[i].ambient[1],
			                inputLights[i].ambient[2]
			            );
			gl.uniform3f(
			                shaderProgram.lightDiffuseUniform,
			                inputLights[i].diffuse[0],
			                inputLights[i].diffuse[1],
			                inputLights[i].diffuse[2]
			            );
			gl.uniform3f(
			                shaderProgram.lightSpecularUniform,
			                inputLights[i].specular[0],
			                inputLights[i].specular[1],
			                inputLights[i].specular[2]
			            );
		}
		
	}
}

// render the loaded model
function renderScene() {
	//gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
	
	var pMatrix = mat4.create(); // projection matrix
    var vMatrix = mat4.create(); // view matrix
    var mMatrix = mat4.create(); // model matrix
    var pvMatrix = mat4.create(); // hand * proj * view matrices
    var pvmMatrix = mat4.create(); // hand * proj * view * model matrices

	mat4.identity(pMatrix);
	var fov = Math.PI/4;
	var ratio = 512/512.0;
	var near = 0.1;
	var far = 10.0;
	mat4.perspective(pMatrix, fov, ratio, near, far);
	
	var lookat = mat4.create();
	mat4.lookAt(lookat, Eye, Center, LookUp);
	mat4.mul(pMatrix, pMatrix, lookat);
	
	gl.uniform3f(
	                shaderProgram.eyePosUniform,
	                Eye[0],
	                Eye[1],
	                Eye[2]
	            );
	gl.uniform1i(
	                shaderProgram.ModelSelectionUniform,
	                modelSelection
	            );
	
	var flattened = objs.reduce((a, b) => a.concat(b), []);
	Eye.xyz = vec3.fromValues(Eye[0], Eye[1], Eye[2]);
	
	var opaques = [];
	var transparents = [];

	for(var i = 0; i < flattened.length; i++) {
		if(flattened[i].alpha >= 1.0) {
			opaques.push(flattened[i]);
		} else {
			transparents.push(flattened[i]);
		}
	}

	transparents.sort(function (a, b) {
		return b.depth(Eye.xyz) - a.depth(Eye.xyz);
	});
	
	gl.depthMask(true);
	for(var i = 0; i < opaques.length; i++) {
		renderobj(opaques[i], pMatrix);
	}
	gl.depthMask(false);
	for(var i = 0; i < transparents.length; i++) {
		renderobj(transparents[i], pMatrix);
	}

	// for(var j = 0; j < objs.length; j++) {
	// 	for(var i = 0; i < objs[j].length; i++) {
	// 		var obj = objs[j][i]
	//
	// 		renderobj(obj, pMatrix)
	// 	}
	// }
} // end render triangles

function renderobj(obj, pMatrix) {
	if(gamestate == 1) {
		obj.run();
	}
	obj.doTransform();
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, obj.mMatrix);
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);

	var nMatrix = mat3.create();
	mat3.normalFromMat4(nMatrix, obj.mMatrix);
	gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
	
	obj.setMaterialUniform(shaderProgram.shapeAmbientUniform,
						shaderProgram.shapeDiffuseUniform,
						shaderProgram.shapeSpecularUniform,
						shaderProgram.shapeNUniform,
						shaderProgram.alphaUniform);
	
    // vertex buffer: activate and feed into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,obj.vertexBuffer); // activate
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed

	gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, obj.textureCoordBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexTextCoordAttribute, 2, gl.FLOAT, false, 0, 0);

	gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, obj.texture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    // triangle buffer: activate and render
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,obj.triangleBuffer); // activate
    gl.drawElements(gl.TRIANGLES,obj.triBufferSize,gl.UNSIGNED_SHORT,0); // render
}

/* MAIN -- HERE is where execution begins after window load */

function main() {
  setupListener();
  setupWebGL(); // set up the webGL environment
  dummy = loadTexture("http://defwentz.github.io/assets/dummy.png");
  dummy.img.onload = function() {
  	handleLoadedTexture(dummy);
    loadBasic(); // load in the triangles and ellipsoids from files
	pauseGame = function() {
		if(gamestate == 0) {
			objs[0].push(suggestScreen);
		} else {
			suggestScreen.rmFrom(suggestScreen, objs[0]);
		}
	}
	setupEnvironment();
    setupShaders(); // setup the webGL shaders
	setLightingUniform();
    tick();
  }
  
} // end main
