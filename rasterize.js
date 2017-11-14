/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
var Eye = new vec4.fromValues(0.5,0.5,-0.5,1.0); // default eye position in world space
var LookAt = new vec4.fromValues(0.0,0.0,1.0,1.0);
var LookUp = new vec4.fromValues(0.0,1.0,0.0,1.0);
var Center = new vec4.fromValues(0.5,0.5,0.5,1.0);

var viewRight = vec3.create()
var temp = vec3.create()
viewRight = vec3.normalize(viewRight,vec3.cross(temp,LookAt,LookUp));

var numberofTri = 20-1; // this many slipt in both direction, for parameterization of ellipsoids

function loadTexture(url) {
	var texture = gl.createTexture();
	texture.img = new Image(); 
    texture.img.crossOrigin = "Anonymous";
    texture.img.src = url;
	return texture
}

function handleLoadedTexture(texture) {
	gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

function initTexture() {
	var txt = loadTexture("https://ncsucgclass.github.io/prog3/sky.jpg");
	txt.onload = function() {
		handleLoadedTexture(txt);
	};
}

// set up the webGL environment
function setupWebGL() {
    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it
    
    try {
      if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
      } else {
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
      }
    } // end try
    
    catch(e) {
      console.log(e);
    } // end catch
 
	initTexture();
} // end setupWebGL

