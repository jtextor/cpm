# cpm
Cellular Potts Model implementation

Implements a simple Cellular Potts Model in javascript. Code includes the extension for cell migration published in 

Ioana Niculescu, Johannes Textor, Rob J. de Boer:
__A Generic Finite Automata Based Approach to Implementing Lymphocyte Repertoire Models.__
PLoS Computational Biology 11(10): e1004280
http://dx.doi.org/10.1371/journal.pcbi.1004280

# How it works

The model itself is implemented as node.js modules and can be run within node.js and the web browser. Visualization is not handled by the modules, but example visualizations for 2D (using Canvas) and 3D (using three.js) are included in the "examples" directory.

## Node examples

For two simple example simulations with a single migrating cell type, enter the folder `examples-node` and run

```node run-2d.js```

or

```node run-3d.js```

The 2D script will dump binary snapshots of the CPM lattice into the folder `output/`. These can be converted to PNGs using the provided python script (which assumes a fixed lattice site of 200x200).



