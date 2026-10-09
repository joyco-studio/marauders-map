"""Bake a true, single-channel signed distance field from SVG coverage.
Coverage rasterization preserves the SVG's overlap and even-odd fill semantics.
The half-texel correction places the contour at encoded distance 0.5.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt


def encode_sdf(alpha, distance_range=8):
    coverage = np.asarray(alpha, dtype=np.float32) / 255
    inside = coverage >= .5
    signed = distance_transform_edt(inside) - distance_transform_edt(~inside)
    signed -= np.where(inside, .5, -.5)
    # Retain subpixel edge coverage rather than introducing stair-step contours.
    edge = (coverage > 0) & (coverage < 1)
    signed[edge] = coverage[edge] - .5
    return np.round(np.clip(.5 + signed / distance_range, 0, 1) * 255).astype(np.uint8)


if __name__ == '__main__':
    for source in Path(sys.argv[1]).rglob('*.png'):
        destination = Path(sys.argv[2]) / source.relative_to(sys.argv[1])
        destination.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(source) as image:
            alpha = image.getchannel('A')
            Image.fromarray(encode_sdf(alpha)).save(destination)
    print('Baked single-channel distance fields; contour = 0.5, range = 8 texels.')
