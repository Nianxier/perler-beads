<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { editor, show3d, showToast, version } from '../core/session';
import { beadCount, buildBeadScene } from '../core/three3d';

const holder = ref<HTMLDivElement | null>(null);
let cleanup: (() => void) | null = null;

function close(): void {
  show3d.value = false;
}

onMounted(async () => {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
  const el = holder.value;
  if (!el) return;

  void version.value;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1f2329');

  const w = el.clientWidth || 720;
  const h = el.clientHeight || 520;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  el.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000);
  const data = buildBeadScene(editor.pattern);
  const maxDim = Math.max(data.width, data.height);
  camera.position.set(maxDim * 0.75, maxDim * 0.85, maxDim * 1.05);
  camera.lookAt(0, 0, 0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const dir = new THREE.DirectionalLight(0xffffff, 1.4);
  dir.position.set(80, 140, 100);
  scene.add(dir);

  // 圆珠：单个 InstancedMesh 一次画完
  const count = data.beads.length;
  const geo = new THREE.SphereGeometry(0.48, 12, 10);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 });
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, count));
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  data.beads.forEach((b, i) => {
    dummy.position.set(b.x, 0, b.y);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, color.set(b.hex));
  });
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  scene.add(mesh);

  // 托板（淡色底板）
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(data.width + 2, data.height + 2),
    new THREE.MeshStandardMaterial({ color: '#3a4150', roughness: 0.9 }),
  );
  board.rotation.x = -Math.PI / 2;
  board.position.y = -0.6;
  scene.add(board);

  let raf = 0;
  const tick = (): void => {
    controls.update();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  tick();

  cleanup = () => {
    cancelAnimationFrame(raf);
    controls.dispose();
    geo.dispose();
    mat.dispose();
    board.geometry.dispose();
    (board.material as THREE.Material).dispose();
    renderer.dispose();
    el.removeChild(renderer.domElement);
  };
});

onBeforeUnmount(() => {
  cleanup?.();
  cleanup = null;
});
</script>

<template>
  <div class="overlay" @click.self="close">
    <div class="panel">
      <div class="head">
        <span class="title">3D 预览</span>
        <button class="close" title="关闭" @click="close">×</button>
      </div>
      <div ref="holder" class="stage"></div>
      <p class="hint">拖动旋转 · 滚轮缩放 · 右键平移（{{ beadCount(editor.pattern) }} 颗豆）</p>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(31, 35, 41, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}
.panel {
  background: #1f2329;
  border-radius: 10px;
  padding: 14px 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}
.close {
  border: none;
  background: none;
  font-size: 18px;
  cursor: pointer;
  color: #9ca3af;
  line-height: 1;
}
.stage {
  width: 720px;
  height: 520px;
  border-radius: 8px;
  overflow: hidden;
}
.hint {
  margin: 8px 0 0;
  color: #9ca3af;
  font-size: 12px;
  text-align: center;
}
</style>
