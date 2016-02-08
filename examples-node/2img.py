import numpy
from scipy import ndimage,misc
from sys import argv,exit
import struct
from os.path import exists

n=200

k=0

I = numpy.zeros( (n,n), "uint8" )

ipat="output/%d.bin"
opat="output/%d.png"

while exists( ipat % k ):
	i=0
	j=0


	with open(ipat %k,'rb') as f:
		s = ""
		while True:
			bt = f.read(n)
			#print len(bt)
			#print ord(bt[0])
			if not bt:
				break
			#bt = struct.unpack('B',bt)
			bt=numpy.asarray(map(ord,bt))
			I[i,:] = 255*(bt>0)
			i = i+1

	misc.imsave(opat %k, I ) 
	k = k+1
