/* Class for writing simple images of the simulation to a file.
   Only supports NodeJS. */

var fs = require("fs")

// Constructor takes a CPM object
function CPMImageDumper( C ){
	this.C = C
}


// Methods
CPMImageDumper.prototype = {
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
	writeBorders2D : function( filename ){
		var a = [],i,j,p
		for( i = 0 ; i < this.C.field_size.y ; i ++ ){
			a.push( new Array(this.C.field_size.x) )
		}
		var cst =  this.C.cellborderpixels.elements
		for( i = 0 ; i < cst.length ; i ++ ){
			p = this.C.i2p( cst[i] )
			a[p[1]][p[0]] = this.C.id2t[this.C.pixt(p)]
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
	
	}
}

