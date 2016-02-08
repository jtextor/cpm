/** This class implements a data structure with constant-time insertion, deletion, and random
    sampling. That's crucial for the CPM metropolis algorithm, which repeatedly needs to sample
    pixels at cell borders. */

function DiceSet() {
	this.indices = {}
	this.elements = []
	this.length = 0
}

DiceSet.prototype = {
	insert : function( v ){
		if( this.contains( v ) ){
			return
		}
		this.indices[v] = this.elements.length
		this.elements.push( v )
		this.length ++ 
	},
	remove : function( v ){
		if( !this.contains( v ) ){
			return
		}
		var i = this.indices[v]
		delete this.indices[v]
		var e = this.elements.pop()
		if( e == v ){
			return
		}
		this.elements[i] = e
		this.indices[this.elements[i]] = i
		this.length --
	},
	contains : function( v ){
		return (v in this.indices)
	},
	sample : function(){
		return this.elements[Math.floor(Math.random()*this.length)]
	}
}

if( typeof module !== "undefined" ){
	module.exports = DiceSet
}
