all : output/2d.mp4 output/2d-chemokine.mp4

output/%.mp4 : output/%-0.png
	ffmpeg -y -framerate 5 -i output/$*-%d.png -c:v libx264 -r 30 -pix_fmt yuv420p $@

output/2d-0.png : run-2d.js
	node $< 5

output/2d-chemokine-0.png : run-2d-chemokine.js
	node $< 10

clean:
	rm -f output/*

