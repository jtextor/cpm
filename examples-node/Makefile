all : output/2d.mp4

output/2d.mp4 : output/0.png
	ffmpeg -y -framerate 5 -i output/%d.png -c:v libx264 -r 30 -pix_fmt yuv420p output/2d.mp4

output/0.png : output/0.bin 2img.py
	python 2img.py

output/0.bin : run-2d.js
	node $< 5

clean:
	rm -f output/*

