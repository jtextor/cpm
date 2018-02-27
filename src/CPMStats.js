/** Class for outputting various statistics from a CPM simulation, as for instance
    the centroids of all cells (which is actually the only thing that's implemented
    so far) */

function CPMStats( C ){
	this.C = C
	this.ndim = this.C.ndim
}

CPMStats.prototype = {
	// for simulation on FRC network. Returns all cells that are in contact with
	// a stroma cell.
	cellsOnNetwork : function(){
		var px = this.C.cellborderpixels.elements, i,j, N, r = {}, t
		for( i = 0 ; i < px.length ; i ++ ){
			t = this.C.pixti( px[i] )
			if( r[t] ) continue
			N = this.C.neighi(  px[i] )
			for( j = 0 ; j < N.length ; j ++ ){
				if( this.C.pixti( N[j] ) < 0 ){
					r[t]=1; break
				}
			}
		}
		return r
	},
	// For computing mean and variance with online algorithm
	updateOnline : function( aggregate, value ){
		
		var delta, delta2

		aggregate.count ++
		delta = value - aggregate.mean
		aggregate.mean += delta/aggregate.count
		delta2 = value - aggregate.mean
		aggregate.sqd += delta*delta2

		return aggregate
	},
	newOnline : function(){
		return( { count : 0, mean : 0, sqd : 0 } ) 
	},
	// return mean and variance of coordinates in a given dimension for cell t
	// (dimension as 0,1, or 2)
	cellStats : function( t, dim ){

		var aggregate, cpt, j, stats

		// the cellpixels object can be given as the third argument
		if( arguments.length == 3){
			cpt = arguments[2][t]
		} else {
			cpt = this.cellpixels()[t]
		}

		// compute using online algorithm
		aggregate = this.newOnline()

		// loop over pixels to update the aggregate
		for( j = 0; j < cpt.length; j++ ){
			aggregate = this.updateOnline( aggregate, cpt[j][dim] )
		}

		// get mean and variance
		stats = { mean : aggregate.mean, variance : aggregate.sqd / ( aggregate.count - 1 ) }
		return stats
	},
	// get the length (variance) of cell in a given dimension
	getLengthOf : function( t, dim ){
		
		// get mean and sd in x direction
		var stats = this.cellStats( t, dim )
		return stats.variance

	},
	// get the range of coordinates in dim for cell t
	getRangeOf : function( t, dim ){

		var minc, maxc, cpt, j

		// the cellpixels object can be given as the third argument
		if( arguments.length == 3){
			cpt = arguments[2][t]
		} else {
			cpt = this.cellpixels()[t]
		}

		// loop over pixels to find min and max
		minc = cpt[0][dim]
		maxc = cpt[0][dim]
		for( j = 1; j < cpt.length; j++ ){
			if( cpt[j][dim] < minc ) minc = cpt[j][dim]
			if( cpt[j][dim] > maxc ) maxc = cpt[j][dim]
		}
		
		return( maxc - minc )		

	},
	// center of mass of cell t
	// the cellpixels object can be given as the second argument
	getCentroidOf : function( t ){
		var j, dim, cvec, cpt
		if( arguments.length == 2 ){
			cpt = arguments[1][t]
		} else {
			cpt = this.cellpixels()[t]
		}
		// fill the array cvec with zeros first
		cvec = Array.apply(null, Array(this.ndim)).map(Number.prototype.valueOf,0)

		// loop over pixels to sum up coordinates
		for( j = 0; j < cpt.length; j++ ){
			// loop over coordinates x,y,z
			for( dim = 0; dim < this.ndim; dim++ ){
				cvec[dim] += cpt[j][dim]
			}		
		}

		// divide to get mean
		for( dim = 0; dim < this.ndim; dim++ ){
			cvec[dim] /= j
		}

		return cvec
	},
	// center of mass (return)
	getCentroids : function(){
		var cp = this.cellpixels()
		var tx = Object.keys( cp )
		var cvec, r = [], current, i

		// loop over the cells in tx to get their centroids
		for( i = 0; i < tx.length; i++ ){
			cvec = this.getCentroidOf( tx[i] )

			// output depending on ndim
			current = { id : tx[i], x : cvec[0], y : cvec[1] }
			if( this.ndim == 3 ){
				current["z"] = cvec[2]			
			}
			r.push( current )
		}
		return r
	},
	// center of mass (print to console)
	centroids : function(){
		var cp = this.cellpixels()
		var tx = Object.keys( cp )	
		var cvec, i

		// loop over the cells in tx to get their centroids
		for( i = 0; i < tx.length; i++ ){
			cvec = this.getCentroidOf( tx[i] )

			// eslint-disable-next-line no-console
			console.log( 
				tx[i] + "\t" +
				this.C.time + "\t" +
				this.C.time + "\t" +
				cvec.join("\t")
			)

		}
	},
	// returns an object with a key for each celltype (identity). 
	// The corresponding value is an array of pixel coordinates per cell.
	cellpixels : function(){
		var cp = {}
		var px = Object.keys( this.C.cellpixelstype ), t, i
		for( i = 0 ; i < px.length ; i ++ ){
			t = this.C.cellpixelstype[px[i]]
			if( !(t in cp ) ){
				cp[t] = []
			}
			cp[t].push( this.C.i2p( px[i] ) )
		}
		return cp
	}
}


/* This allows using the code in either the browser or with nodejs. */
if( typeof module !== "undefined" ){
	module.exports = CPMStats
}

