/** The core CPM class. Can be used for two- or three-dimensional simulations. 
	Usable from browser and node.js.
*/
    
 
function CPM( ndim, field_size, conf ){
	this.field_size = field_size
	if( ndim == 2 ){
		this.neigh = this.neigh2D
		this.neighC = this.neighC2D
		this.p2i = this.p2i3D
		this.i2p = this.i2p3D

		this.crossesBorder = function( x, y ){
			var d = x[0]-y[0]
			if( d < -1 || d > 1 ) return true
			d = x[1]-y[1]
			if( d < -1 || d > 1 ) return true
			return false
		}
		this.field_size.z = 1
		this.midpoint = [Math.round(this.field_size.x/2),Math.round(this.field_size.y/2),0]
	} else {
		this.neigh = this.neigh3D
		this.neighC = this.neighC3D
		this.p2i = this.p2i2D
		this.i2p = this.i2p2D

		this.crossesBorder = function( x, y, z ){
			var d = x[0]-y[0]
			if( d < -1 || d > 1 ) return true
			d = x[1]-y[1]
			if( d < -1 || d > 1 ) return true
			d = x[2]-y[2]
			if( d < -1 || d > 1 ) return true
			return false
		}

		this.midpoint = [Math.round(this.field_size.x/2),Math.round(this.field_size.y/2),Math.round(this.field_size.z/2)]
	}

	this.X_BITS = 1+Math.ceil( Math.log2( this.field_size.x ) )
	this.X_MASK = (1 << this.X_BITS)-1

	this.Y_BITS = 1+Math.ceil( Math.log2( this.field_size.y ) )
	this.Y_MASK = (1 << this.Y_BITS)-1

	this.Z_BITS = 1+Math.ceil( Math.log2( this.field_size.z ) )
	this.Z_MASK = (1 << this.Z_BITS)-1


	if( this.X_BITS + this.Y_BITS + this.Z_BITS > 32 ){
		throw("Field size too large -- field cannot be represented as 32-bit number")
	} else {
		console.log( "using size : ", this.X_BITS + this.Y_BITS + this.Z_BITS )
	}

	this.ndim = ndim
	this.nNeigh = this.neigh([0,0,0].slice(0,ndim)).length

	this.nr_cells = 0
	
	this.cellborderpixels = new DiceSet()
	this.bgborderpixels = new DiceSet() 
	this.cellpixelsbirth = {}
	this.cellpixelstype = {}
	this.cellvolume = []
	this.cellperimeter = []
	this.centerofmass = []
	
	this.stromapixelstype = {}
	
	this.time = 0
	
	this.conf = conf //{
		// working defaults for 2D migration
		/*LAMBDA_CONNECTIVITY : [0,0,0],
		FRC_BOOST : [0,3,0],
		LAMBDA_P : [0,2,1],
		LAMBDA_V : [0,50,50],
		LAMBDA_ACT : [0,140,0],
		LAMBDA_DIR : [0,0,200],
		MAX_ACT : [0,40,0],
		P : [0,440,100],
		V : [0,400,100],
		J_T_STROMA : [NaN,16,16],
		J_T_ECM : [NaN,20,20],
		J_T_T : [ [NaN,NaN,NaN], [NaN,100,-40], [NaN,-40,NaN] ],
		T : 20,
		ACT_MEAN : "geometric" */
		
		// working defaults for 3D migration
		/*LAMBDA_CONNECTIVITY : [0,0,0],
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
		ACT_MEAN : "arithmetic"*/
	//}
	
	if( this.conf.ACT_MEAN == "arithmetic" ){
		this.activityAt = this.activityAtArith
	} else {
		this.activityAt = this.activityAtGeom
	}
	
	this.id2t = []
}

