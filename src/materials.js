import * as T from 'three';

export function mesh(parent, geometry, material, position = [0, 0, 0]) {
  const object = new T.Mesh(geometry, material);
  object.position.set(...position); object.castShadow = true; object.receiveShadow = true;
  parent.add(object); return object;
}
export function box(parent, size, material, position) {
  return mesh(parent, new T.BoxGeometry(...size), material, position);
}
export function beam(parent, from, to, radius, material, segments = 12) {
  const a = new T.Vector3(...from), b = new T.Vector3(...to), direction = b.clone().sub(a);
  const object = mesh(parent, new T.CylinderGeometry(radius, radius, direction.length(), segments), material);
  object.position.copy(a.add(b).multiplyScalar(0.5));
  object.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize());
  return object;
}
export function tube(parent, points, radius, material, closed = false) {
  const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)), closed);
  return mesh(parent, new T.TubeGeometry(curve, Math.max(24, points.length * 5), radius, 8, closed), material);
}
export function labelTexture(text, subtitle = '', dark = true) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 384;
  const c = canvas.getContext('2d'); c.fillStyle = dark ? '#173a37' : '#eee9db'; c.fillRect(0, 0, 1024, 384);
  c.strokeStyle = '#b9a267'; c.lineWidth = 6; c.strokeRect(20, 20, 984, 344);
  c.textAlign = 'center'; c.fillStyle = dark ? '#f7f0de' : '#173a37';
  c.font = '600 98px "Microsoft YaHei", sans-serif'; c.fillText(text, 512, 180);
  c.fillStyle = '#b9a267'; c.font = '30px "Microsoft YaHei", sans-serif'; c.fillText(subtitle, 512, 280);
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; return texture;
}
function grainTexture(kind) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const c = canvas.getContext('2d'), data = c.createImageData(512, 512);
  let seed = 9471; const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const i = (y * 512 + x) * 4;
    let value = kind === 'wood' ? 135 + 25 * Math.sin(y * 0.43 + Math.sin(x * 0.009) * 1.9) + 12 * Math.sin(y * 1.4) + random() * 18 : 165 + random() * 35;
    if (kind === 'paving' && (x % 128 < 3 || (y + (Math.floor(x / 128) % 2) * 64) % 128 < 3)) value = 85;
    data.data[i] = value; data.data[i + 1] = value; data.data[i + 2] = value; data.data[i + 3] = 255;
  }
  c.putImageData(data, 0, 0);
  const tex = new T.CanvasTexture(canvas); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.colorSpace = T.SRGBColorSpace;
  return tex;
}
export function createMaterials(renderer) {
  const timber = grainTexture('wood'); timber.repeat.set(3, 2); timber.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const paving = grainTexture('paving'); paving.repeat.set(28, 28);
  const concrete = grainTexture('stone'); concrete.repeat.set(4, 4);
  const standard = (color, roughness = 0.7, metalness = 0) => new T.MeshStandardMaterial({ color, roughness, metalness });
  const m = {
    wood: new T.MeshStandardMaterial({ color: '#754526', map: timber, bumpMap: timber, bumpScale: 0.05, roughness: 0.68 }),
    darkWood: new T.MeshStandardMaterial({ color: '#402a20', map: timber, bumpMap: timber, bumpScale: 0.025, roughness: 0.72 }),
    deck: new T.MeshStandardMaterial({ color: '#ded8c8', map: timber, roughness: 0.85 }),
    steel: standard('#264e49', 0.4, 0.65), steelDark: standard('#1c2c2c', 0.46, 0.73),
    brass: standard('#b69a55', 0.32, 0.78), iron: standard('#555e5b', 0.48, 0.8),
    red: standard('#733a30', 0.5, 0.2), seat: standard('#273c37', 0.9), rubber: standard('#242824', 0.97),
    stone: new T.MeshStandardMaterial({ color: '#a59c85', map: concrete, roughness: 0.96, bumpMap: concrete, bumpScale: 0.045 }),
    paving: new T.MeshStandardMaterial({ color: '#bcbab0', map: paving, roughness: 0.96, bumpMap: paving, bumpScale: 0.035 }),
    leaf: standard('#355638', 0.96), leafLight: standard('#5c7441', 0.96), grass: standard('#536249', 1),
    bark: new T.MeshStandardMaterial({ color: '#675841', map: timber, roughness: 1 }),
    plaster: standard('#ded3b8', 0.94), tile: standard('#67594d', 0.91), rope: standard('#a39068', 0.98),
    glass: new T.MeshPhysicalMaterial({ color: '#7a9d9c', roughness: 0.13, metalness: 0.15, transparent: true, opacity: 0.65 }),
  };
  const loader = new T.TextureLoader();
  const load = (file, srgb = false) => {
    const tex = loader.load(`${import.meta.env.BASE_URL}assets/${file}`); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(2, 5);
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (srgb) tex.colorSpace = T.SRGBColorSpace; return tex;
  };
  m.deck.map = load('deck-color.jpg', true); m.deck.normalMap = load('deck-normal.jpg');
  m.deck.normalScale = new T.Vector2(0.65, 0.65); m.deck.roughnessMap = load('deck-roughness.jpg');
  m.paving.color.set('#e5e0d6'); m.paving.map = load('paving-color.jpg', true); m.paving.map.repeat.set(17, 17);
  m.paving.normalMap = load('paving-normal.jpg'); m.paving.normalMap.repeat.set(17, 17);
  m.paving.normalScale = new T.Vector2(0.4, 0.4); m.paving.bumpMap = null;
  m.grass.map = load('grass-color.jpg', true); m.grass.map.repeat.set(65, 65); m.grass.color.set('#929782');
  return m;
}
