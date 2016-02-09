/** Class for outputting various statistics from a CPM simulation, as for instance
    the centroids of all cells (which is actually the only thing that's implemented
    so far) */

var fs = require("fs")

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
	writeMap2D : function( filename, mapf ){
		var i,j,k,s,wstream=fs.createWriteStream( filename )
		if( !wstream ){
			throw("Could not open file: "+filename)
		}
		for( i = 0 ; i < this.C.field_size.y ; i ++ ){
			s = []
			for( j = 0 ; j < this.C.field_size.x ;j ++ ){
				s.push( mapf(j,i) )
			}
			wstream.write( new Buffer( s ) )
		}
		wstream.end()
	},
	writeMap3D : function( filename ){
		var a = [],i,j,p
		for( i = 0 ; i < this.C.field_size.y ; i ++ ){
			a.push( new Array(this.C.field_size.x) )
		}
		var cst = Object.keys( this.C.cellpixelstype )
		for( i = 0 ; i < cst.length ; i ++ ){
			p = this.C.i2p( cst[i] )
			a[p[1]][p[0]] = 1
		}
		var wstream=fs.createWriteStream( filename )
		if( !wstream ){
			throw("Could not open file: "+filename)
		}
		for( i = 0 ; i < this.C.field_size.y ; i ++ ){
			wstream.write( new Buffer( a[i] ) )
		}
		wstream.end()
	},
	celltypeMap : function( filename ){
		var c = this.C
		if( c.ndim == 2 ){
			this.writeMap2D( filename, function(i,j){ return c.pixt([i,j,0]) } )
		} else if( c.ndim == 3 ){
			this.writeMap3D( filename )
		}
	},
	actMap : function( filename ){
		var c = this.C
		if( c.ndim == 2 ){
			this.writeMap2D( filename, function(i,j){ return c.pxact([i,j,0]) } )
		}
	
	},
	centroids : function(){
		var cp = {}
		var px = Object.keys( this.C.cellpixelstype ), t, i
		for( i = 0 ; i < px.length ; i ++ ){
			t = this.C.cellpixelstype[px[i]]
			if( !(t in cp ) ){
				cp[t] = []
			}
			cp[t].push( this.C.i2p( px[i] ) )
		}
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
	}
}
if( typeof module !== "undefined" ){
	module.exports = CPMStats
}
