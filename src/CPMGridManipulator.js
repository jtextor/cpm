/* This class contains methods that should be executed once per monte carlo step.
   Examples are cell division, cell death etc.
 */

function CPMGridManipulator( C ){
	this.C = C
	this.Cs = new CPMStats( C )
}

CPMGridManipulator.prototype = {

	prepare: function(){
		this.cellpixels = this.Cs.cellpixels()
	},

	killCell: function( t ){
		//console.log("killing cell "+t)
		/*var cp = this.cellpixels
		for( var j = 0 ; j < cp[t].length ; j ++ ){
			this.C.setpix( cp[t][j], 0 )
		}*/
		this.C.setCellKind( t, 4 )
	},

	doKilling : function( kind, p ){
		var cp = this.cellpixels, C = this.C
		var ids = Object.keys(cp)
		for( var i = 0 ;  i < ids.length ; i++ ){
			var t = ids[i]
			var k = C.cellKind(t)
			if( k == kind && ( C.getVolume( t ) < C.conf.V[kind]*0.8 ) ){
				if( Math.random() < p ){
					this.killCell( t )
				}
			}
		}
	},

	doDivision2D: function( kind, p, Cim ){
		var cp = this.cellpixels, C = this.C
		var ids = Object.keys(cp)
		for( var i = 0 ;  i < ids.length ; i++ ){
			var id = ids[i]
			var k = C.cellKind(id)
			/*if( C.getVolume( id ) < C.conf.V[C.cellKind(id)]/2 ){
				C.killCell( t )
			}*/
			if( k == kind && ( C.getVolume( id ) >= C.conf.V[k]-50 ) && Math.random() < p ){
				var bxx = 0, bxy = 0, byy=0,
					com = C.getCenterOfMass( id ), cx, cy, x2, y2, side, b, T, D, x0, y0, x1, y1,
					L1, L2
				for( var j = 0 ; j < cp[id].length ; j ++ ){
					cx = cp[id][j][0] - com[0]
					cy = cp[id][j][1] - com[1]

					bxx += cx*cx
					bxy += cx*cy
					byy += cy*cy
				}

				if( bxy == 0 ){
					x0 = 0
					y0 = 0
					x1 = 1
					y1 = 0
				} else {
					T = bxx + byy
					D = bxx*byy - 2*bxy
					//L1 = T/2 + Math.sqrt(T*T/4 - D)
					L2 = T/2 - Math.sqrt(T*T/4 - D)

					x0 = 0
					y0 = 0
					x1 = L2 - byy
					y1 = bxy
				}

				var nid = C.makeNewCellID( k )

				for( var j = 0 ; j < cp[id].length ; j ++ ){
					x2 = cp[id][j][0]-com[0]
					y2 = cp[id][j][1]-com[1]
					side = (x1 - x0)*(y2 - y0) - (x2 - x0)*(y1 - y0)
					if( side > 0 ){
						C.setpix( cp[id][j], nid ) 
					}
					if( Cim ){
						if( side > 0 ){
							Cim.col("FF8800")
							Cim.pxf( cp[id][j] )
						} else {
							Cim.col("0088FF")
							Cim.pxf( cp[id][j] )
						}
						//console.log( side )
					}
				}
			}
		}
	}
}

if( typeof module !== "undefined" ){
	module.exports = CPMGridManipulator
	var CPMStats = require("./CPMStats.js")
}

