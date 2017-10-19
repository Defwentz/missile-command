/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "http://defwentz.github.io/assets/triangles.json"; // triangles file loc
const INPUT_SPHERES_URL = "http://defwentz.github.io/assets/ellipsoids.json"; // ellipsoids file loc
const INPUT_LIGHTS_URL = "http://defwentz.github.io/assets/lights.json"; // lights file loc
var Eye = new vec4.fromValues(0.5,0.5,-0.5,1.0); // default eye position in world space
var Center = new vec4.fromValues(0.5,0.5,0.0,1.0);
var LookUp = new vec4.fromValues(0.0,1.0,0.0,1.0); 
// var Light = {
// 	pos: new vec4.fromValues(-1,3,-0.5,1.0), // default eye position in world space
// 	clr: new vec4.fromValues(1.0,1.0,1.0,1.0)
// };

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var vertexBuffer; // this contains vertex coordinates in triples
var triangleBuffer; // this contains indices into vertexBuffer in triples
var colorBuffer;
var normalBuffer;
var triBufferSize = 0; // the number of indices in the triangle buffer
var vertexPositionAttrib; // where to put position for vertex shader


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

// read triangles in, load them into webgl buffers
function loadTrianglesnEllipsoids() {
    var inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles");
	
    var whichSetVert; // index of vertex in current triangle set
    var whichSetTri; // index of triangle in current triangle set
    var coordArray = []; // 1D array of vertex coords for WebGL
    var indexArray = []; // 1D array of vertex indices for WebGL
	var colorArray = [];
	var normalArray = [];
    var vtxBufferSize = 0; // the number of vertices in the vertex buffer
    var vtxToAdd = []; // vtx coords to add to the coord array
    var indexOffset = vec3.create(); // the index offset for the current set
    var triToAdd = vec3.create(); // tri indices to add to the index array
	
    if (inputTriangles != String.null) { 
        
        for (var whichSet=0; whichSet<inputTriangles.length; whichSet++) {
            vec3.set(indexOffset,vtxBufferSize,vtxBufferSize,vtxBufferSize); // update vertex offset
            
            // set up the vertex coord array
            for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].vertices.length; whichSetVert++) {
                vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
                coordArray.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]);
				
				var color = inputTriangles[whichSet].material.diffuse;
				colorArray.push(color[0], color[1], color[2], 1.0);
				
				var normal = inputTriangles[whichSet].normals[whichSetVert];
				normalArray.push(normal[0], normal[1], normal[2]);
            } // end for vertices in set
            
            // set up the triangle index array, adjusting indices across sets
            for (whichSetTri=0; whichSetTri<inputTriangles[whichSet].triangles.length; whichSetTri++) {
                vec3.add(triToAdd,indexOffset,inputTriangles[whichSet].triangles[whichSetTri]);
                indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
            } // end for triangles in set
			
            vtxBufferSize += inputTriangles[whichSet].vertices.length; // total number of vertices
            triBufferSize += inputTriangles[whichSet].triangles.length; // total number of tris
        } // end for each triangle set 
		
    } // end if triangles found
	
	// part 2
    var inputElliposids = getJSONFile(INPUT_SPHERES_URL,"ellipsoids");
	var numberofTri = 10; // this many slipt in both direction

    if (inputElliposids != String.null) {
		
        for (var whichSet=0; whichSet<inputElliposids.length; whichSet++) {
			
            vec3.set(indexOffset,vtxBufferSize,vtxBufferSize,vtxBufferSize); // update vertex offset
            
			var ellipsoid = inputElliposids[whichSet];
			var color = ellipsoid.diffuse;
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
					vtxBufferSize++;
					
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

					var nToAddx = 2 * (1/asqr) * vtxToAddx - 2 * ellipsoid.x / asqr;
					var nToAddy = 2 * (1/bsqr) * vtxToAddy - 2 * ellipsoid.y / bsqr;
					var nToAddz = 2 * (1/csqr) * vtxToAddz - 2 * ellipsoid.z / csqr;
					
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
					triBufferSize += 2; // total number of tris
				}
            } // end for vertices in set
			
        } // end for each triangle set 
		
    } // end if ellipsoids found
	
	triBufferSize *= 3; // now total number of indices
	
    // send the vertex coords to webGL
    vertexBuffer = gl.createBuffer(); // init empty vertex coord buffer
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate that buffer
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coordArray),gl.STATIC_DRAW); // coords to that buffer
    
    // send the triangle indices to webGL
    triangleBuffer = gl.createBuffer(); // init empty triangle index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer); // activate that buffer
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexArray),gl.STATIC_DRAW); // indices to that buffer

	colorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer); // activate that buffer
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorArray), gl.STATIC_DRAW);
	
	normalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer); // activate that buffer
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalArray), gl.STATIC_DRAW);
	
	
	console.log(coordArray);
	console.log(normalArray);
	console.log(triBufferSize);
	console.log(indexArray);
} // end load triangles

