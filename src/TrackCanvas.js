/* This draws cell tracks (movement of cell centroid) on a canvas.
Unlike the CPMCanvas method, tracks should NOT be cleared every time a new 
MCS is started. Tracks are not added to the document body by default and
should be added manually instead. */

// Constructor takes a CPM object
function TrackCanvas( Cstat, options ){
	this.Cstat = Cstat
	this.C = Cstat.C
	this.zoom = (options && options.zoom) || 1

	if( typeof document !== "undefined" ){
		this.el = document.createElement("canvas")
		this.el.width = this.C.field_size.x*this.zoom
		this.el.height = this.C.field_size.y*this.zoom
	} else {
		var Canvas = require("canvas")
		this.el = new Canvas( this.C.field_size.x*this.zoom,
			this.C.field_size.y*this.zoom )
	}
	this.ctx = this.el.getContext("2d")
}

TrackCanvas.prototype = {
	drawTracks : function( color, opacity ){
		this.ctx.fillStyle = "#"+color
		opacity = opacity || 1.0
		var old_opacity = this.ctx.globalAlpha
		var tracks = this.Cstat.getCentroids()
		// Loop over cells on the grid and color the centroid of each.
		for( var i = 0 ; i < tracks.length ; i ++ ){
			var p = tracks[i]
			this.ctx.fillRect( this.zoom*p.x, this.zoom*p.y, 
				.5*this.zoom, .5*this.zoom )
		}
		this.ctx.globalAlpha = opacity
		this.ctx.drawImage( this.el, 0, 0 )
		this.ctx.globalAlpha = old_opacity
	}
}

/* This allows using the code in either the browser or with nodejs. */
if( typeof module !== "undefined" ){
	module.exports = TrackCanvas
}

