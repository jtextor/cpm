/** Class for outputting various statistics from a CPM simulation, as for instance
    the centroids of all cells (which is actually the only thing that's implemented
    so far) */

function CPMStats( C ){
	this.C = C
}

CPMStats.prototype = {
	cellsOnNetwork : function(){
		var px = this.C.cellborderpixels.elements, i,j, N, r = {}, t, tn
		for( i = 0 ; i < px.length ; i ++ ){
			t = this.C.pixt( this.C.i2p( px[i] ) )
			if( r[t] ) continue
			N = this.C.neigh( this.C.i2p( px[i] ) )
			for( j = 0 ; j < N.length ; j ++ ){
				if( this.C.pixt( N[j] ) < 0 ){
					r[t]=1; break
				}
			}
		}
		return r
	},
	centroids : function(){
		var cp = this.cellpixels()
		var tx = Object.keys( cp ), cx, cy, cz, j
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
	// returns an array of pixels per cell.
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

if( typeof module !== "undefined" ){
	module.exports = CPMStats
}

