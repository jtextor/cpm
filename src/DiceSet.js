/** This class implements a data structure with constant-time insertion, deletion, and random
    sampling. That's crucial for the CPM metropolis algorithm, which repeatedly needs to sample
    pixels at cell borders. */

function DiceSet() {
	this.indices = new Map() // {}
	this.elements = []
	this.length = 0
}

DiceSet.prototype = {
	insert : function( v ){
		if( this.indices.has( v ) ){
			return
		}
		this.indices.set( v, this.length )
		this.elements.push( v )
		this.length ++ 
	},
	remove : function( v ){
		if( !this.indices.has( v ) ){
			return
		}
		var i = this.indices.get(v)
		this.indices.delete(v)
		var e = this.elements.pop()
		if( e == v ){
			return
		}
		this.elements[i] = e
		this.indices.set(e,i)
		this.length --
	},
	contains : function( v ){
		return this.indices.has(v) // (v in this.indices)
	},
	sample : function(){
		return this.elements[Math.floor(Math.random()*this.length)]
	}
}

if( typeof module !== "undefined" ){
	module.exports = DiceSet
}
