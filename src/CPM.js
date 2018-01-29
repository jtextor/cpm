/** The core CPM class. Can be used for two- or three-dimensional simulations. 
	Usable from browser and node.js.
*/
    
 
function CPM( ndim, field_size, conf ){

	// Attributes based on input parameters
	this.field_size = field_size			/* grid size ( Note: the grid will run from 0 to 
							field_size pixels, so the actual size in pixels is
							one larger. ) */
	this.ndim = ndim				// grid dimensions (2 or 3)
	this.conf = conf				// input parameter settings; see documentation.

	// Some functions/attributes depend on ndim:
	if( ndim == 2 ){
	
		// wrapper functions:
		//this.neigh = this.neigh2D		/* returns coordinates of neighbor pixels
		//					(including diagonal neighbors) */
		this.neighi = this.neighi2D		/* same, but with pixel index as in/output */
		this.neighC = this.neighC2D		/* returns indices of neighbor pixels
							(excluding diagnoal neighbors) */
		this.p2i = this.p2i2D			// converts pixel coordinates to a unique ID
		this.i2p = this.i2p2D			// converts pixel ID to coordinates

		this.field_size.z = 1			// for compatibility
		this.midpoint = 			// middle pixel in the grid.
		[ 	Math.round(this.field_size.x/2),
			Math.round(this.field_size.y/2) ] //,0 ]

	} else {
	
		// wrapper functions: 
		//this.neigh = this.neigh3D		/* returns coordinates of neighbor pixels
		//					(including diagonal neighbors) */
		this.neighi = this.neighi3D		/* same, but with pixel index as in/output */
		this.neighC = this.neighC3D		/* returns indices of neighbor pixels
							(excluding diagnoal neighbors) */
		this.p2i = this.p2i3D			// converts pixel coordinates to a unique ID
		this.i2p = this.i2p3D			// converts pixel ID to coordinates

		this.midpoint = 
		[	Math.round(this.field_size.x/2),
			Math.round(this.field_size.y/2),
			Math.round(this.field_size.z/2) ]
	}


	// Check that the grid size is not too big to store pixel ID in 32-bit number,
	// and allow fast conversion of coordinates to unique ID numbers.
	this.X_BITS = 1+Math.ceil( Math.log2( this.field_size.x ) )
	this.X_MASK = (1 << this.X_BITS)-1 

	this.Y_BITS = 1+Math.ceil( Math.log2( this.field_size.y ) )
	this.Y_MASK = (1 << this.Y_BITS)-1

	this.Z_BITS = 1+Math.ceil( Math.log2( this.field_size.z ) )
	this.Z_MASK = (1 << this.Z_BITS)-1

	this.dy = 1 << this.Y_BITS // for neighborhoods based on pixel index
	this.dz = 1 << ( this.Y_BITS + this.Z_BITS )


	if( this.X_BITS + this.Y_BITS + this.Z_BITS > 32 ){
		throw("Field size too large -- field cannot be represented as 32-bit number")
	} 

	// Attributes of the current CPM as a whole:
	this.nNeigh = this.neighi(0).length 		// neighbors per pixel (depends on ndim)
	this.nr_cells = 0				// number of cells currently in the grid
	this.time = 0					// current system time in MCS
	
	// track border pixels for speed (see also the DiceSet data structure)
	this.cellborderpixels = new DiceSet()
	this.bgborderpixels = new DiceSet() 

	// Attributes per pixel:
	this.cellpixelsbirth = {}		// time the pixel was added to its current cell.
	this.cellpixelstype = {}		// celltype (identity) of the current pixel.
	this.stromapixelstype = {}		// celltype (identity) for all stroma pixels.

	// Attributes per cell:
	this.cellvolume = []			
	this.cellperimeter = []		
	this.t2k = []				// celltype ("kind"). Example: this.t2k[1] is the celltype of cell 1.
	this.t2k[0] = 0

	// Wrapper: select function to compute activities based on ACT_MEAN in conf
	if( this.conf.ACT_MEAN == "arithmetic" ){
		this.activityAt = this.activityAtArith
	} else {
		this.activityAt = this.activityAtGeom
	}
	
	// (For function: see below.) By default the borders of the grid are set to stroma,
	// which prevents the cell from moving out of the grid.
	this.addStromaBorder()
}

