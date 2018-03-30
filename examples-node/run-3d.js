/** Run a CPM in 2D, and print centroids of all cells each 50 monte carlo steps
    after a burnin phase of 50 Monte Carlo Steps.
    The simulation seeds [nrCells] cells of two different kinds. */

var CPM = require("../src/CPM.js")
var CPMStats = require("../src/CPMStats.js")
var nrCells = parseInt(process.argv[2]) || 1
var fieldSize = parseInt(process.argv[3]) || 200
var framerate = parseInt(process.argv[4]) || 10

var C = new CPM( 3, {x: fieldSize, y:fieldSize, z:fieldSize}, {
	LAMBDA_CONNECTIVITY : [0,0,0],
	LAMBDA_P : [0,.1,.2],
	LAMBDA_V : [0,10,50],
	LAMBDA_ACT : [0,40,0],
	MAX_ACT : [20,20,0],
	P : [0,2200,440],
	V : [0,180,34],
	J_T_STROMA : [NaN,4,7],
	J_T_ECM : [NaN,5,5],
	J_T_T : [ [NaN,NaN,NaN], [NaN,10,-5], [NaN,-5,NaN] ],
	T : 7,
	ACT_MEAN : "arithmetic"
})
C.addStromaBorder()
var Cstat = new CPMStats( C )

// Seed nrCells of kind 1 and kind 2
for( i = 0 ; i < nrCells ; i ++ ){
	C.seedCell(1)
	C.seedCell(2)
}

// burnin phase
for( i = 0 ; i < 50 ; i ++ ){
	C.monteCarloStep()
}

// actual simulation
for( i = 0 ; i < 1000 ; i ++ ){
	C.monteCarloStep()
	if( i % framerate == 0 ){
		// This function does not exist:
		// Cstat.celltypeMap("output/"+(i/framerate)+".bin")
		Cstat.centroids()
	}
}
