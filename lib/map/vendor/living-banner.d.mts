import type * as THREE from "three/webgpu"
export function createLivingBanner(three: typeof THREE, options: {
  artworkTexture: THREE.Texture; motionPixels: ImageData;
  metadata: { canvas_px: number[]; safe_text_box: number[] };
  width: number; phase: number; sway?: number; speed?: number;
}): { mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; update: (seconds: number, strength?: number) => void }
