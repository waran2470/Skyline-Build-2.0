import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import './style.css';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ac8e8);
scene.fog = new THREE.Fog(0x8ac8e8, 35, 110);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 3, 8);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('app').appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xdaf3ff, 0x52704c, 2.2));
const sun = new THREE.DirectionalLight(0xfff4dc, 3.5);
sun.position.set(-25, 40, 18); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -45; sun.shadow.camera.right = 45;
sun.shadow.camera.top = 45; sun.shadow.camera.bottom = -45;
scene.add(sun);

const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
const materials = {
  wall: { label: '壁', color: 0x4f6dff, mat: new THREE.MeshStandardMaterial({ color: 0x4f6dff, roughness: .72 }) },
  floor: { label: '床', color: 0xd89042, mat: new THREE.MeshStandardMaterial({ color: 0xd89042, roughness: .78 }) },
  ramp: { label: 'ランプ', color: 0x39b982, mat: new THREE.MeshStandardMaterial({ color: 0x39b982, roughness: .66 }) }
};
const keys = ['wall', 'floor', 'ramp'];
let selected = 'wall';
const blocks = [];
const colliders = [];
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let canJump = false;
let buildPreview;

function addBlock(type, position, rotation = 0) {
  const data = materials[type];
  const mesh = new THREE.Mesh(cubeGeo, data.mat);
  mesh.position.copy(position);
  mesh.rotation.y = rotation;
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData = { type, isRamp: type === 'ramp' };
  scene.add(mesh); blocks.push(mesh); colliders.push(mesh);
  return mesh;
}
function addGround() {
  const ground = new THREE.Mesh(new THREE.BoxGeometry(70, .5, 70), new THREE.MeshStandardMaterial({ color: 0x4c8b5b, roughness: 1 }));
  ground.position.y = -.25; ground.receiveShadow = true; ground.userData.ground = true;
  scene.add(ground); colliders.push(ground);
  for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) {
    if ((Math.abs(x) + Math.abs(z)) % 4 === 0) addBlock('floor', new THREE.Vector3(x, .5, z));
  }
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) addBlock('floor', new THREE.Vector3(x, .5, z));
}
addGround();

function updatePreview() {
  if (buildPreview) scene.remove(buildPreview);
  const data = materials[selected];
  buildPreview = new THREE.Mesh(cubeGeo, new THREE.MeshBasicMaterial({ color: data.color, transparent: true, opacity: .42, wireframe: true }));
  scene.add(buildPreview);
}
updatePreview();

const controls = new PointerLockControls(camera, renderer.domElement);
const startScreen = document.getElementById('start-screen');
document.getElementById('start-button').addEventListener('click', () => controls.lock());
controls.addEventListener('lock', () => startScreen.classList.add('hidden'));
controls.addEventListener('unlock', () => startScreen.classList.remove('hidden'));

const pressed = {};
addEventListener('keydown', e => {
  pressed[e.code] = true;
  if (e.code === 'Space' && canJump) { velocity.y = 8; canJump = false; }
  if (e.key >= '1' && e.key <= '3') { selected = keys[Number(e.key) - 1]; updatePreview(); updateStatus(); }
});
addEventListener('keyup', e => pressed[e.code] = false);
addEventListener('contextmenu', e => e.preventDefault());

function targetCell() {
  raycaster.setFromCamera(center, camera);
  const hits = raycaster.intersectObjects(colliders, false);
  if (!hits.length) return null;
  const hit = hits[0];
  const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
  const place = hit.object.position.clone().add(normal.multiplyScalar(.5));
  place.set(Math.round(place.x), Math.round(place.y), Math.round(place.z));
  return { hit, place };
}
function build() {
  if (!controls.isLocked) return;
  const target = targetCell(); if (!target || target.hit.object.userData.ground) return;
  const exists = blocks.some(b => b.position.distanceTo(target.place) < .1);
  if (!exists) addBlock(selected, target.place, selected === 'ramp' ? Math.PI / 2 : 0);
}
function removeBlock() {
  if (!controls.isLocked) return;
  const target = targetCell(); if (!target || target.hit.object.userData.ground) return;
  const index = blocks.indexOf(target.hit.object);
  if (index >= 0) { scene.remove(target.hit.object); blocks.splice(index, 1); colliders.splice(colliders.indexOf(target.hit.object), 1); }
}
addEventListener('mousedown', e => e.button === 0 ? build() : e.button === 2 ? removeBlock() : null);

function updateStatus() {
  document.getElementById('status').textContent = `${selected.toUpperCase()} / ${materials[selected].label}　[1:壁  2:床  3:ランプ]`;
}
updateStatus();

const assistantForm = document.getElementById('assistant-form');
const assistantInput = document.getElementById('assistant-input');
const assistantMessages = document.getElementById('assistant-messages');
const assistantSubmit = document.getElementById('assistant-submit');
const assistantError = document.getElementById('assistant-error');
function addAssistantMessage(text, role) {
  const message = document.createElement('div');
  message.className = `assistant-message ${role}`;
  message.textContent = text;
  assistantMessages.appendChild(message);
  assistantMessages.scrollTop = assistantMessages.scrollHeight;
}
assistantForm.addEventListener('submit', async event => {
  event.preventDefault();
  const message = assistantInput.value.trim();
  if (!message || assistantSubmit.disabled) return;
  addAssistantMessage(message, 'user');
  assistantInput.value = '';
  assistantError.textContent = '';
  assistantSubmit.disabled = true;
  assistantSubmit.textContent = '考え中…';
  try {
    const response = await fetch('/api/assistant', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'アシスタントに接続できませんでした。');
    addAssistantMessage(data.answer, 'assistant');
  } catch (error) {
    assistantError.textContent = error.message;
  } finally {
    assistantSubmit.disabled = false;
    assistantSubmit.innerHTML = '送信 <span>➤</span>';
  }
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), .05);
  velocity.x -= velocity.x * 10 * delta; velocity.z -= velocity.z * 10 * delta;
  velocity.y -= 22 * delta;
  direction.z = Number(pressed.KeyW) - Number(pressed.KeyS);
  direction.x = Number(pressed.KeyD) - Number(pressed.KeyA);
  direction.normalize();
  if (controls.isLocked) {
    if (pressed.KeyW || pressed.KeyS) velocity.z -= direction.z * 42 * delta;
    if (pressed.KeyA || pressed.KeyD) velocity.x -= direction.x * 42 * delta;
    controls.moveRight(-velocity.x * delta); controls.moveForward(-velocity.z * delta);
    camera.position.y += velocity.y * delta;
    if (camera.position.y < 1.25) { velocity.y = 0; camera.position.y = 1.25; canJump = true; }
  }
  const target = targetCell();
  if (buildPreview) {
    buildPreview.visible = !!target;
    if (target) buildPreview.position.copy(target.place);
  }
  renderer.render(scene, camera);
}
animate();
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