CPM.prototype = {

	/* ------------- GETTING/SETTING PARAMETERS --------------- */

	/* 	helper to get cell-dependent parameters from conf.
		"name" is the parameter name, the 2nd/3rd arguments (optional) are
		the celltypes (identities) to find parameter settings for. */
	par : function( name ){
		if( arguments.length == 2 ){
			return this.conf[name][this.cellKind( arguments[1] ) ]
		}
		if( arguments.length == 3 ){
			return this.conf[name][this.cellKind(arguments[1] ) ][
				this.cellKind( arguments[2] ) ]
		}
	},
	/*  Get adhesion between two cells with type (identity) t1,t2 from "conf" using "this.par". */
	J : function( t1, t2 ){
		if( t1 == 0 ){
			// Adhesion between ECM and non-background/non-stroma cell
			if( t2 > 0 ){
				return this.par("J_T_ECM",t2)
			}
			// Adhesion ECM-ECM or ECM-stroma is 0.
			return 0
		} else if( t1 > 0 ){
			// adhesion between two non-background/non-stroma cells
			if( t2 > 0 ){
				return this.par("J_T_T",t1,t2)
			}
			// adhesion between stroma and non-background/non-stroma cells
			if( t2 < 0 ){
				return this.par("J_T_STROMA",t1)
			}
			// adhesion between ECM and non-background/non-stroma cells
			return this.par("J_T_ECM",t1)
		} else {
			// adhesion between stroma and non-background/non-stroma cells
			if( t2 > 0 ){
				return this.par("J_T_STROMA",t2)
			}
			// adhesion ECM-ECM or ECM-stroma is 0.
			return 0
		}
	},
	/* Get celltype/identity (pixt) or cellkind (pixk) of the cell at coordinates p or index i. */
	pixt : function( p ){
		return this.pixti( this.p2i(p) )
	},
	pixti : function( i ){
		return this.cellpixelstype[i] || this.stromapixelstype[i] || 0
	},
	pixki : function( i ){
		return this.cellKind( this.pixti(i) )
	},
	
	/* Get volume, or cellkind of the cell with type (identity) t */ 
	getVolume : function( t ){
		return this.cellvolume[t]
	},
	cellKind : function( t ){
		return this.t2k[ t ]
	},

	/* Assign the cell with type (identity) t to kind k.*/
	setCellKind : function( t, k ){
		this.t2k[ t ] = k
	},
	
	/* ------------- GRID HELPER FUNCTIONS --------------- */


	/* 	A mod function with sane behaviour for negative numbers. 
		Use to correctly link grid borders if TORUS = true. */
	fmodx : function( x ) {
		/*x = x % this.field_size.x
		if( x > 0 ) return x
		return ( x + this.field_size.x ) % this.field_size.x*/
		return x
	},
	fmody : function( x ) {
		/*x = x % this.field_size.y
		if( x > 0 ) return x
		return ( x + this.field_size.y ) % this.field_size.y*/
		return x
	},
	fmodz : function( x ) {
		/*x = x % this.field_size.z
		if( x > 0 ) return x
		return ( x + this.field_size.z ) % this.field_size.z*/
		return x
	},	


	/* 	Convert pixel coordinates to unique pixel ID numbers and back.
		Depending on this.ndim, the 2D or 3D version will be used by the 
		wrapper functions p2i and i2p. Use binary encoding for speed. */
	p2i3D : function( p ){
		return ( this.fmodx( p[0] ) << ( this.Z_BITS + this.Y_BITS ) ) + 
			( this.fmody( p[1] ) << this.Z_BITS ) + 
			this.fmodz( p[2] )
	},
	i2p3D : function( i ){
		return [i >> (this.Y_BITS + this.Z_BITS), ( i >> this.Z_BITS ) & this.Y_MASK, i & this.Z_MASK ]
	},
	p2i2D : function( p ){
		return ( this.fmodx( p[0] ) << this.Y_BITS ) + this.fmody( p[1] )
	},
	i2p2D : function( i ){
		return [i >> this.Y_BITS, i & this.Y_MASK]
	},
	
	
	/*	Return array of coordinates of neighbor pixels of the pixel at 
		coordinates p. The separate 2D and 3D functions are called by
		the wrapper function neigh, depending on this.ndim.

		! Note: these functions are no longer used (replaced by neighi2D and
			neighi3D below, which use pixel index instead of coordinates for speed).
	
	neigh2D : function( p ){
		// compute neighbor x and y coordinates using fmod to allow linked
		// grid borders.
		var xr = this.fmodx( p[0] + 1 )
		var xl = this.fmodx( p[0] - 1 )
		var yl = this.fmody( p[1] - 1 )
		var yr = this.fmody( p[1] + 1 )
		var z = this.fmodz( p[2] )
		// return an array with all neighbors
		return [ 
			[xl,yl,z], 	[p[0],yl,z],	[xr,yl,z],
			[xl,p[1],z],			[xr,p[1],z],
			[xl,yr,z],	[p[0],yr,z],	[xr,yr,z]
		]
	},
	neigh3D : function( p ){
		// compute neighbor x and y coordinates using fmod to allow linked
		// grid borders.
		var xr = this.fmodx( p[0] + 1 )
		var xl = this.fmodx( p[0] - 1 )
		var yl = this.fmody( p[1] - 1 )
		var yr = this.fmody( p[1] + 1 )
		var zl = this.fmodz( p[2] - 1 )
		var zr = this.fmodz( p[2] + 1 )
		// return an array with all neighbors
		return [
			[xl,yl,p[2]],   [xl,yl,zl], 	[xl,yl,zr],
			[xl,p[1],p[2]], [xl,p[1],zl], 	[xl,p[1],zr],
			[xl,yr,p[2]],   [xl,yr,zl], 	[xl,yr,zr],
		
			[p[0],yl,p[2]], [p[0],yl,zl], 	[p[0],yl,zr],
			[p[0],p[1],zl],			[p[0],p[1],zr],
			[p[0],yr,p[2]], [p[0],yr,zl], 	[p[0],yr,zr],
		
			[xr,yl,p[2]],   [xr,yl,zl], 	[xr,yl,zr],
			[xr,p[1],p[2]], [xr,p[1],zl], 	[xr,p[1],zr],
			[xr,yr,p[2]],   [xr,yr,zl], 	[xr,yr,zr]
		]
	},
	*/
	neighi2D : function( i ){
		return [
			i-1, i+1,  
			i+this.dy+1, i+this.dy, i+this.dy-1,
			i-this.dy+1, i-this.dy, i-this.dy-1 ]
	},
	neighi3D : function( i ){
		var dy = this.dy
		var dz = this.dz
		return[
			i-1-dy+dz,	i -dy +dz,	i+1 -dy +dz,
			i-1+dz,		i +dz,		i+1 +dz,
			i-1+dy+dz,	i +dy +dz,	i+1 +dy +dz,

			i-1-dy,		i-dy,		i+1-dy,
			i-1,				i+1,
			i-1+dy,		i+dy,		i+1+dy,

			i-1-dy-dz,	i-dy-dz,	i+1-dy-dz,
			i-1-dz,		i-dz,		i+1 -dz,
			i-1+dy-dz,	i+dy-dz,	i+1+dy-dz
		]
	},



	/* 
		The following functions hardcode the neighbors of pixels in a given neighborhood,
		by id number. Consider a local 2D region of 9 pixels with the following ID numbers:
			0	3	5
			1	8	6
			2	4	7
		neighC2D/neighC2Da return objects for each pixel ID (keys) containing arrays with
		their neighbors (values). neighC2Da also considers diagonal neighbors, whereas
		neighC2D does not. The current implementation uses only neighC2D, called by the
		wrapper neighC if ndim = 2.
	*/
	neighC2D : {
		0 : [1,3],
		1 : [0,2,8],
		2 : [1,4],
		3 : [0,5,8],
		4 : [2,7,8],
		5 : [3,6],
		6 : [5,7,8],
		7 : [4,6],
		8 : [1,3,4,6]
	},
	neighC2Da : {
		0 : [1,3,8], 
		1 : [0,2,3,4,8], 
		2 : [1,4,8], 
		3 : [0,1,5,6,8], 
		4 : [1,2,6,7,8], 
		5 : [3,6,8],
		6 : [3,4,5,7,8], 
		7 : [4,6,8],  
		8 : [0,1,2,3,4,5,6,7]
	},
	/* 
		The following functions hardcode the neighbors of pixels in a given 3D neighborhood,
		by id number. Consider a local 3D region of 3*9 pixels with the following ID numbers:
			Upper layer:
			0	3	6
			1	4	7
			2	5	8
			
			Middle layer:
			9	12	15
			10	13	16
			11	14	17
			
			Lower layer:
			18	21	24
			19	22	25
			20	23	26
			
		neighC3D/neighC3Da returns an object with for each pixel ID (keys) linked to arrays with
		their neighbors (values). Considers only non-diagonal neighbors. Called by the
		wrapper neighC if ndim = 3.
	*/	
	neighC3D : {
		0 : [1,3,9],			//3 corner ( 2 + 1 ) : 2 from same layer, 1 from layer below
		1 : [0,2,4,10],			//4 border ( 3 + 1 )
		2 : [1,5,11],			//3 corner ( 2 + 1 )
		3 : [0,4,6,12],			//4 border ( 3 + 1 )
		4 : [1,3,5,7,13],		//5 center ( 4 + 1 )
		5 : [2,4,8,14],			//4 border ( 3 + 1 )
		6 : [3,7,15],			//3 corner ( 2 + 1 )
		7 : [4,6,8,16],			//4 border ( 3 + 1 )
		8 : [5,7,17],			//3 corner ( 2 + 1 )
		
		9 : [0,10,12,18],		//4 corner ( 2 + 1 + 1 ) : 2 same layer, 1 upper, 1 lower
		10 : [1,9,13,11,19],	//5 border ( 3 + 1 + 1 )
		11 : [2,10,14,20],		//4 corner ( 2 + 1 + 1 )
		12 : [3,9,13,15,21],	//5 border ( 3 + 1 + 1 )
		13 : [4,10,12,14,16,22],//6 center ( 4 + 1 + 1 )
		14 : [5,11,13,17,23],	//5 border ( 3 + 1 + 1 )
		15 : [6,12,16,24],		//4 corner ( 3 + 1 + 1 )
		16 : [7,13,15,17,25],	//5 border ( 3 + 1 + 1 )
		17 : [8,14,16,26],		//4 corner ( 2 + 1 + 1 )
		
		18 : [11,19,21],		//3 corner ( 2 + 1 ) : 2 same layer, 1 layer above
		19 : [10,18,20,22],		//4 border ( 3 + 1 )
		20 : [11,19,23],		//3 corner ( 2 + 1 )
		21 : [12,18,22,24],		//4 border ( 3 + 1 )
		22 : [13,19,21,23,25],	//5 center ( 4 + 1 )
		23 : [14,20,22,26],		//4 border ( 3 + 1 )
		24 : [15,21,25], 		//3 corner ( 2 + 1 )
		25 : [16,22,24,26],		//4 border ( 3 + 1 )
		26 : [17,23,25]			//3 corner ( 2 + 1 )
	},

	

	/* ------------- MATH HELPER FUNCTIONS --------------- */

	/* Random integer number between incl_min and incl_max */
	ran : function(incl_min, incl_max) {
		return Math.floor(Math.random() * (1.0 + incl_max - incl_min)) + incl_min
	},
	/* dot product */
	dot : function( p1, p2 ){
		var r = 0., i = 0
		for( ; i < p1.length ; i ++ ){
			r += p1[i]*p2[i]
		}
		return r
	},
	/*  To bias a copy attempt p1->p2 in the direction of target point pt.
	Vector p1 -> p2 is the direction of the copy attempt, 
	Vector p1 -> pt is the preferred direction. Then this function returns the cosine
	of the angle alpha between these two vectors. This cosine is 1 if the angle between
	copy attempt direction and preferred direction is 0 (when directions are the same), 
	-1 if the angle is 180 (when directions are opposite), and 0 when directions are
	perpendicular. */
	pointAttractor : function( p1, p2, pt ){
		var r = 0., i = 0, norm1 = 0, norm2 = 0, d1=0., d2=0.
		for( ; i < p1.length ; i ++ ){
			d1 = p1[i]-pt[i]; d2 = p2[i]-p1[i]
			r += d1 * d2
			norm1 += d1*d1
			norm2 += d2*d2
		}
		return r/Math.sqrt(norm1)/Math.sqrt(norm2)
	},
	
	
	/* ------------- COMPUTING THE HAMILTONIAN --------------- */

	/*  Returns the Hamiltonian around pixel p, which has ID (type) tp (surrounding pixels'
	 *  types are queried). This Hamiltonian only contains the neighbor adhesion terms.
	 */
	H : function( i, tp ){

		var r = 0, tn, N = this.neighi( i )

		// Loop over pixel neighbors
		for( var j = 0 ; j < N.length ; j ++ ){
			tn = this.pixti( N[j] )
			if( tn != tp ) r += this.J( tn, tp )
		}

		return r
	},


	/* The volume constraint term of the Hamiltonian for the cell with id t.
	   Use vgain=0 for energy of current volume, vgain=1 for energy if cell gains
	   a pixel, and vgain = -1 for energy if cell loses a pixel. 
	*/
	volconstraint : function( vgain, t ){

		// the background "cell" has no volume constraint.
		if( t == 0 ) return 0	

		var vdiff = this.par("V",t) - (this.cellvolume[t] + vgain)
		return this.par("LAMBDA_V",t)*vdiff*vdiff
	},

	/* The perimeter constraint term of the Hamiltonian. Returns the change in
	   perimeter energy if the pixel at coordinates p is changed from cell "oldt"
	   into "newt".
	*/
	perconstrainti : function( pixid, oldt, newt ){
		var N = this.neighi( pixid ), perim_before = {},
			perim_after = {}, i, t, ta, r=0, Pup = {}
		
		/* Loop over the local neighborhood and track perimeter of the old 
		and new cell (oldt, newt) before/after update. Note that perimeter
		for other cells will not change. */
		perim_before[oldt]=0; perim_before[newt]=0
		perim_after[oldt]=0; perim_after[newt]=0

		for( i = 0 ; i < N.length ; i ++ ){

			// Type of the current neighbor
			t = this.pixti( N[i] )

			if( t != oldt ){
				perim_before[oldt] ++
				if( t == newt ) perim_before[newt] ++
			}
			if( t != newt ){
				perim_after[newt] ++
				if( t == oldt ) perim_after[oldt] ++
			}
		}
		// Compare perimeter before and after to evaluate the change in perimeter.
		// Use this to compute the change in perimeter energy.
		ta = Object.keys( perim_after )
		for( i = 0 ; i < ta.length ; i ++ ){
			if( ta[i] > 0 ){
				Pup[ta[i]] = perim_after[ta[i]] - perim_before[ta[i]]
				var Pt = this.par("P",ta[i]), l = this.par("LAMBDA_P",ta[i])
				t = this.cellperimeter[ta[i]]+Pup[ta[i]] - Pt
				r += l*t*t
				t = this.cellperimeter[ta[i]] - Pt
				r -= l*t*t
			}
		}

		// output variables: r is the change in perimeter energy, Pup the
		// perimeter updates
		return { r:r, Pup:Pup }
	},

	/* Current activity (under the Act model) of the pixel with ID i. */
	pxact : function( i ){
		var age = (this.time - this.cellpixelsbirth[i]), 
			actmax = this.par("MAX_ACT",this.cellpixelstype[i])
		return (age > actmax) ? 0 : actmax-age
	},
	/* Act model : compute local activity values within cell around pixel i.
	 * Depending on settings in conf, this is an arithmetic (activityAtArith)
	 * or geometric (activityAtGeom) mean of the activities of the neighbors
	 * of pixel i.
	 */
	activityAtArith : function( i ){
		var t = this.pixti( i )
		
		// no activity for background/stroma
		if( t <= 0 ){ return 0 }
		var tn, nN=1, N = this.neighi(i), r = this.pxact(i) 
		var has_stroma_neighbour = false
		
		// loop over neighbor pixels
		for( var j = 0 ; j < N.length ; j ++ ){ 
			tn = this.pixti(N[j]) 
			
			// a neighbor only contributes if it belongs to the same cell
			if( tn == t ){
				r += this.pxact( N[j] )
				nN ++ 
			}
			// track if there are stroma neighbors
			if( tn < 0 ){
				has_stroma_neighbour = true
			}
		}
		// Special case: encourage cell migration along fibers of the FRC network.
		// In that case, encode FRC as stroma.
		if( has_stroma_neighbour && this.conf.FRC_BOOST ){
			r *= this.par("FRC_BOOST",t)
		}
		return r/nN
	},
	activityAtGeom : function( i ){
		var t = this.pixti( i ), tn

		// no activity for background/stroma
		if( t <= 0 ){ return 0 }
		var N = this.neighi( i )
		var nN = 1
		var r = this.pxact( i )
		var has_stroma_neighbour = false

		// loop over neighbor pixels
		for( var j = 0 ; j < N.length ; j ++ ){ 
			tn = this.pixti(N[j]) 

			// a neighbor only contributes if it belongs to the same cell
			if( tn == t ){
				if( this.pxact( N[j] ) == 0 ) return 0
				r *= this.pxact( N[j] )
				nN ++ 
			}
			// track if there are stroma neighbors
			if( tn < 0 ){
				has_stroma_neighbour = true
			}
		}
		// Special case: encourage cell migration along fibers of the FRC network.
		// In that case, encode FRC as stroma.
		if( has_stroma_neighbour && this.conf.FRC_BOOST ){
			r *= this.par("FRC_BOOST",1)
		}
		return Math.pow(r,1/nN)
	},

	/* Connectivity constraint. 
	*/
	nrConnectedComponents : function( N, t, tp ){
		var r = 0, i, j, v, visited = [], stack = [], _this=this
		var Nt = function( k ){
			if( k < N.length ){ 
				var t = _this.pixti( N[k] ) 
				return t >= 0 ? t : 0
			}
			return tp
		}
		for( i = 0 ; i < N.length+1 ; i ++ ){
			stack = []
			if( !visited[i] && ( Nt(i) == t ) ){
				r ++
				stack.push( i )
				while( stack.length > 0 ){
					v = stack.pop()
					visited[v] = true
					for( j = 0 ; j < this.neighC[v].length ; j ++ ){
						if( !visited[this.neighC[v][j]] 
							&& ( Nt(this.neighC[v][j]) == t ) ){
							stack.push( this.neighC[v][j] )
						}
					}
				}
			}
		}
		return r
	},
	/* Evaluate the change in connectivity energy associated with changing pixel p
		from cellid told to tnew.
	*/
	connectivityConstraint : function( i, told, tnew ){
		var N, cost = this.par("LAMBDA_CONNECTIVITY",told) 
		if( cost > 0 ){
			N = this.neighi( i )
			if( this.nrConnectedComponents( N, told, told )
				!= this.nrConnectedComponents( N, told, tnew ) ){
				return cost
			}
		}
		cost = this.par("LAMBDA_CONNECTIVITY",tnew) 
		if( cost > 0 ){
			if( !N ) N = this.neighi( i )
			if( this.nrConnectedComponents( N, tnew, told )
				!= this.nrConnectedComponents( N, tnew, tnew ) ){
				return cost
			}
		}
		return 0
	},
	
	/* ------------- COPY ATTEMPTS --------------- */

	/* 	Simulate one MCS (a number of copy attempts depending on grid size):
		1) Randomly sample one of the border pixels for the copy attempt.
		2) Compute the change in Hamiltonian for the suggested copy attempt.
		3) With a probability depending on this change, decline or accept the 
		   copy attempt and update the grid accordingly. 
	*/
	monteCarloStep : function(){

		var delta_t = 0.0, p1i, p2i, src_type, tgt_type, N, per, maxact, lambdaact

		// this loop tracks the number of copy attempts until one MCS is completed.
		while( delta_t < 1.0 ){

			// This is the expected time (in MCS) you would expect it to take to
			// randomly draw another border pixel.
			delta_t += 1./(this.bgborderpixels.length + this.cellborderpixels.length)

			// Randomly sample one of the CPM border pixels (the "source" (src)),
			// and one of its neighbors (the "target" (tgt)).
			if( this.ran( 0, this.bgborderpixels.length + this.cellborderpixels.length )
				< this.bgborderpixels.length ){
				p1i = this.bgborderpixels.sample()
			} else {
				p1i = this.cellborderpixels.sample()
			}
			
			N = this.neighi( p1i )
			p2i = N[this.ran(0,N.length-1)]
			
			src_type = this.pixti( p1i )
			tgt_type = this.pixti( p2i )

			// only compute the Hamiltonian if source and target belong to a different cell,
			// and do not allow a copy attempt into the stroma. Only continue if the copy attempt
			// would result in a viable cell.
			if( tgt_type >= 0 && src_type != tgt_type ){

				// change in Hamiltonian: basic Hamiltonian
				var deltaH = this.H( p2i, src_type ) - this.H( p2i, tgt_type )
				
				// change in Hamiltonian: volume gain of src cell
				deltaH += this.volconstraint( 1, src_type ) - 
					this.volconstraint( 0, src_type )
				// change in Hamiltonian: volume loss of tgt cell
				deltaH += this.volconstraint( -1, tgt_type ) - 
					this.volconstraint( 0, tgt_type )

				// change in Hamiltonian: perimeter constraint
				per = this.perconstrainti( p2i, tgt_type, src_type )
				deltaH += per.r
			
				// invasiveness. If there is a celltype a that prefers to invade
				// pixels of type b. Currently not used.
				if( tgt_type != 0 && src_type != 0 && this.conf.INV ){
					deltaH -= this.par( "INV", tgt_type, src_type )
				}	

				// change in Hamiltonian: Act model.
				// use parameters for the source cell, unless that is the background.
				// In that case, use parameters of the target cell.
				if( src_type != 0 ){
					maxact = this.par("MAX_ACT",src_type)
					lambdaact = this.par("LAMBDA_ACT",src_type)
				} else {
					// special case: punishment for a copy attempt from background into
					// an active cell. This effectively means that the active cell retracts,
					// which is different from one cell pushing into another (active) cell.
					maxact = this.par("MAX_ACT",tgt_type)
					lambdaact = this.par("LAMBDA_ACT",tgt_type)
				}
				if( maxact > 0 ){
					deltaH += lambdaact
						*(this.activityAt( p2i ) - 
						this.activityAt( p1i ))/maxact
				}
			
				// change in Hamiltonian: connectivity constraint
				deltaH += this.connectivityConstraint( p2i, tgt_type, src_type ) 
	
				// probabilistic success of copy attempt
				if( this.docopy( deltaH ) ){
					this.setpixi( p2i, src_type, per.Pup )
				}
			}
		}
		this.time ++	// update time with one MCS.
	},

	/* Determine whether copy attempt will succeed depending on deltaH (stochastic). */
	docopy :  function( deltaH ){
		if( deltaH < 0 ) return true
		return Math.random() < Math.exp( -deltaH / this.conf.T )
	},
	/* Change the pixel at position p (coordinates) into cellid t. 
	Update cell perimeters with Pup (optional parameter).*/
	setpixi :  function( i, t, Pup ){
		var t_old = this.cellpixelstype[i]

		// If Pup not specified, compute it here.
		if( !Pup ){
			Pup = this.perconstrainti( i, t_old, t ).Pup
		}
		// Specific case: changing a pixel into background (t = 0) is done by delpix.
		if( t == 0 ){
			this.delpixi( i )
		} else {
			if( t_old > 0 ){
				// also update volume of the old cell
				// (unless it is background/stroma)
				this.cellvolume[t_old] --
				
				// if this was the last pixel belonging to this cell, 
				// remove the cell altogether.
				if( this.cellvolume[t_old] == 0 ){
					delete this.cellvolume[t_old]
					delete this.t2k[t_old]
				}
			}
			// store the time when the new pixel was added
			this.cellpixelsbirth[i] = this.time

			// update volume of the new cell and cellid of the pixel.
			this.cellpixelstype[i] = t
			this.cellvolume[t] ++
		}
		// update cellperimeters and border pixels.
		this.updateperimeter( Pup )
		this.updateborderneari( i )
	},
	setpix : function( p, t, Pup ){
		return this.setpixi( this.p2i(p), t, Pup )
	},
	/* Change pixel at coordinates p/index i into background (t=0) */
	delpixi : function( i ){
		var t = this.cellpixelstype[i]

		// Reduce cell volume.
		this.cellvolume[t] --

		// remove this pixel from objects cellpixelsbirth / cellpixelstype
		delete this.cellpixelsbirth[i]
		delete this.cellpixelstype[i]

		// if this was the last pixel belonging to this cell, 
		// remove the cell altogether.
		if( this.cellvolume[t] == 0 ){
			delete this.cellvolume[t]
			delete this.t2k[t]
		}

	},
	delpix : function( p ){
		return this.delpixi( this.p2i(p) )
	},
	/* Update each cell's perimeter after a successful copy attempt. */
	updateperimeter : function( Pup ){
		var i, ta = Object.keys( Pup )
		for( i = 0 ; i < ta.length ; i ++ ){
			this.cellperimeter[ta[i]] += Pup[ta[i]]
		}
	},
	/* Update border elements after a successful copy attempt. */
	updateborderneari : function( i ){
		var j, k, t, isborder, N

		// neighborhood + pixel itself (in indices)
		var Ni = this.neighi(i)
		Ni.push(i)
		
		for( j = 0 ; j < Ni.length ; j ++ ){

			i = Ni[j]
			t = this.pixti( i )

			// stroma pixels are not stored
			if( t < 0 ) continue
			isborder = false

			// loop over neighborhood of the current pixel.
			// if the pixel has any neighbors belonging to a different cell,
			// it is a border pixel.			
			N = this.neighi( Ni[j] )
			for( k = 0 ; k < N.length ; k ++ ){
				if( this.pixti( N[k] ) != t ){
					isborder = true; break
				}
			}

			// if current pixel is background, it should not be part of
			// cellborderpixels (only for celltypes > 0). Whether it
			// should be part of bgborderpixels depends on isborder.
			if( t == 0 ){
				this.cellborderpixels.remove( i )
				if( isborder ){
					this.bgborderpixels.insert( i )
				} else {
					this.bgborderpixels.remove( i )
				}
			// if current pixel is from a cell, this works the other way around.
			} else {
				this.bgborderpixels.remove( i )
				if( isborder ){
					this.cellborderpixels.insert( i )
				} else {
					this.cellborderpixels.remove( i )
				}
			}
		}
	},


	/* ------------- MANIPULATING CELLS ON THE GRID --------------- */

	/* Initiate a new cellid for a cell of celltype "kind", and create elements
	   for this cell in the relevant arrays (cellvolume, cellperimeter, t2k).*/
	makeNewCellID : function( kind ){
		var newid = ++ this.nr_cells
		this.cellvolume[newid] = 0
		this.cellperimeter[newid] = 0
		this.setCellKind( newid, kind )
		return newid
	},
	/* Seed a new cell of celltype "kind" onto position "p".*/
	seedCellAt : function( kind, p ){
		var newid = this.makeNewCellID( kind )
		var id = this.p2i( p )
		this.setpixi( id, newid )
		return newid
	},
	/* Seed a new cell of celltype "kind" to a random position on the grid.
		Opts: fixToStroma (only seed next to stroma),
		brutal (allow seeding into other non-background cell),
		avoid (do not allow brutal seeding into cell of type "avoid"). */
	seedCell : function( kind, opts ){
	
		// N: max amount of trials, avoids infinite loops in degenerate
		// situations
		var N = 1000,  
			p, stromapixels, Ns, t
			
		// By default, seed a cell of kind 1, without any options.
		if( arguments.length < 1 ){
			kind = 1
		}
		if( arguments.length < 2 ){
			opts = {}
		}
		if( !opts.fixToStroma ){
			for( ; N>0 ; N-- ){
				// random position on the grid
				p = [this.ran( 0, this.field_size.x-1 ),
					this.ran( 0, this.field_size.y-1 )]
				if( this.ndim == 3 ){
					p.push( this.ran( 0, this.field_size.z-1 ) )
				} else {
					p.push( 0 )
				}
				t = this.pixti( this.p2i( p ) )

				// seeding successful if this position is background, or if
				// the brutal option is on.
				if( t == 0 || opts.brutal ){
					if( !opts.hasOwnProperty("avoid") ||
						opts.avoid != this.cellKind(t) ){
						break
					}
				} 
			}
		// if option fixToStroma
		} else {
			stromapixels = Object.keys( this.stromapixelstype )
			Ns=stromapixels.length
			for( ; N>0 ; N-- ){
				// Choose a random stroma pixel, and then randomly choose one of its
				// neighbors.
				p = this.i2p( this.neighi( stromapixels[this.ran(0,Ns-1)] )[
					this.ran(0,this.nNeigh-1)] )
				// continue until you find a background pixel for seeding.
				if( this.pixti( this.p2i( p )) == 0 ){
					break
				}
			}
		}
		if( N == 0 ) return false
		return this.seedCellAt( kind, p, opts )
	},
	/* Change the pixels defined by stromavoxels (array of coordinates p) into
	   the special stromatype. */
	addStroma : function( stromavoxels, stromatype ){
		// the celltype used for stroma is default -1.
		if( arguments.length < 2 ){
			stromatype = -1
		}
		// store stromapixels in a special object. 
		for( var i = 0 ; i < stromavoxels.length ; i ++ ){
			this.stromapixelstype[this.p2i( stromavoxels[i] )]=stromatype
		}
	},
	addStromaBorder : function( stromatype ){
		var stromavoxels = [], i
		var x = this.field_size.x, y = this.field_size.y, z = this.field_size.z

		// the celltype used for stroma is default -1.
		if( arguments.length < 1 ){
			stromatype = -1
		}
		// borders in x direction
		for( i = 0 ; i <= x; i ++ ){
			stromavoxels.push( [ i, 0, 0 ] )
			stromavoxels.push( [ i, y-1, 0 ] )
			stromavoxels.push( [ i, 0, z-1 ] )
			stromavoxels.push( [ i, y-1, z-1 ] )
		}
		// borders in y direction
		for( i = 0; i <= y; i++ ){
			stromavoxels.push( [ 0, i, 0] )
			stromavoxels.push( [ 0, i, z-1 ] )
			stromavoxels.push( [ x-1, i, 0 ] )
			stromavoxels.push( [ x-1, i, z-1 ] )
		}
		// borders in z direction
		for( i = 0; i <= z; i++ ){
			stromavoxels.push( [ 0, 0, i ] )
			stromavoxels.push( [ x-1, 0, i ] )
			stromavoxels.push( [ 0, y-1, i ] )
			stromavoxels.push( [ x-1, y-1, i ] )
		}
		
		this.addStroma( stromavoxels, stromatype )
	},


	/** Checks whether position p (given as array) is adjacent to any pixel of type
	t */
	isAdjacentToType : function( p, t ){
		var i = this.p2i(p)
		var N = this.neighi( i )
		return N.map( function(pn){ return this.pixti(pn)==t } ).
			reduce( function(xa,x){ return xa || x }, false ) 
	},
	countCells : function( kind ){
		return this.t2k.reduce( function(xa,x){ return (x==kind) + xa } )
	},

}

/* This allows using the code in either the browser or with nodejs. */
if( typeof module !== "undefined" ){
	var DiceSet = require("./DiceSet.js")
	module.exports = CPM
}
