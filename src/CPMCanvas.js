

// Constructor takes a CPM object
function CPMCanvas( C, options ){
	this.C = C
	this.zoom = (options && options.zoom) || 1

	if( typeof document !== "undefined" ){
		this.el = document.createElement("canvas")
		this.el.width = C.field_size.x*this.zoom
		this.el.height = C.field_size.y*this.zoom
		var parent_element = (options && options.parentElement) || document.body
		parent_element.appendChild( this.el )
	} else {
		var Canvas = require('canvas')
		this.el = new Canvas( C.field_size.x*this.zoom,
			C.field_size.y*this.zoom )
		this.fs = require('fs')
	}

	this.ctx = this.el.getContext("2d")
	this.ctx.lineWidth = .2
	this.ctx.lineCap="butt"
}


CPMCanvas.prototype = {
	pxf : function( p ){
		this.ctx.fillRect( this.zoom*p[0], this.zoom*p[1], this.zoom, this.zoom )
	},

	pxfnozoom : function( p ){
		this.ctx.fillRect( this.zoom*p[0], this.zoom*p[1], 1, 1 )
	},


	pxdrawl : function( p ){
		this.ctx.fillRect( this.zoom*p[0], this.zoom*p[1], 1, this.zoom )
	},


	pxdrawr : function( p ){
		this.ctx.fillRect( this.zoom*(p[0]+1), this.zoom*p[1], 1, this.zoom )
	},

	pxdrawd : function( p ){
		this.ctx.fillRect( this.zoom*p[0], this.zoom*(p[1]+1), this.zoom, 1 )
	},

	pxdrawu : function( p ){
		this.ctx.fillRect( this.zoom*p[0], this.zoom*p[1], this.zoom, 1 )
	},

	col : function( hex ){
		this.ctx.fillStyle="#"+hex;
	},

	clear : function( col ){
		col = col || "000000"
		this.ctx.fillStyle="#"+col
		this.ctx.fillRect( 0,0, this.el.width, this.el.height )
	},

	context : function(){
		return this.ctx
	},

	drawCellBorders : function( col ){
		col = col || "000000"
		var p, pc, pu, pd, pl, pr, i
		this.col( col )
		this.ctx.fillStyle="#"+col
		var cst =  this.C.cellborderpixels.elements
		for( i = 0 ; i < cst.length ; i ++ ){
			p = this.C.i2p( cst[i] )
			pc = this.C.pixt( [p[0],p[1],0] )
			pr = this.C.pixt( [p[0]+1,p[1],0] )
			pl = this.C.pixt( [p[0]-1,p[1],0] )		
			pd = this.C.pixt( [p[0],p[1]+1,0] )
			pu = this.C.pixt( [p[0],p[1]-1,0] )
			if( pc != pl  ){
				this.pxdrawl( p )
			}
			if( pc != pr ){
				this.pxdrawr( p )
			}
			if( pc != pd ){
				this.pxdrawd( p )
			}
			if( pc != pu ){
				this.pxdrawu( p )
			}
		}
	},

	drawActivityValues : function( kind ){
		var cst = Object.keys( this.C.cellpixelstype ), ii, sigma,
			tohex = function(a) { a = parseInt(255*a).toString(16); 
				return  ("00".substring(0,2-a.length))+a }, i
		for( i = 0 ; i < cst.length ; i ++ ){
			ii = cst[i]
			sigma = this.C.cellpixelstype[ii]
			if( this.C.id2t[sigma] == kind ){
				a = this.C.pxact( ii )/this.C.par("MAX_ACT",sigma)
				if( a > 0 ){
					if( a > 0.5 ){
						this.col( "FF"+tohex(2-2*a)+"00" )
					} else {
						this.col( tohex(2*a)+"FF00" )
					} 
					this.pxf( this.C.i2p( ii ) )
				}
			}
		}
	},

	drawOnCellBorders : function( col ){
		col = col || "000000"
		var p, pc, pu, pd, pl, pr
		this.col( col )
		this.ctx.fillStyle="#"+col
		var cst =  this.C.cellborderpixels.elements, i
		for( i = 0 ; i < cst.length ; i ++ ){
			this.pxf( this.C.i2p( cst[i] ) )
		}
	},


	drawCells : function( kind, col ){
		col = col || "000000"
		this.col( col )
		var cst = Object.keys( this.C.cellpixelstype ), i
		for( i = 0 ; i < cst.length ; i ++ ){
			if( this.C.id2t[this.C.cellpixelstype[cst[i]]] == kind ){
				this.pxf( this.C.i2p( cst[i] ) )
			}
		}
	},

	drawStroma : function( col ){
		col = col || "000000"
		this.col( col )
		var cst = Object.keys( this.C.stromapixelstype ), i
		for( i = 0 ; i < cst.length ; i ++ ){
			this.pxf( this.C.i2p( cst[i] ) )
		}
	},



	writePNG : function( fname ){
		this.fs.writeFileSync(fname, this.el.toBuffer())
	}
}


if( typeof module !== "undefined" ){
	module.exports = CPMCanvas
}

