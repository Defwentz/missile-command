/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "http://defwentz.github.io/assets/triangles.json"; // triangles file loc
const INPUT_SPHERES_URL = "http://defwentz.github.io/assets/ellipsoids.json"; // ellipsoids file loc
const INPUT_LIGHTS_URL = "http://defwentz.github.io/assets/lights.json"; // lights file loc
var Eye = new vec4.fromValues(0.5,0.5,-0.5,1.0); // default eye position in world space
var LookAt = new vec4.fromValues(0.0,0.0,1.0,1.0);
var LookUp = new vec4.fromValues(0.0,1.0,0.0,1.0);
var Center;
updateCenter();

function updateCenter() {
	var x = Eye[0]+LookAt[0];
	var y = Eye[1]+LookAt[1];
	var z = Eye[2]+LookAt[2];
	var t = Eye[2]/(Eye[2]-z);
	
	var nx = Eye[0] + t*(x-Eye[0]);
	var ny = Eye[1] + t*(y-Eye[1]);
	Center = vec4.fromValues(nx,ny,0.0,1.0);
}

/* webgl globals */
// everything got 2 sets, first one contains triangles, second one contains ellipsoids
var gl = null; // the all powerful gl object. It's all here folks!
var vertexBuffers = [[],[]]; // this contains vertex coordinates in triples
var triangleBuffers = [[],[]]; // this contains indices into vertexBuffer in triples
var normalBuffers = [[],[]];
var ambients = [[],[]];
var diffuses = [[],[]];
var speculars = [[],[]];
var ns = [[],[]];
var triBufferSizes = [[],[]]; // the number of indices in the triangle buffer
var centers = [[],[]];
var ambientWeights = [[],[]];
var diffuseWeights = [[],[]];
var specularWeights = [[],[]];

var mvMatrix = [[],[]];
var pMatrix = mat4.create();

var numberofTri = 19; // this many slipt in both direction, for parameterization of ellipsoids

// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response); 
        } // end if good params
    } // end try    
    
    catch(e) {
        console.log(e);
        return(String.null);
    }
} // end get json file

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
			
		    var coordArray = []; // 1D array of vertex coords for WebGL
		    var indexArray = []; // 1D array of vertex indices for WebGL
			var normalArray = [];// 1D array of normal vector for WebGL
			
			triBufferSizes[0][whichSet] = 0;
			
			var ambient = inputTriangles[whichSet].material.ambient;
			var diffuse = inputTriangles[whichSet].material.diffuse;
			var specular = inputTriangles[whichSet].material.specular;
			var n = inputTriangles[whichSet].material.n;
			
			ambients[0].push(ambient);
			diffuses[0].push(diffuse);
			speculars[0].push(specular);
			ns[0].push(n);
			
			ambientWeights[0].push(1.0);
			diffuseWeights[0].push(1.0);
			specularWeights[0].push(1.0);
			
			var center = vec3.create();
            // set up the vertex coord array
            for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].vertices.length; whichSetVert++) {
                vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
                coordArray.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]);
				
				var normal = inputTriangles[whichSet].normals[whichSetVert];
				normalArray.push(normal[0], normal[1], normal[2]);
				
				vec3.add(center, center, vec3.fromValues(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]));
            } // end for vertices in set
			vec3.scale(center, center, 1./inputTriangles[whichSet].vertices.length);
			centers[0].push(center);
            
            // set up the triangle index array, adjusting indices across sets
            for (whichSetTri=0; whichSetTri<inputTriangles[whichSet].triangles.length; whichSetTri++) {
                vec3.add(triToAdd,indexOffset,inputTriangles[whichSet].triangles[whichSetTri]);
                indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
            } // end for triangles in set
			
            // vtxBufferSize += inputTriangles[whichSet].vertices.length; // total number of vertices
            triBufferSizes[0][whichSet] += inputTriangles[whichSet].triangles.length; // total number of tris
			triBufferSizes[0][whichSet] *= 3;
			
		    // send the vertex coords to webGL
		    vertexBuffers[0][whichSet] = gl.createBuffer(); // init empty vertex coord buffer
		    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[0][whichSet]); // activate that buffer
		    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coordArray),gl.STATIC_DRAW); // coords to that buffer
    
		    // send the triangle indices to webGL
		    triangleBuffers[0][whichSet] = gl.createBuffer(); // init empty triangle index buffer
		    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[0][whichSet]); // activate that buffer
		    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexArray),gl.STATIC_DRAW); // indices to that buffer
	
			normalBuffers[0][whichSet] = gl.createBuffer();	// init empty normal vector buffer
			gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffers[0][whichSet]); // activate that buffer
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalArray), gl.STATIC_DRAW);
        } // end for each triangle set 
		
    } // end if triangles found
	
	// part 2
    var inputElliposids = getJSONFile(INPUT_SPHERES_URL,"ellipsoids");

    if (inputElliposids != String.null) {

        for (var whichSet=0; whichSet<inputElliposids.length; whichSet++) {
		    var coordArray = []; // 1D array of vertex coords for WebGL
		    var indexArray = []; // 1D array of vertex indices for WebGL
			var normalArray = [];// 1D array of normal vector for WebGL

			triBufferSizes[1][whichSet] = 0;

			var ellipsoid = inputElliposids[whichSet];
			var ambient = ellipsoid.ambient;
			var diffuse = ellipsoid.diffuse;
			var specular = ellipsoid.specular;
			var n = ellipsoid.n;
			
			ambients[1].push(ambient);
			diffuses[1].push(diffuse);
			speculars[1].push(specular);
			ns[1].push(n);
			ambientWeights[1].push(1.0);
			diffuseWeights[1].push(1.0);
			specularWeights[1].push(1.0);
			
			centers[1].push(vec3.fromValues(ellipsoid.x, ellipsoid.y, ellipsoid.z));
			
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
					triBufferSizes[1][whichSet] += 2; // total number of tris
				}
            } // end for vertices in set
			triBufferSizes[1][whichSet] *= 3;
			
		    // send the vertex coords to webGL
		    vertexBuffers[1][whichSet] = gl.createBuffer(); // init empty vertex coord buffer
		    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[1][whichSet]); // activate that buffer
		    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coordArray),gl.STATIC_DRAW); // coords to that buffer
    
		    // send the triangle indices to webGL
		    triangleBuffers[1][whichSet] = gl.createBuffer(); // init empty triangle index buffer
		    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[1][whichSet]); // activate that buffer
		    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexArray),gl.STATIC_DRAW); // indices to that buffer
	
			normalBuffers[1][whichSet] = gl.createBuffer();	// init empty normal vector buffer
			gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffers[1][whichSet]); // activate that buffer
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalArray), gl.STATIC_DRAW);

        } // end for each ellipsoids set

    } // end if ellipsoids found

	// initialize transform matrix
	for(var i = 0; i < triBufferSizes.length; i++) {
		for(var j = 0; j < triBufferSizes[i].length; j++) {
			mvMatrix[i][j] = mat4.create();
			mat4.identity(mvMatrix[i][j]);
		}
	}
} // end load triangles and ellipsoids

var shaderProgram;

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

var movSpeed = 0.05;
var rotSpeed = 0.5;
var triIdx = -1;
var ellipIdx = -1;
var modelSelection = 1;

function isCapsLockOn(e) {
	return event.getModifierState && event.getModifierState( 'CapsLock' );
}
function selectScale(set, idx) {
	var center = centers[set][idx];
	mat4.translate(mvMatrix[set][idx], mvMatrix[set][idx], vec3.fromValues(center[0], center[1], center[2]));
	mat4.scale(mvMatrix[set][idx], mvMatrix[set][idx], vec3.fromValues(1.2, 1.2, 1.2));
	mat4.translate(mvMatrix[set][idx], mvMatrix[set][idx], vec3.fromValues(-center[0], -center[1], -center[2]));
}

