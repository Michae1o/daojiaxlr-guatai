"""Generate transparent, locally feathered fog textures; no axis-aligned colour bands."""
from pathlib import Path
import numpy as np
from PIL import Image
out = Path(__file__).resolve().parents[1] / 'kuikly/androidApp/src/main/assets/common/fog'
out.mkdir(parents=True, exist_ok=True)
y, x = np.mgrid[0:960, 0:640].astype(float)
x /= 639; y /= 959
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
    # Quartic compact falloff: value and first derivative vanish at the boundary.
    r2 = ((x-cx)/sx)**2 + ((y-cy)/sy)**2
    alpha = np.maximum(0, 1-r2/4)**4 * strength
    alpha *= np.sin(np.pi*x)**2 * np.sin(np.pi*y)**2
    rgba = np.zeros((960,640,4), dtype=np.uint8)
    rgba[:,:,:3] = color
    rgba[:,:,3] = np.clip(np.floor(alpha*255 + rng.random(alpha.shape)),0,255).astype(np.uint8)
    Image.fromarray(rgba).save(out / (name+'.png'), optimize=True)
print('Fog assets generated')
