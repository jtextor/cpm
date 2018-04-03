/** Run a CPM in 2D, and print centroids of all cells. Also save an image each [framerate=10] monte carlo steps
    after a burnin phase of [burnin=50] Monte Carlo Steps. */

//var CPM = require("../src/CPM.js")
var CPMchemotaxis = require("../src/CPMchemotaxis.js")
var BGCanvas = require("../src/BGCanvas.js")
var CPMStats = require("../src/CPMStats.js")
var CPMCanvas = require("../src/CPMCanvas.js")

var burnin=50, maxtime=5000

var framerate = parseInt(process.argv[2]) || 10

var C = new CPMchemotaxis( 2, {x: 400, y:200}, {
	LAMBDA_CHEMOTAXIS : [0,30],
	LAMBDA_CONNECTIVITY : [0,0],
	LAMBDA_P : [0,2],
	LAMBDA_V : [0,30],
	LAMBDA_ACT : [0,50],
	MAX_ACT : [0,40],
	P : [0,260],
	V : [0,500],
	J_T_STROMA : [NaN,15],
	J_T_ECM : [NaN,20],
	J_T_T : [ [NaN,NaN], [NaN,100] ],
	T : 20,
	ACT_MEAN : "geometric",
	GRADIENT_TYPE : "linear",
	GRADIENT_DIRECTION : [1,0]
})

var Cstat = new CPMStats( C )
var Cim = new CPMCanvas( C )
var Cimgradient = new BGCanvas( C )
Cimgradient.drawChemokineGradient( "0061ff" )
C.addStromaBorder()
var t = 0

// Seed cells
var i
for( i = 0 ; i < 2 ; i ++ ){
	C.seedCellAt( 1, [50,100] )
}

// burnin phase (let cells gain volume)
for( i = 0 ; i < burnin ; i ++ ){
	C.monteCarloStep()
}

// actual simulation
for( i = 0 ; i < maxtime ; i ++ ){
	C.monteCarloStep()
	Cstat.centroids()
	//console.log( Cstat.getConnectedness() )
	if( i % framerate == 0 ){
		//Cim.ctx.clearRect(0,0,Cim.el.width,Cim.el.height)
		Cim.clear("FFFFFF")
		Cim.ctx.drawImage( Cimgradient.el,0,0)
		Cim.drawStroma( "AAAAAA" )
		Cim.drawCells( 1, "000000")
		Cim.drawActivityValues( 1 )
		Cim.drawCellBorders( "FFFFFF" )
		Cim.writePNG( "output/2dchemokine"+t+".png" )
		t ++
	}
}