var shaderProgram;

// setup the webGL shaders
function setupShaders() {
    
    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
		uniform mat4 uMVMatrix;
		uniform mat4 upMatrix;
		uniform mat3 uNMatrix;
		
        attribute vec3 vertexPosition;
		attribute vec4 aVertexColor;
		attribute vec3 aVertexNormal;
		
		varying vec4 vColor;
		varying vec4 vPosition;
		
		// uniform vec3 uLightPos;
		// uniform vec3 uLightAmbi;
		// uniform vec3 uLightDiff;
		// uniform vec3 uLightSepc;
		
        void main(void) {
			vec4 mvPos = uMVMatrix * vec4(vertexPosition, 1.0);
            gl_Position = upMatrix * mvPos; // use the untransformed position
			
			vColor = aVertexColor;
			vPosition = vec4(vertexPosition, 1.0);
			
			// vec3 LVec = normalize(uLightPos - mvPos.xyz);
			vec3 NVec = uNMatrix * aVertexNormal;
        }
    `;
	
    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
		precision mediump float;
		varying vec4 vColor;
		varying vec4 vPosition;
		
        void main(void) {
            gl_FragColor = vColor;
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
                vertexPositionAttrib = // get pointer to vertex shader input
                    gl.getAttribLocation(shaderProgram, "vertexPosition"); 
                gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array
				
				shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
				gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
				
				shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
				gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
				
				shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
				shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "upMatrix");
				shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
				
				// shaderProgram.lightPosUniform = gl.getUniformLocation(shaderProgram, "uLightPos");
// 				shaderProgram.lightAmbientUniform = gl.getUniformLocation(shaderProgram, "uLightAmbi");
// 				shaderProgram.lightDiffuseUniform = gl.getUniformLocation(shaderProgram, "uLightDiff");
// 				shaderProgram.lightSpecularUniform = gl.getUniformLocation(shaderProgram, "uLightSepc");
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders

// code from http://learningwebgl.com
var mvMatrix = mat4.create();
var pMatrix = mat4.create();
function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
	
	var nMatrix = mat3.create();
	mat3.fromMat4(nMatrix, mvMatrix);
	mat3.invert(nMatrix, nMatrix);
    mat3.transpose(nMatrix, nMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

// render the loaded model
function renderScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
	
	var inputLights = getJSONFile(INPUT_LIGHTS_URL,"lights");
	if(inputLights != String.null) {
		for(var i=0; i<inputLights.length; i++) {
			// gl.uniform3f(
// 			                shaderProgram.lightPosUniform,
// 			                inputLights[i].x,
// 			                inputLights[i].y,
// 			                inputLights[i].z
// 			            );
// 			gl.uniform3f(
// 			                shaderProgram.lightAmbientUniform,
// 			                inputLights[i].ambient[0],
// 			                inputLights[i].ambient[1],
// 			                inputLights[i].ambient[2]
// 			            );
// 			gl.uniform3f(
// 			                shaderProgram.lightDiffuseUniform,
// 			                inputLights[i].diffuse[0],
// 			                inputLights[i].diffuse[1],
// 			                inputLights[i].diffuse[2]
// 			            );
// 			gl.uniform3f(
// 			                shaderProgram.lightSpecularUniform,
// 			                inputLights[i].specular[0],
// 			                inputLights[i].specular[1],
// 			                inputLights[i].specular[2]
// 			            );
		}
		
	}
	
	mat4.identity(pMatrix);
	var fov = Math.PI/4;
	var ratio = 512/512.0;
	var near = 1.0;
	var far = 100.0;
	mat4.perspective(pMatrix, fov, ratio, near, far);
	
	var lookat = mat4.create();
	
	// console.log(vec3.str(Eye));
	// console.log(vec3.str(Center));
	// console.log(vec3.str(LookUp));
	mat4.lookAt(lookat, Eye, Center, LookUp);
	mat4.mul(pMatrix, pMatrix, lookat);
	
    // var pvmMatrix = mat4.create();
    // mat4.lookAt(pvmMatrix,Eye,Center,Up);
    // console.log(mat4.str(pvmMatrix));,
	
	mat4.identity(mvMatrix);
	// mat4.translate(mvMatrix, mvMatrix, vec3.fromValues(-0.2, -0.2, 0.0));
	
    // vertex buffer: activate and feed into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed
	
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
	
	setMatrixUniforms();
	
    // triangle buffer: activate and render
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffer); // activate
    gl.drawElements(gl.TRIANGLES,triBufferSize,gl.UNSIGNED_SHORT,0); // render

} // end render triangles


/* MAIN -- HERE is where execution begins after window load */

function main() {
  
  setupWebGL(); // set up the webGL environment
  loadTrianglesnEllipsoids(); // load in the triangles and ellipsoids from files
  setupShaders(); // setup the webGL shaders
  renderScene(); // draw the triangles using webGL
  
} // end main