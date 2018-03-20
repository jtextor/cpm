/** This extends the CPM from CPM.js with a chemotaxis module. 
Can be used for two- or three-dimensional simulations, but visualization
is currently supported only in 2D. 
Currently usable from browser only.
*/


/* ------------------ CHEMOTAXIS --------------------------------------- */


/*  To bias a copy attempt p1->p2 in the direction of target point pt.
	Vector p1 -> p2 is the direction of the copy attempt, 
	Vector p1 -> pt is the preferred direction. Then this function returns the cosine
	of the angle alpha between these two vectors. This cosine is 1 if the angle between
	copy attempt direction and preferred direction is 0 (when directions are the same), 
	-1 if the angle is 180 (when directions are opposite), and 0 when directions are
	perpendicular. */
CPM.prototype.pointAttractor = function( p1, p2, pt ){
	var r = 0., i, norm1 = 0, norm2 = 0, d1=0., d2=0.
	for( i=0 ; i < p1.length ; i ++ ){
		d1 = pt[i]-p1[i]; d2 = p2[i]-p1[i]
		r += d1 * d2
		norm1 += d1*d1
		norm2 += d2*d2
	}
	return r/Math.sqrt(norm1)/Math.sqrt(norm2)

}

/* To bias a copy attempt p1 -> p2 in the direction of vector 'dir'.
This implements a linear gradient rather than a radial one as with pointAttractor. */
CPM.prototype.linAttractor = function( p1, p2, dir ){

	var r = 0., i, norm1 = 0, norm2 = 0, d1 = 0., d2 = 0.
	// loops over the coordinates x,y,(z)
	for( i = 0; i < p1.length ; i++ ){
		// direction of the copy attempt on this coordinate is from p1 to p2
		d1 = p2[i] - p1[i]

		// direction of the gradient
		d2 = dir[i]
		r += d1 * d2 
		norm1 += d1*d1
		norm2 += d2*d2
	}
	return r/Math.sqrt(norm1)/Math.sqrt(norm2)
}


CPM.prototype.deltaHchemotaxis = function( sourcei, targeti, src_type, tgt_type ){

	var gradienttype = this.conf["GRADIENT_TYPE"]
	var gradientvec = this.conf["GRADIENT_DIRECTION"]
	var bias 

	if( gradienttype == "radial" ){
		bias = this.pointAttractor( this.i2p(sourcei), this.i2p(targeti),gradientvec )
	} else if( gradienttype == "linear" ){
		bias = this.linAttractor( this.i2p(sourcei), this.i2p(targeti),gradientvec )
	} else {
		throw("Unknown GRADIENT_TYPE. Please choose either 'linear' or 'radial'." )
	}

	// if source is non background, lambda chemotaxis is of the source cell.
	// if source is background, use lambda chemotaxis of target cell.
	if( src_type != 0 ){
		lambdachem = this.par("LAMBDA_CHEMOTAXIS",src_type )
	} else {
		lambdachem = this.par("LAMBDA_CHEMOTAXIS",tgt_type )
	}	

	return -bias*lambdachem
}


/* ------------------ HAMILTONIAN COMPUTATION ------------------------------ */

CPM.prototype.deltaHadhesion = function( sourcei, targeti, src_type, tgt_type ){
	return this.H( targeti, src_type ) - this.H( targeti, tgt_type )
}

CPM.prototype.deltaHvolume = function( sourcei, targeti, src_type, tgt_type ){

	// volume gain of src cell
	var deltaH = this.volconstraint( 1, src_type ) - 
		this.volconstraint( 0, src_type )
	// volume loss of tgt cell
	deltaH += this.volconstraint( -1, tgt_type ) - 
		this.volconstraint( 0, tgt_type )

	return deltaH

}

// invasiveness. If there is a celltype a that prefers to invade
// pixels of type b. Currently not used.
CPM.prototype.deltaHinvasiveness = function( sourcei, targeti, src_type, tgt_type ){
	var deltaH = 0	
	if( tgt_type != 0 && src_type != 0 && this.conf.INV ){
		deltaH += this.par( "INV", tgt_type, src_type )
	}
	return -deltaH
}

