function GlObject(ambient, diffuse, specular, n, center) {
	this.target = -1
	this.life = 1000
	this.selfDestruct = null
	
	this.launch = function(rmFrom) {
		this.state = 1
		var func = this.rmFrom
		var me = this
		this.selfDestruct = function(){func(me, rmFrom)}
	}
	
	this.rmFrom = function(me, rmFrom) {
		var i = rmFrom.indexOf(me)
		if (i > -1) {
			this.state = 2
			rmFrom.splice(i, 1)
		}
	}
	
	this.state = 0
	this.vertexBuffer = gl.createBuffer() // this contains vertex coordinates in triples
	this.triangleBuffer = gl.createBuffer() // this contains indices into vertexBuffer in triples
	this.triBufferSize = 0 // the number of indices in the triangle buffer
	this.normalBuffer = gl.createBuffer()
	this.textureCoordBuffer = gl.createBuffer()
	
	this.textureURL = null
	this.texture = dummy
	this.alpha = 1.0
	this.center = center
	this.ambient = ambient
	this.diffuse = diffuse
	this.specular = specular
	this.n = n
	this.ambientWeight = 1.0
	this.diffuseWeight = 1.0
	this.specularWeight = 1.0
	
	this.xAxis = vec3.fromValues(1,0,0)
	this.yAxis = vec3.fromValues(0,1,0)
	
	this.highlight = false
	this.mMatrix = mat4.create()
	this.translation = vec3.fromValues(0,0,0)
	
	this.velocity = vec3.fromValues(0,0,0)
	
	this.run = function() {
		if(this.state == 1) {
			vec3.add(this.translation, this.translation, this.velocity)
			this.life--
			if(this.life == 0) {
				this.selfDestruct()
			}
		}
	}
	
	this.actualCenter = function() {
		var aCenter = vec3.clone(this.center)
		vec3.add(aCenter, aCenter, this.translation)
		return aCenter
	}
	
	// doesn't matter if it's negative(which get turned into positive because vec3.len is always positive)
	// it doesn't gets rendered anyway
	this.depth = function(eye) {
		var newCenter = this.actualCenter()
		var dp = vec3.create()
		vec3.sub(dp, newCenter, eye)
		return vec3.len(dp)
	}
	
	this.setMaterialUniform =  function (a, d, s, rn, al) {
		gl.uniform4f(a,
            this.ambient[0]*this.ambientWeight,
            this.ambient[1]*this.ambientWeight,
            this.ambient[2]*this.ambientWeight,
			1.0
        )
		gl.uniform4f(d,
			this.diffuse[0]*this.diffuseWeight,
			this.diffuse[1]*this.diffuseWeight,
			this.diffuse[2]*this.diffuseWeight,
			1.0
		)
		gl.uniform4f(s,
			this.specular[0]*this.specularWeight,
			this.specular[1]*this.specularWeight,
			this.specular[2]*this.specularWeight,
			1.0
		)
		gl.uniform1f(rn, this.n)
		gl.uniform1f(al, this.alpha)
	}
	
	this.currentDir = vec3.fromValues(0,1,0)
	this.rotationHelper = mat4.create()
	this.turnTo = function(targetDir) {
		
	}
	
	// from prog2 solution
	this.doTransform = function() {
		var zAxis = vec3.create(), sumRotation = mat4.create(), temp = mat4.create(), negCtr = vec3.create()

        // move the model to the origin
        mat4.fromTranslation(this.mMatrix,vec3.negate(negCtr,this.center))

        // scale for highlighting if needed
        if (this.highlight == true)
            mat4.multiply(this.mMatrix,mat4.fromScaling(temp,vec3.fromValues(1.2,1.2,1.2)),this.mMatrix) // S(1.2) * T(-ctr)

        // rotate the model to current interactive orientation
        vec3.normalize(zAxis,vec3.cross(zAxis,this.xAxis,this.yAxis)) // get the new model z axis
        mat4.set(sumRotation, // get the composite rotation
            this.xAxis[0], this.yAxis[0], zAxis[0], 0,
            this.xAxis[1], this.yAxis[1], zAxis[1], 0,
            this.xAxis[2], this.yAxis[2], zAxis[2], 0,
            0, 0,  0, 1)
        mat4.multiply(this.mMatrix,sumRotation,this.mMatrix) // R(ax) * S(1.2) * T(-ctr)

        // translate back to model center
        mat4.multiply(this.mMatrix,mat4.fromTranslation(temp,this.center),this.mMatrix) // T(ctr) * R(ax) * S(1.2) * T(-ctr)

        // translate model to current interactive orientation
        mat4.multiply(this.mMatrix,mat4.fromTranslation(temp,this.translation),this.mMatrix) // T(pos)*T(ctr)*R(ax)*S(1.2)*T(-ctr)
	}
}

function GlObjectFactory(model, coordArray, indexArray, normalArray, textArray) {
	this.model = model
    this.coordArray = coordArray
    this.indexArray = indexArray
	this.normalArray = normalArray
	this.textArray = textArray
	
	this.createObject = function() {
		var obj = new GlObject(this.model.ambient,
						this.model.diffuse,
						this.model.specular,
						this.model.n,
						this.model.center)
						
		vec3.add(obj.translation, obj.translation, this.model.translation)
		obj.triBufferSize = model.triBufferSize
		
	    // send the vertex coords to webGL
	    gl.bindBuffer(gl.ARRAY_BUFFER,obj.vertexBuffer) // activate that buffer
	    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(this.coordArray),gl.STATIC_DRAW) // coords to that buffer

	    // send the triangle indices to webGL
	    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.triangleBuffer); // activate that buffer
	    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(this.indexArray),gl.STATIC_DRAW); // indices to that buffer

		gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer); // activate that buffer
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normalArray), gl.STATIC_DRAW);

	    gl.bindBuffer(gl.ARRAY_BUFFER,obj.textureCoordBuffer); // activate that buffer
	    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(this.textArray),gl.STATIC_DRAW); // coords to that buffer
		return obj
	}
}