# ViDi

Generative line art built with p5.js.

This piece is a 5x5 matrix of tiles (25 tiles total). Each tile contains a unique 4x4 normal magic square (numbers 1..16, magic sum 34). A single continuous line connects 1 → 2 → … → 16 inside each tile, and tiles are visited in a serpentine order across the 5x5 matrix. The animation draws the line forward to the end, then erases backward to the start, looping forever.


## Controls
- R: regenerate (new seed)
- Space: restart from the beginning (forward)
- P: pause or play
- (+ / -) : speed up or slow down


## Files
- `index.html`, loads p5.js from a CDN and runs the sketch
- `vidi.js`, the full generative artwork code
