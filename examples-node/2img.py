import numpy
from scipy import misc
from sys import argv,exit
import struct
import math
from os.path import exists,getsize

ipat="output/%d.bin"
opat="output/%d.png"


k=0
while exists( ipat % k ):
	i=0
	j=0

	n = int(math.sqrt(getsize(ipat %k)))

	I = numpy.zeros( (n,n,3), "uint8" )

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
			I[i,:,0] = 255*(bt>0)
			I[i,:,1] = 255*(bt!=2)
			I[i,:,2] = 255*(bt!=2)

			i = i+1

	misc.imsave(opat %k, I ) 
	k = k+1
