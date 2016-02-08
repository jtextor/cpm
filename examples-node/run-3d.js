/** Run a CPM in 2D, and print centroids of all cells each 50 monte carlo steps
    after a burnin phase of 50 Monte Carlo Steps. */

var CPM = require("../src/CPM.js")
var CPMStats = require("../src/CPMStats.js")
var nrCells = parseInt(process.argv[2]) || 1
var fieldSize = parseInt(process.argv[3]) || 200

var C = new CPM( 3, {x: fieldSize, y:fieldSize, z:fieldSize}, {USE_CONNECTIVITY : [0,0,0],
	FRC_BOOST : [0,3,0],
	LAMBDA_P : [0,.1,.2],
	LAMBDA_V : [0,10,50],
	LAMBDA_ACT : [0,40,0],
	LAMBDA_DIR : [0,0,200],
	MAX_ACT : [20,20,0],
	//MAX_ACT : [0,0,0],
	//P : [0,340,80],
	//V : [0,500,100],
	P : [0,2200,440],
	V : [0,180,34],
	J_T_STROMA : [NaN,4,7],
	J_T_ECM : [NaN,5,5],
	J_T_T : [ [NaN,NaN,NaN], [NaN,10,-5], [NaN,-5,NaN] ],
	T : 7,
	ACT_MEAN : "arithmetic"
})

var Cstat = new CPMStats( C )

for( i = 0 ; i < nrCells ; i ++ ){
	C.seedCell()
}

// burnin phase
for( i = 0 ; i < 50 ; i ++ ){
	C.monteCarloStep()
}

// actual simulation
for( i = 0 ; i < 1000 ; i ++ ){
	C.monteCarloStep()
	if( i % 50 == 0 ){
		Cstat.centroids()
	}
}
