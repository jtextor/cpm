# cpm
Cellular Potts Model implementation

Implements a simple Cellular Potts Model in javascript. Code includes the extension for cell migration published in 

Ioana Niculescu, Johannes Textor, Rob J. de Boer:
__Crawling and Gliding: A Computational Model for Shape-Driven Cell Migration__
PLoS Computational Biology 11(10): e1004280
http://dx.doi.org/10.1371/journal.pcbi.1004280

# How it works

The model itself is implemented as node.js modules and can be run within node.js and the web browser. Visualization is not handled by the modules, but example visualizations for 2D (using Canvas) and 3D (using three.js) are included in the "examples" directory.

## Browser example

For a simple example of a simulation runnig in a web browser, open the file `examples-node/2d.html`.

## Node examples

For two simple example simulations with a single migrating cell type, enter the folder `examples-node` and run

```node run-2d.js```

or

```node run-3d.js```

The 2D script will dump binary snapshots of the CPM lattice into the folder `output/`. These can be converted to PNGs using the provided python script (which assumes a fixed lattice site of 200x200).

The Makefile runs `run-2d.js` and generates png files and an mp4 movie automatically in the folder `output/`.



