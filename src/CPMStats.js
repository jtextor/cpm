/** Class for outputting various statistics from a CPM simulation, as for instance
    the centroids of all cells (which is actually the only thing that's implemented
    so far) */

function CPMStats( C ){
	this.C = C
	this.ndim = this.C.ndim
	if( this.ndim == 2 ){
		this.getCentroids = this.getCentroids2D
		this.centroids = this.centroids2D
		this.getCentroidOf = this.getCentroidOf2D
	} else {
		this.getCentroids = this.getCentroids3D
		this.centroids = this.centroids3D
		this.getCentroidOf = this.getCentroidOf3D
	}
}

CPMStats.prototype = {
	// for simulation on FRC network. Returns all cells that are in contact with
	// a stroma cell.
	cellsOnNetwork : function(){
		var px = this.C.cellborderpixels.elements, i,j, N, r = {}, t, tn
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
	// center of mass of cell t 
	getCentroidOf2D : function( t ){
		var j, cx, cy

		// array of pixels belonging to cell t
		var cpt = this.cellpixels()[t]
		
		// loop over pixels and sum up coordinates
		for( j = 0; j < cpt.length ; j++ ){
			cx += cpt[j][0]
			cy += cpt[j][1]
		}

		// divide to get mean coordinates
		cx /= j; cy /= j

		return [cx, cy]
	},
	getCentroidOf3D : function( t ){
		var j, cx, cy, cz

		// array of pixels belonging to cell t
		var cpt = this.cellpixels()[t]
		
		// loop over pixels and sum up coordinates
		for( j = 0; j < cpt.length ; j++ ){
			cx += cpt[j][0]
			cy += cpt[j][1]
			cz += cpt[j][2]
		}
		// divide to get mean coordinates
		cx /= j; cy /= j; cz /= j
		return [cx, cy, cz]
	},
	// center of mass (return)
	getCentroids2D : function(){
		var cp = this.cellpixels()
		var tx = Object.keys( cp ), cx, cy, i, j, r = []
		for( i = 0 ; i < tx.length ; i ++ ){
			cx=0; cy=0
			// loop over the cells in cp
			for( j = 0 ; j < cp[tx[i]].length ; j ++ ){
				cx += cp[tx[i]][j][0]
				cy += cp[tx[i]][j][1]
			}
			cx /= j; cy /= j
			r.push( { id : tx[i], x : cx, y : cy } )
		}
		return r		
	},
	getCentroids3D : function(){
		var cp = this.cellpixels()
		var tx = Object.keys( cp ), cx, cy, cz, i, j, r = []
		for( i = 0 ; i < tx.length ; i ++ ){
			cx=0; cy=0; cz=0
			for( j = 0 ; j < cp[tx[i]].length ; j ++ ){
				cx += cp[tx[i]][j][0]
				cy += cp[tx[i]][j][1]
				cz += cp[tx[i]][j][2]
			}
			cx /= j; cy /= j ; cz /= j
			r.push( { id : tx[i], x : cx, y : cy, z : cz } )
		}
		return r		
	},
	// center of mass (print to console)
	centroids3D : function(){
		var cp = this.cellpixels()
		var tx = Object.keys( cp ), cx, cy, cz, i, j
		for( i = 0 ; i < tx.length ; i ++ ){
			cx=0; cy=0; cz=0
			for( j = 0 ; j < cp[tx[i]].length ; j ++ ){
				cx += cp[tx[i]][j][0]
				cy += cp[tx[i]][j][1]
				cz += cp[tx[i]][j][2]
			}
			cx /= j; cy /= j ; cz /= j
			console.log( tx[i] +"\t"+ 
				this.C.time +"\t"+
				this.C.time +"\t"+
				cx  +"\t"+
				cy  +"\t"+
				cz )
		}
	},
	centroids2D : function(){
		var cp = this.cellpixels()
		var tx = Object.keys( cp ), cx, cy, i, j
		for( i = 0 ; i < tx.length ; i ++ ){
			cx=0; cy=0
			for( j = 0 ; j < cp[tx[i]].length ; j ++ ){
				cx += cp[tx[i]][j][0]
				cy += cp[tx[i]][j][1]
			}
			cx /= j; cy /= j 
			console.log( tx[i] +"\t"+ 
				this.C.time +"\t"+
				this.C.time +"\t"+
				cx  +"\t"+
				cy  )
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