function deselectScale(set, idx) {
	var center = centers[set][idx];
	mat4.translate(mvMatrix[set][idx], mvMatrix[set][idx], vec3.fromValues(center[0], center[1], center[2]));
	mat4.scale(mvMatrix[set][idx], mvMatrix[set][idx], vec3.fromValues(1/1.2, 1/1.2, 1/1.2));
	mat4.translate(mvMatrix[set][idx], mvMatrix[set][idx], vec3.fromValues(-center[0], -center[1], -center[2]));
}
function translateTE(x, y, z) {
	if(triIdx != -1) {
		vec3.add(centers[0][triIdx], centers[0][triIdx], vec3.fromValues(x, y, z));
		mat4.translate(mvMatrix[0][triIdx], mvMatrix[0][triIdx], vec3.fromValues(x, y, z));
	}
	if(ellipIdx != -1) {
		vec3.add(centers[1][ellipIdx], centers[1][ellipIdx], vec3.fromValues(x, y, z));
		mat4.translate(mvMatrix[1][ellipIdx], mvMatrix[1][ellipIdx], vec3.fromValues(x, y, z));
	}
}
function rotateTE(rad, axis) {
	if(triIdx != -1) {
		var center = centers[0][triIdx];
		mat4.translate(mvMatrix[0][triIdx], mvMatrix[0][triIdx], vec3.fromValues(center[0], center[1], center[2]));
		mat4.rotate(mvMatrix[0][triIdx], mvMatrix[0][triIdx], rad, axis);
		mat4.translate(mvMatrix[0][triIdx], mvMatrix[0][triIdx], vec3.fromValues(-center[0], -center[1], -center[2]));
	}
	if(ellipIdx != -1) {
		var center = centers[1][ellipIdx];
		mat4.translate(mvMatrix[1][ellipIdx], mvMatrix[1][ellipIdx], vec3.fromValues(center[0], center[1], center[2]));
		mat4.rotate(mvMatrix[1][ellipIdx], mvMatrix[1][ellipIdx], rad, axis);
		mat4.translate(mvMatrix[1][ellipIdx], mvMatrix[1][ellipIdx], vec3.fromValues(-center[0], -center[1], -center[2]));
	}
}