// read triangles and ellipsoids in, load them into webgl buffers
function loadTrianglesnEllipsoids() {
    var inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles");
	
    var whichSetVert; // index of vertex in current triangle set
    var whichSetTri; // index of triangle in current triangle set
    var vtxBufferSize = 0; // the number of vertices in the vertex buffer
    var vtxToAdd = []; // vtx coords to add to the coord array
    var indexOffset = vec3.create(); // the index offset for the current set
    var triToAdd = vec3.create(); // tri indices to add to the index array
	
    if (inputTriangles != String.null) { 
        
        for (var whichSet=0; whichSet<inputTriangles.length; whichSet++) {
			var tri = inputTriangles[whichSet]
			
		    var coordArray = []; // 1D array of vertex coords for WebGL
		    var indexArray = []; // 1D array of vertex indices for WebGL
			var normalArray = [];// 1D array of normal vector for WebGL
			
			var center = vec3.create();
            // set up the vertex coord array
            for (whichSetVert=0; whichSetVert<tri.vertices.length; whichSetVert++) {
                vtxToAdd = tri.vertices[whichSetVert];
                coordArray.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]);
				
				var normal = tri.normals[whichSetVert];
				normalArray.push(normal[0], normal[1], normal[2]);
				
				vec3.add(center, center, vec3.fromValues(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]));
            } // end for vertices in set
			vec3.scale(center, center, 1./tri.vertices.length);
			var obj = new GlObject(tri.material.ambient,
							tri.material.diffuse,
							tri.material.specular,
							tri.material.n,
							center)
            
            // set up the triangle index array, adjusting indices across sets
            for (whichSetTri=0; whichSetTri<tri.triangles.length; whichSetTri++) {
                vec3.add(triToAdd,indexOffset,tri.triangles[whichSetTri]);
                indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
            } // end for triangles in set
			
            // vtxBufferSize += inputTriangles[whichSet].vertices.length; // total number of vertices
            obj.triBufferSize += tri.triangles.length; // total number of tris
			obj.triBufferSize *= 3;
			
		    // send the vertex coords to webGL
		    gl.bindBuffer(gl.ARRAY_BUFFER,obj.vertexBuffer); // activate that buffer
		    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coordArray),gl.STATIC_DRAW); // coords to that buffer
    
		    // send the triangle indices to webGL
		    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.triangleBuffer); // activate that buffer
		    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexArray),gl.STATIC_DRAW); // indices to that buffer
	
			gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer); // activate that buffer
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalArray), gl.STATIC_DRAW);
			
			objs[0].push(obj)
        } // end for each triangle set 
		
    } // end if triangles found
	
	// part 2
    var inputElliposids = getJSONFile(INPUT_SPHERES_URL,"ellipsoids");

    if (inputElliposids != String.null) {

        for (var whichSet=0; whichSet<inputElliposids.length; whichSet++) {
		    var coordArray = []; // 1D array of vertex coords for WebGL
		    var indexArray = []; // 1D array of vertex indices for WebGL
			var normalArray = [];// 1D array of normal vector for WebGL

			var ellipsoid = inputElliposids[whichSet];
			var ambient = ellipsoid.ambient;
			var diffuse = ellipsoid.diffuse;
			var specular = ellipsoid.specular;
			var n = ellipsoid.n;
			
			var obj = new GlObject(ambient, diffuse, specular, n, 
								vec3.fromValues(ellipsoid.x, ellipsoid.y, ellipsoid.z))
			
			var a = ellipsoid.a;
			var b = ellipsoid.b;
			var c = ellipsoid.c;
			var asqr = a*a;
			var bsqr = b*b;
			var csqr = c*c;
            // set up the vertex coord array
            for (var i=0; i<=numberofTri; i++) {
				var lat = -Math.PI/2 + Math.PI * i/numberofTri;
				var sinlat = Math.sin(lat);
				var coslat = Math.cos(lat);

				for (var j=0; j<=numberofTri; j++) {
					var lon = -Math.PI + 2*Math.PI * j/numberofTri;
					var sinlon = Math.sin(lon);
					var coslon = Math.cos(lon);

					var vtxToAddx = ellipsoid.x + a * coslat * coslon;
					var vtxToAddy = ellipsoid.y + b * coslat * sinlon;
					var vtxToAddz = ellipsoid.z + c * sinlat;

	                coordArray.push(vtxToAddx,vtxToAddy,vtxToAddz);

					// // A = 1/a^2, B = 1/b^2, C = 1/c^2
					// D = E = F = 0
					// G = - 2*x_c/a^2, H = - 2*y_c/b^2, I = - 2*z_c/c^2
					//
					// xn = 2*A*xi + D*yi + E*zi + G
					// yn = 2*B*yi + D*xi + F*zi + H
					// zn = 2*C*zi + E*xi + F*yi + I
					// =>
					// xn = 2*A*xi + G
					// yn = 2*B*yi + H
					// zn = 2*C*zi + I

					var nToAddx = 2 * (1./asqr) * vtxToAddx - 2 * ellipsoid.x / asqr;
					var nToAddy = 2 * (1./bsqr) * vtxToAddy - 2 * ellipsoid.y / bsqr;
					var nToAddz = 2 * (1./csqr) * vtxToAddz - 2 * ellipsoid.z / csqr;

					var normal = vec3.fromValues(nToAddx, nToAddy, nToAddz);
					vec3.normalize(normal, normal);
					normalArray.push(normal[0], normal[1], normal[2]);
				}
            } // end for vertices in set
            // set up the vertex coord array
            for (var i=0; i<numberofTri; i++) {
				for (var j=0; j<numberofTri; j++) {
					var first = (i * (numberofTri + 1)) + j;
			        var second = first + numberofTri + 1;
					idxs = [first,second,first+1];
	                vec3.add(triToAdd,indexOffset,idxs);
					indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
					idxs = [second,second+1,first+1];
	                vec3.add(triToAdd,indexOffset,idxs);
					indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
					
					obj.triBufferSize += 2; // total number of tris
				}
            } // end for vertices in set
			obj.triBufferSize *= 3;
			
		    // send the vertex coords to webGL
		    gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexBuffer); // activate that buffer
		    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coordArray),gl.STATIC_DRAW); // coords to that buffer
    
		    // send the triangle indices to webGL
		    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.triangleBuffer); // activate that buffer
		    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexArray),gl.STATIC_DRAW); // indices to that buffer
	
			gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer); // activate that buffer
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalArray), gl.STATIC_DRAW);

			objs[1].push(obj)
        } // end for each ellipsoids set

    } // end if ellipsoids found
} // end load triangles and ellipsoids

