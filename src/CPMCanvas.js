/** Class for taking a CPM grid and displaying it in either browser or with nodejs. */

// Constructor takes a CPM object C
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
		const {createCanvas} = require("canvas")
		this.el = createCanvas( C.field_size.x*this.zoom,
			C.field_size.y*this.zoom )
		this.fs = require("fs")
	}

	this.ctx = this.el.getContext("2d")
	this.ctx.lineWidth = .2
	this.ctx.lineCap="butt"
}


CPMCanvas.prototype = {


	/* Several internal helper functions (used by drawing functions below) : */
	pxf : function( p ){
		this.ctx.fillRect( this.zoom*p[0], this.zoom*p[1], this.zoom, this.zoom )
	},

	pxfnozoom : function( p ){
		this.ctx.fillRect( this.zoom*p[0], this.zoom*p[1], 1, 1 )
	},
	/* draw a line left (l), right (r), down (d), or up (u) of pixel p */
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

	/* For easier color naming */
	col : function( hex ){
		this.ctx.fillStyle="#"+hex
	},
	/* Color the whole grid in color [col] */
	clear : function( col ){
		col = col || "000000"
		this.ctx.fillStyle="#"+col
		this.ctx.fillRect( 0,0, this.el.width, this.el.height )
	},

	context : function(){
		return this.ctx
	},

	/* DRAWING FUNCTIONS ---------------------- */

	/* Use to draw the border of each cell on the grid in the color specified in "col"
	(hex format). This function draws a line around the cell (rather than coloring the
	outer pixels)*/
	drawCellBorders : function( col ){
		col = col || "000000"
		var p, pc, pu, pd, pl, pr, i
		this.col( col )
		this.ctx.fillStyle="#"+col

		// cst contains indices of pixels at the border of cells
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
	/* Use to show activity values of the act model using a color gradient, for
	cells in the grid of cellkind "kind". */
	drawActivityValues : function( kind ){

		// cst contains the pixel ids of all non-background/non-stroma cells in
		// the grid. The function tohex is used to convert computed color gradients
		// to the hex format.
		var cst = Object.keys( this.C.cellpixelstype ), ii, sigma, a,
			tohex = function(a) { a = parseInt(255*a).toString(16) 
				return  ("00".substring(0,2-a.length))+a }, i

		// loop over all pixels belonging to non-background, non-stroma
		for( i = 0 ; i < cst.length ; i ++ ){
			ii = cst[i]
			sigma = this.C.cellpixelstype[ii]

			// For all pixels that belong to the current kind, compute
			// color based on activity values, convert to hex, and draw.
			if( this.C.cellKind(sigma) == kind ){
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
	/* colors outer pixels of each cell */
	drawOnCellBorders : function( col ){
		col = col || "000000"
		this.col( col )
		this.ctx.fillStyle="#"+col
		var cst =  this.C.cellborderpixels.elements, i
		for( i = 0 ; i < cst.length ; i ++ ){
			this.pxf( this.C.i2p( cst[i] ) )
		}
	},

	/* Draw all cells of cellkind "kind" in color col (hex). */
	drawCells : function( kind, col ){
		col = col || "000000"
		this.col( col )

		// Object cst contains pixel index of all pixels belonging to non-background,
		// non-stroma cells.
		var cst = Object.keys( this.C.cellpixelstype ), i
		for( i = 0 ; i < cst.length ; i ++ ){
			if( this.C.cellKind(this.C.cellpixelstype[cst[i]]) == kind ){
				this.pxf( this.C.i2p( cst[i] ) )
			}
		}
	},

	/* Draw all stroma pixels in color col (hex). */
	drawStroma : function( col ){
		col = col || "000000"
		this.col( col )

		// Loop over all stroma pixels. Object cst contains
		// pixel index of all stroma pixels.
		var cst = Object.keys( this.C.stromapixelstype ), i
		for( i = 0 ; i < cst.length ; i ++ ){
			this.pxf( this.C.i2p( cst[i] ) )
		}
	},

	/* Draw grid to the png file "fname". */
	writePNG : function( fname ){
		this.fs.writeFileSync(fname, this.el.toBuffer())
	}
}

/* This allows using the code in either the browser or with nodejs. */
if( typeof module !== "undefined" ){
	module.exports = CPMCanvas
}

