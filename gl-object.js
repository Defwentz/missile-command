function GlObject(ambient, diffuse, specular, n, center) {
	
	this.vertexBuffer = gl.createBuffer() // this contains vertex coordinates in triples
	this.triangleBuffer = gl.createBuffer() // this contains indices into vertexBuffer in triples
	this.triBufferSize = 0 // the number of indices in the triangle buffer
	this.normalBuffer = gl.createBuffer()
	this.textureCoordBuffer = gl.createBuffer()
	
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
	
	this.actualCenter = function() {
		var aCenter = vec3.clone(this.center)
		vec3.add(aCenter, aCenter, this.translation)
		return aCenter
	}
	
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