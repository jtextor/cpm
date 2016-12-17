

// Constructor takes a CPM object
function TrackCanvas( Cstat, options ){
	this.Cstat = Cstat
	this.zoom = (options && options.zoom) || 1

	if( typeof document !== "undefined" ){
		this.el = document.createElement("canvas")
		this.el.width = C.field_size.x*this.zoom
		this.el.height = C.field_size.y*this.zoom
	} else {
		var Canvas = require('canvas')
		this.el = new Canvas( C.field_size.x*this.zoom,
			C.field_size.y*this.zoom )
	}
	this.ctx = this.el.getContext("2d")
}

TrackCanvas.prototype = {
	drawTracks : function( ctx, color, opacity ){
		this.ctx.fillStyle = "#"+color
		opacity = opacity || 1.0
		var old_opacity = ctx.globalAlpha
		var tracks = this.Cstat.getCentroids()
		for( var i = 0 ; i < tracks.length ; i ++ ){
			var p = tracks[i]
			this.ctx.fillRect( this.zoom*p.x, this.zoom*p.y, 
				.5*this.zoom, .5*this.zoom )
		}
		ctx.globalAlpha = opacity
		ctx.drawImage( this.el, 0, 0 )
		ctx.globalAlpha = old_opacity
	}
}


if( typeof module !== "undefined" ){
	module.exports = TrackCanvsas
}