CPM.prototype = {
	/* constants */
	KIND_NUCLEUS : 2,
	
	/* helper to get type-dependent parameters */
	par : function( name ){
		if( arguments.length == 2 ){
			return this.conf[name][this.id2t[arguments[1]]]
		}
		if( arguments.length == 3 ){
			return this.conf[name][this.id2t[arguments[1]]][this.id2t[arguments[2]]]
		}
	},
	/* A mod function with sane behaviour for negative numbers. */
	fmodx : function(x) {
		x = x%this.field_size.x
		if( x > 0 ) return x
		return (x+this.field_size.x)%this.field_size.x;
	},
	fmody : function(x) {
		x = x%this.field_size.y
		if( x > 0 ) return x
		return (x+this.field_size.y)%this.field_size.y;
	},
	fmodz : function(x) {
		x = x%this.field_size.z
		if( x > 0 ) return x
		return (x+this.field_size.z)%this.field_size.z;
	},
	ran : function(incl_min, incl_max) {
		return Math.floor(Math.random() * (1.0 + incl_max - incl_min)) + incl_min
	},
	p2i3D : function( p ){
		return (this.fmodx(p[0]) << (this.Z_BITS+this.Y_BITS)) + 
			(this.fmody(p[1]) << this.Z_BITS) + 
			this.fmodz(p[2])
	},

	i2p3D : function( i ){
		return [i >> (this.Y_BITS + this.Z_BITS), (i >> this.Z_BITS) & this.Y_MASK, i & this.Z_MASK]
	},

	p2i2D : function(p){
		return this.fmody(p[0]) << this.Y_BITS + this.fmodx(p[1])
	},

	i2p2D : function( i ){
		return [i >> this.Y_BITS, i & this.Y_MASK, 0]
	},

	pixt : function( p ){
		var i = this.p2i(p)
		return (this.cellpixelstype[i] ||  
			this.stromapixelstype[i] || 0 )
	},
	pixk : function( p ){
		return this.id2t[this.pixt(p)]	
	},
	dot : function( p1, p2 ){
		var r = 0., i = 0
		for( ; i < p1.length ; i ++ ){
			r += p1[i]*p2[i]
		}
		return r
	},
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

	getVolume : function( t ){
		return this.cellvolume[t]
	},

	getCenterOfMass : function( t ){
		var r = this.centerofmass[t].slice(0)
		r[0] /= this.cellvolume[t]
		r[1] /= this.cellvolume[t]
		r[2] /= this.cellvolume[t]
		return r
	},
	volconstraint : function( vgain, t ){
		if( t == 0 ) return 0
		var vdiff = this.par("V",t) - (this.cellvolume[t] + vgain)
		return this.par("LAMBDA_V",t)*vdiff*vdiff
	},
	/* 
	 * average activity values within cell around pixel p,
	 * using arithmetic averaging
	 */
	activityAtArith : function( p ){
		var t = this.pixt( p )
		if( t <= 0 ){ return 0 }
		var tn, nN=1, N = this.neigh(p), r = this.pxact( this.p2i( p ) ) 
		var has_stroma_neighbour = false
		for( var i = 0 ; i < N.length ; i ++ ){ 
			tn = this.pixt(N[i]) 
			if( tn == t ){
				r += this.pxact( this.p2i( N[i] ) )
				nN ++ 
			}
			if( tn < 0 ){
				has_stroma_neighbour = true
			}
		}
		if( has_stroma_neighbour ){
			r *= this.par("FRC_BOOST",t)
		}
		return r/nN
	},
	/* 
	 * average activity values within cell around pixel p,
	 * using geometric averaging
	 */
	activityAtGeom : function( p ){
		var t = this.pixt( p ), tn
		if( t <= 0 ){ return 0 }
		var N = this.neigh( p )
		var nN = 1
		var r = this.pxact( this.p2i( p ) )
		var has_stroma_neighbour = false
		for( var i = 0 ; i < N.length ; i ++ ){ 
			tn = this.pixt(N[i]) 
			if( tn == t ){
				if( this.pxact( this.p2i( N[i] ) ) == 0 ) return 0
				r *= this.pxact( this.p2i( N[i] ) )
				nN ++ 
			}
			if( tn < 0 ){
				has_stroma_neighbour = true
			}
		}
		if( has_stroma_neighbour ){
			r *= this.par("FRC_BOOST",1)
		}
		return Math.pow(r,1/nN)
	},
	pxact : function( i ){
		var age = (this.time - this.cellpixelsbirth[i]), 
			actmax = this.par("MAX_ACT",this.cellpixelstype[i])
		return (age > actmax) ? 0 : actmax-age
	},
	perconstraint : function( p, oldt, newt ){
		var N = this.neigh( p ), if_old = {},
			if_new = {}, i, t, ta, r=0, Pup = {}
		if_old[oldt]=0; if_old[newt]=0
		if_new[oldt]=0; if_new[newt]=0
		for( i = 0 ; i < N.length ; i ++ ){
			t = this.pixt( N[i] )
			if( !if_old[t] ) if_old[t]=0
			if( !if_new[t] ) if_new[t]=0
			if( t != oldt ){
				if_old[oldt] ++
				if_old[t] ++
			}
			if( t != newt ){
				if_new[newt] ++
				if_new[t] ++
			}
		}
		ta = Object.keys( if_new )
		for( i = 0 ; i < ta.length ; i ++ ){
			if( ta[i] > 0 ){
				Pup[ta[i]] = if_new[ta[i]] - if_old[ta[i]]
				var Pt = this.par("P",ta[i]), l = this.par("LAMBDA_P",ta[i])
				t = this.cellperimeter[ta[i]]+Pup[ta[i]] - Pt
				r += l*t*t
				t = this.cellperimeter[ta[i]] - Pt
				r -= l*t*t
			}
		}
		return { r:r, Pup:Pup }
	},
	updateperimeter : function( Pup ){
		var i, ta = Object.keys( Pup )
		for( i = 0 ; i < ta.length ; i ++ ){
			this.cellperimeter[ta[i]] += Pup[ta[i]]
		}
	},
	updatebordernear : function( p ){
		var Np = this.neigh( p ), i, j, k, t, isborder, N
		Np.push( p )
		for( j = 0 ; j < Np.length ; j ++ ){
			p = Np[j]
			t = this.pixt( p )
			if( t < 0 ) continue
			isborder = false
			N = this.neigh( p )
			for( k = 0 ; k < N.length ; k ++ ){
				if( this.pixt( N[k] ) != t ){
					isborder = true; break;
				}
			}
			i = this.p2i( p )
			if( t == 0 ){
				this.cellborderpixels.remove( i )
				if( isborder ){
					this.bgborderpixels.insert( i )
				} else {
					this.bgborderpixels.remove( i )
				}
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
	/*
	 *  Adhesion between two cell types
	 */
	J : function( t1, t2 ){
		if( t1 == 0 ){
			if( t2 > 0 ) return this.par("J_T_ECM",t2)
			return 0
		} else if( t1 > 0 ){
			if( t2 > 0 ) return this.par("J_T_T",t1,t2)
			if( t2 < 0 ) return this.par("J_T_STROMA",t1)
			return this.par("J_T_ECM",t1)
		} else {
			if( t2 > 0 ) return this.par("J_T_STROMA",t2)
			return 0
		}
	},
	/*
	 *  Returns the Hamiltonian around pixel p, which has type tp (surrounding pixels'
	 *  types are queried)
	 */
	H : function( p, tp ){
		var r = 0, tn, N = this.neigh( p )
		for( var i = 0 ; i < N.length ; i ++ ){
			tn = this.pixt( N[i] )
			if( tn != tp ) r += this.J( tn, tp )
		}
		return r
	},
	isViable : function( p, t ){
		return true
		if( t != 0 && this.id2t[t] != this.KIND_NUCLEUS ){
			return true
		}
		var i = 0, N = this.neigh(p)
		if( t == 0 ){
			for( ; i < N.length ; i ++ ){
				if( this.pixk( N[i] ) == this.KIND_NUCLEUS ){
					return false
				}
			}
			return true
		}
		for( ; i < N.length ; i ++ ){
			if( this.pixt( N[i] ) == 0 ){
				return false
			}
		}
		return true
	},
	monteCarloStep : function(){
		var delta_t = 0.0, p1, p2, src_type, tgt_type, N, per, maxact, lambdaact, dir

		while( delta_t < 1.0 ){

			delta_t += 1./(this.bgborderpixels.length + this.cellborderpixels.length)

			if( this.ran( 0, this.bgborderpixels.length + this.cellborderpixels.length )
				< this.bgborderpixels.length ){
				p1 = this.bgborderpixels.sample()
			} else {
				p1 = this.cellborderpixels.sample()
			}
			p1 = this.i2p( p1 )
			N = this.neigh( p1 )
			p2 = N[this.ran(0,N.length-1)]
			if( this.crossesBorder( p1, p2 ) ) continue
			
			src_type = this.pixt( p1 )
			tgt_type = this.pixt( p2 )

			if( tgt_type >= 0 && src_type != tgt_type && this.isViable( p2, src_type ) ){

				var deltaH = this.H( p2, src_type ) - this.H( p2, tgt_type )
				
				// volume gain of src cell
				deltaH += this.volconstraint( 1, src_type ) - 
					this.volconstraint( 0, src_type )
				// volume loss of tgt cell
				deltaH += this.volconstraint( -1, tgt_type ) - 
					this.volconstraint( 0, tgt_type )

				per = this.perconstraint( p2, tgt_type, src_type )
				deltaH += per.r
				
				var dhpre = deltaH
			
				if( tgt_type != 0 && src_type != 0 ){
					deltaH -= this.par( "INV", tgt_type, src_type )
				}	

				if( src_type != 0 ){
					maxact = this.par("MAX_ACT",src_type)
					lambdaact = this.par("LAMBDA_ACT",src_type)
					dir = this.par("LAMBDA_DIR", src_type)
				} else {
					maxact = this.par("MAX_ACT",tgt_type)
					lambdaact = this.par("LAMBDA_ACT",tgt_type)
					dir = this.par("LAMBDA_DIR", tgt_type)
				}

				if( maxact > 0 && this.id2t[tgt_type] != this.KIND_NUCLEUS ){
					deltaH += lambdaact
						*(this.activityAt( p2 ) - 
						this.activityAt( p1 ))/maxact
				}
				
				/*if( this.conf.target_point ){
				}*/

				if( dir > 0 ){
					// HACK this forces cell nuclei to move towards the center of their 
					// respective cells
					if( src_type != 0 ){
						deltaH += dir * this.pointAttractor( p1, p2, this.midpoint
							//this.getCenterOfMass( src_type - 1 ) 
						)
					} else {
						deltaH += dir * this.pointAttractor( p1, p2, this.midpoint
							//this.getCenterOfMass( tgt_type - 1 ) 
						)
					}
				}
			
				deltaH += this.connectivityConstraint( p2, tgt_type, src_type ) 
	
				if( this.docopy( deltaH ) ){
					this.setpix( p2, src_type, per.Pup )
				} 
			}
		}
		this.time ++
	},
	docopy :  function( deltaH ){
		if( deltaH < 0 ) return true;
		return Math.random() < Math.exp( -deltaH / this.conf.T )
	},
	setpix :  function( p, t, Pup ){
		var i = this.p2i(p)
		var t_old = this.cellpixelstype[i]
		if( !Pup ){
			Pup = this.perconstraint( p, t_old, t ).Pup
		}
		if( t == 0 ){
			this.delpix( p )
		} else {
			this.centerofmass[t][0] += p[0]
			this.centerofmass[t][1] += p[1]
			this.centerofmass[t][2] += p[2]
			if( t_old > 0 ){
				this.cellvolume[t_old] --
				this.centerofmass[t_old][0] -= p[0]
				this.centerofmass[t_old][1] -= p[1]
				this.centerofmass[t_old][2] -= p[2]
			}
			if( this.id2t[t_old] != this.KIND_NUCLEUS ){
				this.cellpixelsbirth[i] = this.time
			} else {
				this.cellpixelsbirth[i] = -Infinity
			}
			this.cellpixelstype[i] = t
			this.cellvolume[t] ++
		}
		this.updateperimeter( Pup )
		this.updatebordernear( p )
	},
	delpix : function( p ){
		var i = this.p2i(p)
		var t = this.cellpixelstype[i]
		this.centerofmass[t][0] -= p[0]
		this.centerofmass[t][1] -= p[1]
		this.centerofmass[t][2] -= p[2]
		this.cellvolume[t] --
		delete this.cellpixelsbirth[i]
		delete this.cellpixelstype[i]
		if( this.cellvolume[t] == 0 ){
			delete this.centerofmass[t]
			delete this.cellvolume[t]
			delete this.id2t[t]
		}
	},
	neigh3D : function( p ){
		var xr = this.fmodx(p[0]+1)
		var xl = this.fmodx(p[0]-1)
		var yl = this.fmody(p[1]-1)
		var yr = this.fmody(p[1]+1)
		var zl = this.fmodz(p[2]-1)
		var zr = this.fmodz(p[2]+1)
		return [
			[xl,yl,p[2]],   [xl,yl,zl],[xl,yl,zr],
			[xl,p[1],p[2]], [xl,p[1],zl],[xl,p[1],zr],
			[xl,yr,p[2]],   [xl,yr,zl],[xl,yr,zr],
		
			[p[0],yl,p[2]], [p[0],yl,zl],[p[0],yl,zr],
			[p[0],yr,p[2]], [p[0],yr,zl],[p[0],yr,zr],
		
			[p[0],p[1],zl],[p[0],p[1],zr],
		
			[xr,yl,p[2]],   [xr,yl,zl],[xr,yl,zr],
			[xr,p[1],p[2]], [xr,p[1],zl],[xr,p[1],zr],
			[xr,yr,p[2]],   [xr,yr,zl],[xr,yr,zr]
		];
	},
	
	makeNewCellID : function( kind ){
		var newid = ++ this.nr_cells
		this.cellvolume[newid] = 0
		this.cellperimeter[newid] = 0
		this.centerofmass[newid] = [0,0,0]
		this.id2t[newid] = kind
		return newid
	},

	seedCellAt : function( kind, p, opts ){
		var newid = this.makeNewCellID( kind )
		var oldt = this.pixt( p )
		this.setpix( p, newid )
		if( arguments.length < 3 ){
			opts = {}
		}
		if( opts.addNucleus ){
			var Np = this.neigh( p ), i = 0
			for( ; i < Np.length ; i ++ ){
				if( this.pixt( Np[i] ) == 0 ){
					this.seedCellAt( this.KIND_NUCLEUS, Np[i], false )
					return
				}
			}
		}
	},
	seedCell : function( kind, opts ){
		var N = 1000, // max amount of trials, avoids infinite loops in degenerate 
					// situations
			p, stromapixels, Ns, y
		if( arguments.length < 1 ){
			kind = 1
		}
		if( arguments.length < 2 ){
			opts = {}
		}
		if( !opts.fixToStroma ){
			for( ; N>0 ; N-- ){
				p = [this.ran( 0, this.field_size.x-1 ),
					this.ran( 0, this.field_size.y-1 )]
				if( this.ndim == 3 ){
					p.push( this.ran( 0, this.field_size.z-1 ) )
				} else {
					p.push( 0 )
				}
				t = this.pixt(p)
				if( t == 0 || opts.brutal ){
					if( !opts.hasOwnProperty("avoid") ||
						opts.avoid != this.id2t[t] ){
						break
					}
				} 
			}
		} else {
			stromapixels = Object.keys( this.stromapixelstype )
			Ns=stromapixels.length
			for( ; N>0 ; N-- ){
				p = this.neigh( this.i2p( stromapixels[this.ran(0,Ns-1)] ) )[
						this.ran(0,this.nNeigh-1)]
				if( this.pixt(p) == 0 ){
					break
				}
			}
		}
		if( N == 0 ) return false
		this.seedCellAt( kind, p, opts )
	},

	cellKind : function( id ){
		return this.id2t[ id ]
	},

	setCellKind : function( id, k ){
		this.id2t[ id ] = k
	},

	neigh2D : function( p ){
		var xr = this.fmodx(p[0]+1)
		var xl = this.fmodx(p[0]-1)
		var yl = this.fmody(p[1]-1)
		var yr = this.fmody(p[1]+1)
		var z = this.fmodz(p[2])
		return [[xl,yl,z],[xl,p[1],z],[xl,yr,z],[p[0],yl,z],
			[p[0],yr,z],[xr,yl,z],[xr,p[1],z],[xr,yr,z]]
	},

	nrConnectedComponents : function( N, t, tp ){
		var r = 0, i, v, visited = [], stack = [], _this=this
		var Nt = function( k ){
			if( k < N.length ){ 
				var t = _this.pixt( N[k] ) 
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
	
	connectivityConstraint : function( p, told, tnew ){
		var N, cost = this.par("LAMBDA_CONNECTIVITY",told) 
		if( cost > 0 ){
			N = this.neigh( p )
			if( this.nrConnectedComponents( N, told, told )
				!= this.nrConnectedComponents( N, told, tnew ) ){
				return cost
			}
		}
		cost = this.par("LAMBDA_CONNECTIVITY",tnew) 
		if( cost > 0 ){
			if( !N ) N = this.neigh( p )
			if( this.nrConnectedComponents( N, tnew, told )
				!= this.nrConnectedComponents( N, tnew, tnew ) ){
				return cost
			}
		}
		return 0
	},
	
	killCell : function( t ){
		if( this.nr_cells == 0 ) return
		var cpt = Object.keys( this.cellpixelstype ), p
		for( var i = 0 ; i < cpt.length ; i ++ ){
			if( this.cellpixelstype[cpt[i]] == t ){
				p = this.i2p(cpt[i])
				this.setpix( p, this.nr_cells-1 )
			}
		}
		this.nr_cells--
	},
	
	addStroma : function( stromavoxels, stromatype ){
		if( arguments.length < 2 ){
			stromatype = -1
		}
		for( var i = 0 ; i < stromavoxels.length ; i ++ ){
			this.stromapixelstype[this.p2i( stromavoxels[i] )]=stromatype
		}
	},
	
	/** Checks whether position p (given as array) is adjacent to any pixel of type
		t */
	isAdjacentToType : function( p, t ){
		var N = this.neigh( p ), c = this
		return N.map( function(pn){ return c.pixt(pn)==t } ).
			reduce( function(xa,x){ return xa || x }, false ) 
	},
	
	countCells : function( kind ){
		return this.id2t.reduce( function(xa,x){ return (x==kind) + xa } )
	},
	
	// 0 3 5 
	// 1 8 6
	// 2 4 7
	
	neighC : {
		0 : [1,3,8], 1 : [0,2,3,4,8], 2 : [1,4,8], 
		3 : [0,1,5,6,8], 4 : [1,2,6,7,8], 5 : [3,6,8],
		6 : [3,4,5,7,8], 7 : [4,6,8],  
		8 : [0,1,2,3,4,5,6,7]
	},
	
	neighC2Da : {
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
	
	neighC3D : {
		0 : [1,2,3,9],
		1 : [0,4,10],
		2 : [0,5,11],
		3 : [0,4,5,6,26],
		4 : [1,3,7,15],
		5 : [2,3,8,16],
		6 : [3,7,8,12],
		7 : [4,6,13],
		8 : [5,6,14],
		9 : [0,10,11,17,26],
		10 : [1,9,15,18],
		11 : [2,9,16,19],
		12 : [6,13,14,23,26],
		13 : [7,12,15,24],
		14 : [8,12,16,25],
		15 : [4,10,13,21,26],
		16 : [5,11,14,22,26],
		17 : [9,18,19,20],
		18 : [10,17,21],
		19 : [11,17,22],
		20 : [17,21,22,23,26],
		21 : [15,18,20,24],
		22 : [16,19,20,25],
		23 : [12,20,24,25],
		24 : [13,21,23],
		25 : [14,22,23],
		26 : [3,9,12,15,16,20]
	}

	/*calcNeighC : function(){
		var N = this.neigh( [1,1,0] )
		N.push( [1,1,0] )
		for( var i = 0 ; i < N.length ; i ++ ){
			var r = []
			for( var j = 0 ; j < N.length ; j ++ ){
				var d = 0
				for( var k = 0 ; k < N[i].length ; k ++ ){
					d = Math.max( d, Math.abs( N[i][k] - N[j][k] ) )
				}
				if( d == 1 ) r.push(j)
			}
			console.log( i, r.join(",") )
		}
	},*/
}

if( typeof module !== "undefined" ){
	var DiceSet = require("./DiceSet.js")
	module.exports = CPM
}