// setup the webGL shaders
function setupShaders() {
    
    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
		uniform mat4 uMVMatrix;
		uniform mat4 upMatrix;
		uniform mat3 uNMatrix;
		
        attribute vec3 aVertexPosition;
		attribute vec3 aVertexNormal;
		
		varying vec4 vPosition;
		varying vec3 vNormal;

        void main(void) {
			vec4 mvPos = uMVMatrix * vec4(aVertexPosition, 1.0);
            gl_Position = upMatrix * mvPos; // use the untransformed position
			
			vPosition = vec4(aVertexPosition, 1.0);
			vNormal = uNMatrix * aVertexNormal;
        }
    `;
	
    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
		precision mediump float;
		
		varying vec4 vPosition;
		varying vec3 vNormal;
		
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
		
        void main(void) {
			vec3 vLVec = normalize(uLightPos - vPosition.xyz);
			vec3 vNVec = normalize(vNormal);
			vec3 vVVec = normalize(uEyePos - vPosition.xyz);
			
			float NdotL = max(dot(vNVec, vLVec), 0.0);
			
			if(uModel == 1) {		// blinn-phong
				vec3 vHVec = normalize(vVVec + vLVec);
				float NdotH = max(dot(vNVec, vHVec), 0.0);
			
				gl_FragColor = uShapeAmbient*vec4(uLightAmbi,1.0)
				+ uShapeDiffuse*vec4(uLightDiff,1.0) * NdotL
	 			+ uShapeSpecular*vec4(uLightSepc,1.0) * pow(NdotH, uShapeN);
			} else {				// phong
				float LdotN = dot(vLVec, vNVec);
				vec3 vRVec = normalize(2.0*LdotN*vNVec - vLVec);
				float RdotV = max(dot(vRVec, vVVec), 0.0);
				
				gl_FragColor = uShapeAmbient*vec4(uLightAmbi,1.0)
				+ uShapeDiffuse*vec4(uLightDiff,1.0) * NdotL
	 			+ uShapeSpecular*vec4(uLightSepc,1.0) * pow(RdotV, uShapeN);
			}
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
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders

function tick() {
	requestAnimFrame(tick);
	renderScene();
}

function setLightingUniform() {
	// TODO: deal with multiple light sources
	var inputLights = getJSONFile(INPUT_LIGHTS_URL,"lights");
	if(inputLights != String.null) {
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
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
	
	setLightingUniform();
	
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
	
	for(var j = 0; j < objs.length; j++) {
		for(var i = 0; i < objs[j].length; i++) {
			var obj = objs[j][i]
			
			obj.doTransform()
		    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, obj.mMatrix);
			gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
	
			var nMatrix = mat3.create();
			mat3.normalFromMat4(nMatrix, obj.mMatrix);
			gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
			
			obj.setMaterialUniform(shaderProgram.shapeAmbientUniform,
								shaderProgram.shapeDiffuseUniform,
								shaderProgram.shapeSpecularUniform,
								shaderProgram.shapeNUniform);
			
		    // vertex buffer: activate and feed into vertex shader
		    gl.bindBuffer(gl.ARRAY_BUFFER,obj.vertexBuffer); // activate
		    gl.vertexAttribPointer(shaderProgram.vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed
	
			gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer);
			gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
		
		    // triangle buffer: activate and render
		    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,obj.triangleBuffer); // activate
		    gl.drawElements(gl.TRIANGLES,obj.triBufferSize,gl.UNSIGNED_SHORT,0); // render
		}
	}
} // end render triangles

/* MAIN -- HERE is where execution begins after window load */

function main() {
	
  setupListener();
  setupWebGL(); // set up the webGL environment
  loadTrianglesnEllipsoids(); // load in the triangles and ellipsoids from files
  setupShaders(); // setup the webGL shaders
  tick();
  //renderScene(); // draw the triangles using webGL
  
} // end main
