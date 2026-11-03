"""Restore Dunhuang-only folded PNG fog from the 2026-11-03 09:27 pre-smoothing implementation. Other assets stay intact."""
from pathlib import Path
import numpy as np
from PIL import Image
out = Path(__file__).resolve().parents[1] / 'kuikly/androidApp/src/main/assets/common/fog'
out.mkdir(parents=True, exist_ok=True)
H, W = 768, 512
y, x = np.mgrid[0:H, 0:W].astype(float)
x /= W-1; y /= H-1

def noise(u, v, seed):
    """Smooth deterministic value noise, evaluated in warped coordinates."""
    ix, iy = np.floor(u).astype(int), np.floor(v).astype(int)
    fx, fy = u-ix, v-iy
    fx = fx*fx*fx*(fx*(fx*6-15)+10)
    fy = fy*fy*fy*(fy*(fy*6-15)+10)
    def h(a, b):
        z = np.sin(a*127.1+b*311.7+seed*74.7)*43758.5453
        return z-np.floor(z)
    return ((1-fx)*h(ix,iy)+fx*h(ix+1,iy))*(1-fy) + ((1-fx)*h(ix,iy+1)+fx*h(ix+1,iy+1))*fy

def fbm(u, v, seed):
    result = np.zeros_like(u)
    for octave, weight in enumerate((.55,.26,.12,.05,.02)):
        f = 2**octave
        result += weight*noise(u*f,v*f,seed+octave*13)
    return result

rng = np.random.default_rng(1030)
for name, color, cx, cy, sx, sy, strength in [
    ('pink', (223, 158, 196), .27, .30, .26, .22, .24),
    ('blue', (148, 181, 235), .72, .55, .27, .25, .22),
    ('violet', (180, 151, 219), .35, .83, .29, .21, .20),
    ('bw-ink', (36, 36, 36), .32, .40, .36, .30, .24),
    ('bw-light', (255, 255, 255), .65, .69, .30, .27, .52),
    ('hei-light', (172, 172, 172), .35, .34, .26, .23, .22),
    ('hei-ink', (0, 0, 0), .65, .72, .35, .29, .54),
    ('xuan-warm', (192, 165, 135), .35, .42, .34, .28, .09),
    ('qing-jade', (99, 159, 148), .28, .37, .30, .27, .20),
    ('qing-blue', (129, 159, 178), .68, .74, .31, .26, .13),
    ('dou-rose', (168, 116, 106), .32, .40, .32, .28, .25),
    ('dou-mauve', (184, 150, 157), .66, .77, .31, .24, .18),
    ('dh-ochre', (153, 77, 57), .28, .32, .31, .26, .33),
    ('dh-mineral', (73, 127, 106), .68, .68, .33, .28, .27),
    ('dh-azurite', (65, 103, 146), .30, .86, .29, .23, .18),
    ('mg-gold', (214, 156, 66), .28, .31, .32, .26, .27),
    ('mg-blue', (56, 102, 154), .71, .65, .32, .28, .28),
    ('mg-ember', (157, 87, 46), .36, .85, .31, .22, .16),
]:
    if not name.startswith('dh-'):
        continue
    for layer, suffix in enumerate(('flow', 'wisp')):
        seed = sum(map(ord,name)) + layer*137
        # Two-stage domain warp bends continuous density into curls and channels.
        u, v = x*3.2, y*4.8
        qx = fbm(u+.3,v,seed)
        qy = fbm(u+5.2,v+1.3,seed+31)
        rx = fbm(u+2.8*qx+1.7,v+2.8*qy,seed+67)
        ry = fbm(u+2.8*qx,v+2.8*qy+8.1,seed+97)
        density = fbm(u+3.8*rx,v+3.8*ry,seed+123)
        # A wandering ribbon, not an elliptical envelope. Transparent holes survive.
        spine = cx + .19*np.sin(y*7+seed) + .09*np.sin(y*16+seed*.3)
        envelope = np.exp(-((x-spine)/(.26+.10*qy))**2)
        edge = np.clip(np.minimum.reduce([x,1-x,y,1-y])*9,0,1)
        edge = edge*edge*(3-2*edge)
        body = np.clip((density-.29)/.43,0,1)**1.6
        if layer == 1:
            body = np.exp(-((density-.51)/.095)**2)*np.clip((rx-.27)*2,0,1)
        alpha = body*envelope*edge*strength*(1.65 if layer == 0 else .75)
        rgba = np.zeros((H,W,4), dtype=np.uint8)
        rgba[:,:,:3] = color
        rgba[:,:,3] = np.clip(np.rint(alpha*255),0,255).astype(np.uint8)
        Image.fromarray(rgba).save(out / (name+'-'+suffix+'.png'), optimize=True)
print('Restored six Dunhuang folded fog assets; all other skins unchanged')
