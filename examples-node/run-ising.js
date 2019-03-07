/** Run a CPM in 2D, and print centroids of all cells. Also save an image each [framerate=10] monte carlo steps
    after a burnin phase of [burnin=50] Monte Carlo Steps. */

var CPM = require("../src/CPM.js")
var CPMCanvas = require("../src/CPMCanvas.js")

var maxtime=50
var fieldSize = parseInt(process.argv[2]) | 1000
var framerate = parseInt(process.argv[3]) || 10


var C = new CPM( 2, {x: fieldSize, y:fieldSize}, {
		LAMBDA_P : [0,0],
		LAMBDA_V : [0,0],
		LAMBDA_ACT : [0,0],
		MAX_ACT : [0,0],
		P : [0,0],
		V : [0,0],
		J_T_STROMA : [NaN,100],
		J_T_ECM : [NaN,1],
		J_T_T : [ [NaN,NaN], [NaN,100] ],
		T : 10,
		ACT_MEAN : "arithmetic"
	})

var Cim = new CPMCanvas( C )

// Create a cell (other than background)
let cid = C.makeNewCellID(1)
// For all non-stromaborder pixels in the grid: assign it randomly
// to either background or cell.
for( var i = 1 ; i < C.field_size.x ; i ++ ){
	for( var j = 1 ; j < C.field_size.y ; j ++ ){	
		if( Math.random() <= 0.5 ){
			C.setpix( [ i, j ], cid )
		}
	}
}

// actual simulation
var t = 0
for( i = 0 ; i < maxtime ; i ++ ){
	C.monteCarloStep()
	if( i % framerate == 0 ){
		Cim.clear( "FFFFFF" )
		//Cim.drawCells( 2, "990000" )
		Cim.drawCells( 1, "FF0000" )
		Cim.writePNG( "output/2d-"+t+".png" )
		t ++
	}
}