// part4-part7
function setupListener() {
	document.addEventListener('keydown', function(event) {
		switch (event.keyCode) {
		// part 4
		case 65:
			if(isCapsLockOn(event)) {
				//  rotate view left and right around view Y (yaw)
				console.log('A');
				var tmpLookAt = vec3.fromValues(LookAt[0], LookAt[1], LookAt[2]);
				vec3.rotateY(tmpLookAt, tmpLookAt, vec3.create(), +rotSpeed/10);
				LookAt = vec4.fromValues(tmpLookAt[0], tmpLookAt[1], tmpLookAt[2], 1.0);
			} else {
				// translate view left and right along view X
				console.log('a');
				Eye[0] += movSpeed;
			}
			updateCenter();
			break;
		case 68:
			if(isCapsLockOn(event)) {
				//  rotate view left and right around view Y (yaw)
				console.log('D');
				var tmpLookAt = vec3.fromValues(LookAt[0], LookAt[1], LookAt[2]);
				vec3.rotateY(tmpLookAt, tmpLookAt, vec3.create(), -rotSpeed/10);
				LookAt = vec4.fromValues(tmpLookAt[0], tmpLookAt[1], tmpLookAt[2], 1.0);
			} else {
				// translate view left and right along view X
		        console.log('d');
				Eye[0] -= movSpeed;
			}
			updateCenter();
			break;
		case 87:
			if(isCapsLockOn(event)) {
				// rotate view forward and backward around view X (pitch)
				console.log('W');
				var tmpLookAt = vec3.fromValues(LookAt[0], LookAt[1], LookAt[2]);
				vec3.rotateX(tmpLookAt, tmpLookAt, vec3.create(), +rotSpeed/10);
				LookAt = vec4.fromValues(tmpLookAt[0], tmpLookAt[1], tmpLookAt[2], 1.0);
			} else {
				// translate view forward and backward along view Z
		        console.log('w');
				Eye[2] += movSpeed;
			}
			updateCenter();
			break;
		case 83:
			if(isCapsLockOn(event)) {
				// rotate view forward and backward around view X (pitch)
				console.log('S');
				var tmpLookAt = vec3.fromValues(LookAt[0], LookAt[1], LookAt[2]);
				vec3.rotateX(tmpLookAt, tmpLookAt, vec3.create(), -rotSpeed/10);
				LookAt = vec4.fromValues(tmpLookAt[0], tmpLookAt[1], tmpLookAt[2], 1.0);
			} else {
				// translate view forward and backward along view Z
		        console.log('s');
				Eye[2] -= movSpeed;
			}
			updateCenter();
			break;
		case 81:
			if(isCapsLockOn(event)) {
				console.log('Q');
			} else {
		        console.log('q');
				Eye[1] += movSpeed;
			}
			updateCenter();
			break;
		case 69:
			if(isCapsLockOn(event)) {
				console.log('E');
			} else {
		        console.log('e');
				Eye[1] -= movSpeed;
			}
			updateCenter();
			break;
			
		// part 6
		case 66:
			// toggle from blinn-phong to phone
			console.log('b');
	        modelSelection = 1 - modelSelection;
			break;
		case 78:
			// increase specular integer exponent
			console.log('n');
			if(triIdx != -1) {
				ns[0][triIdx] = (++ns[0][triIdx])%21;
			}
			if(ellipIdx != -1) {
				ns[1][ellipIdx] = (++ns[1][ellipIdx])%21;
			}
			break;
		case 49:
			// increase the ambient weight
			console.log('1');
			if(triIdx != -1) {
				ambientWeights[0][triIdx] += 0.1;
				if(ambientWeights[0][triIdx] >= 1.0) {
					ambientWeights[0][triIdx] = 0.0;
				}
			}
			if(ellipIdx != -1) {
				ambientWeights[1][ellipIdx] += 0.1;
				if(ambientWeights[1][ellipIdx] >= 1.0) {
					ambientWeights[1][ellipIdx] = 0.0;
				}
			}
			break;
		case 50:
			// increase the diffuse weight
			console.log('2');
			if(triIdx != -1) {
				diffuseWeights[0][triIdx] += 0.1;
				if(diffuseWeights[0][triIdx] >= 1.0) {
					diffuseWeights[0][triIdx] = 0.0;
				}
			}
			if(ellipIdx != -1) {
				diffuseWeights[1][ellipIdx] += 0.1;
				if(diffuseWeights[1][ellipIdx] >= 1.0) {
					diffuseWeights[1][ellipIdx] = 0.0;
				}
			}
			break;
		case 51:
			// increase the specular weight
			console.log('3');
			if(triIdx != -1) {
				specularWeights[0][triIdx] += 0.1;
				if(specularWeights[0][triIdx] >= 1.0) {
					specularWeights[0][triIdx] = 0.0;
				}
			}
			if(ellipIdx != -1) {
				specularWeights[1][ellipIdx] += 0.1;
				if(specularWeights[1][ellipIdx] >= 1.0) {
					specularWeights[1][ellipIdx] = 0.0;
				}
			}
			break;
		
		// part 5
		case 32:
			// deselect model
			console.log('space');
			if(triIdx != -1) {
				deselectScale(0, triIdx);
				triIdx = -1;
			}
			if(ellipIdx != -1) {
				deselectScale(1, ellipIdx);
				ellipIdx = -1;
			}
			break;
		case 37:
			// traverse triangles
			console.log('left');
			if(triIdx == -1) {
				triIdx = triBufferSizes[0].length-1;
			} else {
				deselectScale(0, triIdx);
				triIdx--;
				if(triIdx == -1) {
					triIdx = triBufferSizes[0].length-1;
				}
			}
			selectScale(0,triIdx);
			break;
		case 39:
			// traverse triangles
			console.log('right');
			if(triIdx == -1) {
				triIdx = 0;
			} else {
				deselectScale(0, triIdx);
				triIdx = (++triIdx)%(triBufferSizes[0].length);
			}
			selectScale(0,triIdx);
			break;
		case 38:
			// traverse ellipsoids
			console.log('up');
			if(ellipIdx == -1) {
				ellipIdx = triBufferSizes[1].length-1;
			} else {
				deselectScale(1, ellipIdx);
				ellipIdx--;
				if(ellipIdx == -1) {
					ellipIdx = triBufferSizes[1].length-1;
				}
			}
			selectScale(1,ellipIdx);
			break;
		case 40:
			// traverse ellipsoids
			console.log('down');
			if(ellipIdx == -1) {
				ellipIdx = 0;
			} else {
				deselectScale(1, ellipIdx);
				ellipIdx = (++ellipIdx)%(triBufferSizes[1].length);
			}
			selectScale(1,ellipIdx);
			break;
		
		// part 7
		case 75:
			if(isCapsLockOn(event)) {
				// rotate selection left and right around view Y (yaw)
				console.log('K');
				rotateTE(-rotSpeed, vec3.fromValues(0,1,0));
			} else {
				// translate selection left and right along view X
				console.log('k');
				translateTE(+movSpeed, 0.0, 0.0);
			}
			updateCenter();
			break;
		case 186:
			if(isCapsLockOn(event)) {
				// rotate selection left and right around view Y (yaw)
				console.log(':');
				rotateTE(+rotSpeed, vec3.fromValues(0,1,0));
			} else {
				// translate selection left and right along view X
		        console.log(';');
				translateTE(-movSpeed, 0.0, 0.0);
			}
			updateCenter();
			break;
		case 79:
			if(isCapsLockOn(event)) {
				// rotate selection forward and backward around view X (pitch)
				console.log('O');
				rotateTE(-rotSpeed, vec3.fromValues(1,0,0));
			} else {
				// translate selection forward and backward along view Z
		        console.log('o');
				translateTE(0.0, 0.0, +movSpeed);
			}
			updateCenter();
			break;
		case 76:
			if(isCapsLockOn(event)) {
				// rotate selection forward and backward around view X (pitch)
				console.log('L');
				rotateTE(+rotSpeed, vec3.fromValues(1,0,0));
			} else {
				// translate selection forward and backward along view Z
		        console.log('l');
				translateTE(0.0, 0.0, -movSpeed);
			}
			updateCenter();
			break;
		case 73:
			if(isCapsLockOn(event)) {
				// rotate selection clockwise and counterclockwise around view Z (roll)
				console.log('I');
				rotateTE(-rotSpeed, vec3.fromValues(0,0,1));
			} else {
				// translate selection up and down along view Y
		        console.log('i');
				translateTE(0.0, +movSpeed, 0.0);
			}
			updateCenter();
			break;
		case 80:
			if(isCapsLockOn(event)) {
				// rotate selection clockwise and counterclockwise around view Z (roll)
				console.log('P');
				rotateTE(+rotSpeed, vec3.fromValues(0,0,1));
			} else {
				// translate selection up and down along view Y
		        console.log('p');
				translateTE(0.0, -movSpeed, 0.0);
			}
			updateCenter();
			break;
		default:
			console.log('irrevelent stuff');
		}
	});
}