CPM.prototype.deltaHperimeter = function( sourcei, targeti, src_type, tgt_type ){
	return this.perconstrainti( targeti, tgt_type, src_type )
}
CPM.prototype.deltaHactmodel = function( sourcei, targeti, src_type, tgt_type ){

	var deltaH = 0

	// use parameters for the source cell, unless that is the background.
	// In that case, use parameters of the target cell.
	if( src_type != 0 ){
		maxact = this.par("MAX_ACT",src_type)
		lambdaact = this.par("LAMBDA_ACT",src_type)
	} else {
		// special case: punishment for a copy attempt from background into
		// an active cell. This effectively means that the active cell retracts,
		// which is different from one cell pushing into another (active) cell.
		maxact = this.par("MAX_ACT",tgt_type)
		lambdaact = this.par("LAMBDA_ACT",tgt_type)
	}
	if( maxact > 0 ){
		deltaH += lambdaact*(this.activityAt( targeti ) - this.activityAt( sourcei ))/maxact
	}
	return deltaH
}

// returns both change in hamiltonian and perimeter
CPM.prototype.deltaH = function( sourcei, targeti, src_type, tgt_type ){

	var terms = ["adhesion","volume","perimeter","actmodel","chemotaxis"], currentterm
	var dHlog = {}, per
	
	var r = 0.0
	for( var i = 0 ; i < terms.length ; i++ ){
		currentterm = this["deltaH"+terms[i]].call( this,sourcei,targeti,src_type,tgt_type )
		if( terms[i]=="perimeter"){
			r+=currentterm.r
			per = currentterm
			dHlog[terms[i]] = currentterm.r
		} else {
			r += currentterm
			dHlog[terms[i]] = currentterm
		}
		
	}
	/*
	var adhesion = this.deltaHadhesion( targeti, src_type, tgt_type )
	var volume = this.deltaHvolume( src_type, tgt_type )
	var per = this.perconstrainti( targeti, tgt_type, src_type )
	var hper = per.r
	var invn = this.deltaHinvasiveness( src_type, tgt_type )
	var act = this.deltaHactmodel( sourcei, targeti, src_type, tgt_type )
	var conn = this.connectivityConstraint( targeti, tgt_type, src_type )
	var chemotaxis = this.deltaHchemotaxis( sourcei, targeti, src_type, tgt_type )
	*/
	if( ( this.logterms || 0 ) && this.time % 100 == 0 ){
		//console.log( {adh: adhesion, vol: volume, p: per.r, inv: invn, act: act, conn:conn, chem: chemotaxis } )
		console.log( dHlog )
	}

	//var dh = adhesion + volume + per.r + hper + invn + act + conn -chemotaxis

	return ({ dH: r, per: per })

}


CPM.prototype.monteCarloStep = function(){

		var delta_t = 0.0, p1i, p2i, src_type, tgt_type, N, hamiltonian

		// this loop tracks the number of copy attempts until one MCS is completed.
		while( delta_t < 1.0 ){

			// This is the expected time (in MCS) you would expect it to take to
			// randomly draw another border pixel.
			delta_t += 1./(this.bgborderpixels.length + this.cellborderpixels.length)

			// Randomly sample one of the CPM border pixels (the "source" (src)),
			// and one of its neighbors (the "target" (tgt)).
			if( this.ran( 0, this.bgborderpixels.length + this.cellborderpixels.length )
				< this.bgborderpixels.length ){
				p1i = this.bgborderpixels.sample()
			} else {
				p1i = this.cellborderpixels.sample()
			}
			
			N = this.neighi( p1i )
			p2i = N[this.ran(0,N.length-1)]
			
			src_type = this.pixti( p1i )
			tgt_type = this.pixti( p2i )

			// only compute the Hamiltonian if source and target belong to a different cell,
			// and do not allow a copy attempt into the stroma. Only continue if the copy attempt
			// would result in a viable cell.
			if( tgt_type >= 0 && src_type != tgt_type ){

				hamiltonian = this.deltaH( p1i, p2i, src_type, tgt_type )

				// probabilistic success of copy attempt
				if( this.docopy( hamiltonian.dH ) ){
					this.setpixi( p2i, src_type, hamiltonian.per.Pup )
				}
			}

		}

		this.time++ // update time with one MCS.
}


/* This allows using the code in either the browser or with nodejs. */
if( typeof module !== "undefined" ){
	var CPM = require("./CPM.js" )	
	var DiceSet = require("./DiceSet.js")
	module.exports = CPM
}

