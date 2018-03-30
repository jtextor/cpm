/* This class creates a canvas of the size of the current CPM for drawing
backgrounds. It is not appended to the html page by default but can be copied
as a whole to quickly draw a chemokine gradient onto an existing CPMCanvas. */

// Constructor
function BGCanvas( C, options ){
	this.C = C
	this.zoom = (options && options.zoom) || 1
	this.wrap = (options && options.wrap) || [0,0,0]
	this.width = this.wrap[0]
	this.height = this.wrap[1]

	if( this.width == 0 || this.C.field_size.x < this.width ){
		this.width = this.C.field_size.x
	}
	if( this.height == 0 || this.C.field_size.y < this.height ){
		this.height = this.C.field_size.y
	}

	if( typeof document !== "undefined" ){
		this.el = document.createElement("canvas")
		this.el.width = this.width*this.zoom
		this.el.height = this.height*this.zoom//C.field_size.y*this.zoom
		//var parent_element = (options && options.parentElement) || document.body
		//parent_element.appendChild( this.el )
	} else {
		const {createCanvas} = require("canvas")
		this.el = createCanvas( this.width*this.zoom,
			this.height*this.zoom )
		this.fs = require("fs")
	}

	this.ctx = this.el.getContext("2d")
	this.ctx.lineWidth = .2
	this.ctx.lineCap="butt"
}


BGCanvas.prototype = {


	/* Several internal helper functions (used by drawing functions below) : */
	pxf : function( p ){
		this.ctx.fillRect( this.zoom*p[0], this.zoom*p[1], this.zoom, this.zoom )
	},

	pxfnozoom : function( p ){
		this.ctx.fillRect( this.zoom*p[0], this.zoom*p[1], 1, 1 )
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

	i2p : function( i ){
		var p = this.C.i2p( i ), dim
		for( dim = 0; dim < p.length; dim++ ){
			if( this.wrap[dim] != 0 ){
				p[dim] = p[dim] % this.wrap[dim]
			}
		}
		return p
	},

	/* DRAWING FUNCTIONS ---------------------- */


	setopacity : function( alpha ){
		this.ctx.globalAlpha = alpha
	},
	chemokineIntensity : function( p ){

		var gradienttype = this.C.conf["GRADIENT_TYPE"]
		var gradientvec = this.C.conf["GRADIENT_DIRECTION"]
		let gmax, gval


		if( gradienttype == "linear" ){
			gmax = gradientvec[0]*this.C.field_size.x + gradientvec[1]*this.C.field_size.y
			gval = 0.0 + (gradientvec[0]*p[0]) + ( gradientvec[1]*p[1] )
			return( gval/gmax )
		} else if( gradienttype == "radial" ){
			var maxx = gradientvec[0], maxy = gradientvec[1]
			if( this.C.field_size.x - maxx > maxx ){
				maxx = this.C.field_size.x - maxx
			}
			if( this.C.field_size.y - maxy > maxy ){
				maxy = this.C.field_size.y - maxy
			}
			var distx = p[0] - gradientvec[0], disty = p[1] - gradientvec[1]
			gmax = Math.sqrt( maxx*maxx + maxy*maxy )
			gval = 0.0 + Math.sqrt( distx*distx + disty*disty )

		} else {
			throw("Unknown gradienttype")
		}
		return (1-gval/gmax)
	},
	drawChemokineGradient : function( col ){

		var i,j,alpha
		col = col || "000000"
		this.col( col )

		for( i = 0; i < this.C.field_size.x; i++ ){
			for( j = 0; j < this.C.field_size.y; j++ ){
				alpha = 1*this.chemokineIntensity( [i,j] )
				this.setopacity( alpha*alpha )
				this.pxf( [i,j] )
			}
		}
		this.setopacity( 1 )

	}


}

/* This allows using the code in either the browser or with nodejs. */
if( typeof module !== "undefined" ){
	module.exports = BGCanvas
}

