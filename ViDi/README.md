# ViDi

Generative line art built with p5.js.

This piece is a 5x5 matrix of tiles (25 tiles total). Each tile contains a unique 4x4 normal magic square (numbers 1..16, magic sum 34). A single continuous line connects 1 → 2 → … → 16 inside each tile, and tiles are visited in a serpentine order across the 5x5 matrix. The animation draws the line forward to the end, then erases backward to the start, looping forever.

## How it works
- Magic squares are generated via randomized backtracking.
- Uniqueness is enforced up to rotation and mirror (dihedral symmetries).
- The global path is smoothed using cubic Bézier segments.
- Tile-to-tile transitions are handled as straight-ish “bridges” for cleaner flow.

## Controls
- R: regenerate (new seed)
- G: toggle overlay (tile grid and indices)
- Space: restart from the beginning (forward)
- P: pause or play
- + / -: speed up or slow down

## Run it locally
You need to serve the folder, do not open the HTML file directly if your browser blocks local scripts.

### Python
From the repository root:
- Python 3:
  - `python -m http.server 8000`
Then open:
- `http://localhost:8000/ViDi/`

### Node (optional)
- `npx serve .`
Then open the `/ViDi/` path.

## Files
- `index.html`, loads p5.js from a CDN and runs the sketch
- `sketch.js`, the full generative artwork code
