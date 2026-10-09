/**
 * Gentle 2.5D flutter for one isolated, front-facing parchment label.
 * Dependencies: pass your installed THREE namespace to createLivingBanner().
 * Artwork and weights share the full UV rectangle; neither UVs nor names move.
 * This is a deforming sprite, not cloth simulation or true folded-paper geometry.
 */

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => { x = clamp01(x); return x*x*x*(x*(x*6-15)+10); };

/** Browser-only, once per shared weight image. PNG must be opaque RGB data. */
export async function loadMotionPixels(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Motion map failed: ${response.status}`);
  const bitmap = await createImageBitmap(await response.blob(), {
    colorSpaceConversion: 'none', premultiplyAlpha: 'none',
  });
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D is required to read motion weights.');
    ctx.drawImage(bitmap, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  } finally { bitmap.close(); }
}

/** Bilinear numeric sampling; UV origin is bottom-left, PNG rows start at top. */
export function sampleWeight(pixels, u, v, channel) {
  const x = clamp01(u) * (pixels.width - 1);
  const y = (1 - clamp01(v)) * (pixels.height - 1);
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, pixels.width - 1);
  const y1 = Math.min(y0 + 1, pixels.height - 1);
  const fx = x - x0, fy = y - y0;
  const at = (xx, yy) => pixels.data[(yy*pixels.width + xx)*4 + channel]/255;
  return (at(x0,y0)*(1-fx) + at(x1,y0)*fx)*(1-fy)
       + (at(x0,y1)*(1-fx) + at(x1,y1)*fx)*fy;
}

const mix = (a, b, t) => a + (b-a)*t;
function lattice(x, y, z) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0)/4294967295*2-1;
}

/** Deterministic 3D value noise, C2 interpolation, bounded to [-1,1]. */
export function valueNoise3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = smooth(x-ix), fy = smooth(y-iy), fz = smooth(z-iz);
  const row = (yy, zz) => mix(lattice(ix,yy,zz), lattice(ix+1,yy,zz), fx);
  return mix(mix(row(iy,iz), row(iy+1,iz), fy),
             mix(row(iy,iz+1), row(iy+1,iz+1), fy), fz);
}

/** Two slow coherent octaves; phase gives each tail/label its own noise field. */
export function tailNoise(u, v, seconds, phase) {
  const x = u*1.7 + phase*8.13 + 3.2;
  const y = v*1.9 + phase*3.41 + 6.7;
  const z = seconds*0.15 + phase*1.37 + 4.3;
  return 0.78*valueNoise3(x, y, z)
       + 0.22*valueNoise3(x*2.03+11.4, y*2.03+7.1, z*1.73+19.2);
}

/**
 * metadata.canvas_px = [texturePixelWidth, texturePixelHeight]
 * metadata.safe_text_box = [uMin, vMin, uMax, vMax], bottom-left UV.
 * motionPixels R = left-tail weight, G = right-tail weight, B unused.
 * width is the FULL transparent canvas width in scene units, not pixels.
 * flutter/lift are fractions of width; speed scales the noise field's time.
 * Share artworkTexture and motionPixels between instances; geometry is unique.
 */
export function createLivingBanner(THREE, {
  artworkTexture, motionPixels, metadata,
  width = 1, segmentsX = 48, segmentsY,
  flutter = 0.008, lift = 0.002, sway = 0, speed = 1, phase = 0,
  lit = false, alphaToCoverage = false,
}) {
  const [pw, ph] = metadata.canvas_px;
  const box = metadata.safe_text_box;
  if (![pw, ph, width].every(n => Number.isFinite(n) && n > 0)
      || !box || box.length !== 4)
    throw new Error('Positive canvas_px, physical width and safe_text_box required.');
  if (box.some(n => !Number.isFinite(n) || n < 0 || n > 1)
      || box[0] >= box[2] || box[1] >= box[3])
    throw new Error('safe_text_box must be [uMin,vMin,uMax,vMax] in [0,1].');
  if (!(motionPixels.width > 0 && motionPixels.height > 0)
      || motionPixels.data.length !== motionPixels.width*motionPixels.height*4)
    throw new Error('motionPixels must be RGBA ImageData, with opaque alpha.');
  if (flutter < 0 || lift < 0 || sway < 0 || !Number.isFinite(flutter + lift + sway + speed + phase))
    throw new Error('Use finite settings, with nonnegative flutter and lift.');
  if (!Number.isFinite(segmentsX) || (segmentsY !== undefined && !Number.isFinite(segmentsY)))
    throw new Error('Subdivision counts must be finite.');
  segmentsX = Math.max(8, Math.round(segmentsX));
  segmentsY = Math.max(8, Math.round(segmentsY ?? segmentsX*ph/pw));
  const height = width*ph/pw;
  const geometry = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
  const positions = geometry.getAttribute('position');
  const uvs = geometry.getAttribute('uv');
  positions.setUsage(THREE.DynamicDrawUsage);
  if (lit) geometry.getAttribute('normal').setUsage(THREE.DynamicDrawUsage);
  const rest = positions.array.slice();
  const active = [];

  // Protect one extra cell so every triangle covering the text remains flat.
  const guard = [box[0]-1/segmentsX, box[1]-1/segmentsY,
                 box[2]+1/segmentsX, box[3]+1/segmentsY];
  const feather = Math.max(2/segmentsX, 0.025);
  for (let i = 0; i < positions.count; i++) {
    const u = uvs.getX(i), v = uvs.getY(i);
    const distance = Math.max(guard[0]-u, u-guard[2], guard[1]-v, v-guard[3], 0);
    const lock = smooth(distance/feather);
    let left = sampleWeight(motionPixels, u, v, 0)*lock;
    let right = sampleWeight(motionPixels, u, v, 1)*lock;
    const sum = left + right;
    if (sum > 1) { left /= sum; right /= sum; }
    if (left + right > 0) active.push({ i, u, v, left, right });
  }

  // TextureLoader defaults: flipY=true; full, untransformed UV rectangle.
  artworkTexture.colorSpace = THREE.SRGBColorSpace;
  artworkTexture.flipY = true;
  artworkTexture.premultiplyAlpha = false;
  artworkTexture.wrapS = artworkTexture.wrapT = THREE.ClampToEdgeWrapping;
  artworkTexture.offset.set(0, 0);
  artworkTexture.repeat.set(1, 1);
  artworkTexture.rotation = 0;
  artworkTexture.needsUpdate = true;
  const common = {
    map: artworkTexture, side: THREE.DoubleSide,
    transparent: false, alphaTest: 0.5, alphaToCoverage,
    depthWrite: true, depthTest: true,
  };
  const material = lit
    ? new THREE.MeshStandardMaterial({ ...common, roughness: 0.95, metalness: 0 })
    : new THREE.MeshBasicMaterial({ ...common, toneMapped: false });
  const mesh = new THREE.Mesh(geometry, material);

  // Conservative bounds cover the full allowed motion, preventing culling pops.
  const margin = width*Math.hypot(flutter*0.15+sway*0.65, flutter*0.35+sway, lift+flutter);
  geometry.computeBoundingBox();
  geometry.boundingBox.expandByScalar(margin);
  geometry.computeBoundingSphere();
  geometry.boundingSphere.radius += margin;

  function update(seconds, motionStrength = 1) {
    if (!Number.isFinite(seconds)) return;
    const strength = Number.isFinite(motionStrength) ? clamp01(motionStrength) : 0;
    const t = seconds*speed;
    for (const p of active) {
      const a = strength && p.left ? (sway ? 0.65*Math.sin(t*0.9+phase+p.u*0.8)+0.35*tailNoise(p.u,p.v,t,phase) : tailNoise(p.u,p.v,t,phase)) : 0;
      const b = strength && p.right ? (sway ? 0.65*Math.sin(t*0.73+phase*1.7+p.v*0.9+2.3)+0.35*tailNoise(1-p.u,p.v,t,phase+2.3) : tailNoise(1-p.u,p.v,t,phase+2.3)) : 0;
      const noise = p.left*a + p.right*b;
      const weight = p.left + p.right;
      const j = p.i*3;
      // Always recompute from rest. No frame-rate-dependent accumulation.
      positions.array[j] = rest[j] + width*(flutter*0.15+sway*0.65)*strength*(p.right*b-p.left*a);
      positions.array[j+1] = rest[j+1] + width*(flutter*0.35+sway)*strength*noise;
      positions.array[j+2] = rest[j+2] + width*(lift*weight
        + flutter*strength*(0.5*weight + 0.5*noise));
    }
    positions.needsUpdate = true;
    if (lit) geometry.computeVertexNormals();
  }
  update(0, 0);
  return {
    mesh, update,
    dimensions: { width, height, vertices: positions.count, movingVertices: active.length },
    // Textures belong to the caller and can be shared across labels.
    dispose() { geometry.dispose(); material.dispose(); },
  };
}
