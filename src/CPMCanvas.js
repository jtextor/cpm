
// Constructor takes a CPM object
function CPMCanvas( C ){
	this.C = C
	this.el = document.createElement("canvas")
	this.zoom = 2
	this.el.width = C.field_size.x*this.zoom
	this.el.height = C.field_size.y*this.zoom
	document.body.appendChild( this.el )
	this.ctx = this.el.getContext("2d")
}


CPMCanvas.prototype = {
	pxf : function( p ){
		this.ctx.fillRect( this.zoom*p[0], this.zoom*p[1], this.zoom, this.zoom )
	},

	col : function( hex ){
		this.ctx.fillStyle="#"+hex;
	},

	drawCellBorders : function(){
		this.col("EEEEEE")
		var tohex = function(d){
			var dd=parseInt(255*d)
			if( dd>15 ){
				return dd.toString(16)
			} else {
				return "0"+dd.toString(16)
			}
		}
		this.ctx.fillRect( 0,0, this.el.width, this.el.height )
		this.col( "000000")
		var cst =  this.C.cellborderpixels.elements
		for( i = 0 ; i < cst.length ; i ++ ){
			this.pxf( this.C.i2p( cst[i] ) )
		}

	}
}