// code from http://learningwebgl.com
function setMatrixUniforms(mvMatrix) {
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
	
	var nMatrix = mat3.create();
	mat3.normalFromMat4(nMatrix, mvMatrix);
	gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

// render the loaded model
function renderScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
	
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
	
	mat4.identity(pMatrix);
	var fov = Math.PI/4;
	var ratio = 512/512.0;
	var near = 1.0;
	var far = 2.0;
	mat4.perspective(pMatrix, fov, ratio, near, far);
	
	var lookat = mat4.create();
	mat4.lookAt(lookat, Eye, Center, LookUp);
	mat4.mul(pMatrix, pMatrix, lookat);
	
	for(var j = 0; j < triBufferSizes.length; j++) {
		for(var i = 0; i < triBufferSizes[j].length; i++) {
		
		    // vertex buffer: activate and feed into vertex shader
		    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[j][i]); // activate
		    gl.vertexAttribPointer(shaderProgram.vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed
	
			gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffers[j][i]);
			gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
		
			setMatrixUniforms(mvMatrix[j][i]);
			
			gl.uniform4f(
	            shaderProgram.shapeAmbientUniform,
	            ambients[j][i][0]*ambientWeights[j][i],
	            ambients[j][i][1]*ambientWeights[j][i],
	            ambients[j][i][2]*ambientWeights[j][i],
				1.0
	        );
			gl.uniform4f(
				shaderProgram.shapeDiffuseUniform,
				diffuses[j][i][0]*diffuseWeights[j][i],
				diffuses[j][i][1]*diffuseWeights[j][i],
				diffuses[j][i][2]*diffuseWeights[j][i],
				1.0
			);
			gl.uniform4f(
				shaderProgram.shapeSpecularUniform,
				speculars[j][i][0]*specularWeights[j][i],
				speculars[j][i][1]*specularWeights[j][i],
				speculars[j][i][2]*specularWeights[j][i],
				1.0
			);
			gl.uniform1f(
				shaderProgram.shapeNUniform,
				ns[j][i]
			);
		
		    // triangle buffer: activate and render
		    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffers[j][i]); // activate
		    gl.drawElements(gl.TRIANGLES,triBufferSizes[j][i],gl.UNSIGNED_SHORT,0); // render
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

// use code from toturial: https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
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

