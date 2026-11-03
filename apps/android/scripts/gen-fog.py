"""Generate domain-warped volumetric fog. Original textures are kept intact."""
from pathlib import Path
import sys
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
    for octave, weight in enumerate((.54,.28,.13,.05)):
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
    # Dunhuang/Mogao original and derived assets remain byte-for-byte untouched.
    if '--cinnabar-only' in sys.argv or name.startswith(('dh-', 'mg-')):
        continue
    for layer, suffix in enumerate(('flow', 'wisp')):
        seed = sum(map(ord,name)) + layer*137
        # Broad curls plus a few medium-scale filaments, without dense pleats.
        u, v = x*3.1, y*4.1
        qx = fbm(u+.3,v,seed)
        qy = fbm(u+5.2,v+1.3,seed+31)
        rx = fbm(u+1.35*qx+1.7,v+1.35*qy,seed+67)
        ry = fbm(u+1.35*qx,v+1.35*qy+8.1,seed+97)
        u, v = u+1.55*rx, v+1.55*ry
        # Local rotations bend a continuous field rather than drawing oval blobs.
        for ox, oy, twist in ((1.0,1.3,1.15),(2.25,2.8,-.95)):
            ux, vy = u-ox, v-oy
            angle = twist*np.exp(-(ux*ux+vy*vy)/1.9)
            u, v = ox+ux*np.cos(angle)-vy*np.sin(angle), oy+ux*np.sin(angle)+vy*np.cos(angle)
        density = fbm(u,v,seed+123)
        fine = fbm(u*1.65+2.7,v*1.65,seed+209)
        spine = cx + .20*np.sin(y*5+seed) + .08*np.sin(y*10+seed*.3)
        envelope = np.exp(-((x-spine)/(.25+.10*qy))**2)
        edge = np.clip(np.minimum.reduce([x,1-x,y,1-y])*9,0,1)
        edge = edge*edge*(3-2*edge)
        def smooth(a,b,z):
            t=np.clip((z-a)/(b-a),0,1)
            return t*t*(3-2*t)
        body = smooth(.29,.72,density)**1.15
        # Transparent channels reveal movement; soft wisps retain a low opacity.
        channels = .58+.42*smooth(.33,.64,fine)
        filament = np.exp(-((density-.50)/.085)**2)
        if layer == 1:
            body = (.38*body+.62*filament)*smooth(.30,.55,fine)
        else:
            body = .80*body+.20*filament
        alpha = body*channels*envelope*edge*strength*(1.65 if layer == 0 else .75)
        rgba = np.zeros((H,W,4), dtype=np.uint8)
        rgba[:,:,:3] = color
        rgba[:,:,3] = np.clip(np.rint(alpha*255),0,255).astype(np.uint8)
        Image.fromarray(rgba).save(out / (name+'-'+suffix+'.png'), optimize=True)
print('Domain-warped fog assets generated; original PNGs preserved')

# Stationary cinnabar bleed on Xuan paper: irregular edges, sparse pigment,
# mostly white paper. Kept separate from moving fog so freeze cannot move it.
wash_noise = fbm(x*4.2+.7, y*5.6, 438)
warp_x = fbm(x*3.1, y*4.3+.8, 712)-.5
warp_y = fbm(x*3.1+2.4, y*4.3, 819)-.5
u = x + .24*warp_x
v = y + .12*warp_y
upper = np.exp(-(((u-1.04)/.48)**2 + ((v-.16)/.235)**2)*1.5)
lower = np.exp(-(((u+.12)/.38)**2 + ((v-.74)/.24)**2)*1.5)
pigment = .48 + .52*np.clip((wash_noise-.22)/.56,0,1)
alpha = (.17*upper + .065*lower)*pigment
rgba = np.zeros((H,W,4),dtype=np.uint8)
rgba[:,:,:3] = (169,76,55)
rgba[:,:,3] = np.clip(np.rint(alpha*255),0,255).astype(np.uint8)
Image.fromarray(rgba).save(out / 'xuan-cinnabar.png', optimize=True)
print('Stationary Xuan cinnabar wash generated')
