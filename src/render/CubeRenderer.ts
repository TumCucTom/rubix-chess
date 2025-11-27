import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  BOARD_SIZE,
  decodeSquareId,
  enumerateSquares,
  facePositionToDescriptor,
  normalToVector,
} from '../types/cube';
import { GameState } from '../engine/GameState';
import { Move, PieceMove, CubeMove } from '../engine/moves';
import { Piece } from '../types/pieces';

const SELECT_COLOR = new THREE.Color('#ffd54f');
const MOVE_COLOR = new THREE.Color('#81c784');
const CAPTURE_COLOR = new THREE.Color('#ef5350');
const CHECK_COLOR = new THREE.Color('#ff8a80');
const LAST_MOVE_COLOR = new THREE.Color('#64b5f6');

const PIECE_OFFSET = 0.35;

export type HighlightRequest = {
  selected?: string;
  moves?: Array<{ id: string; capture: boolean }>;
  inCheck?: string[];
  lastMove?: string[];
};

interface SquareVisual {
  anchor: THREE.Object3D;
  normal: THREE.Vector3;
  material: THREE.MeshStandardMaterial;
  baseColor: THREE.Color;
}

export class CubeRenderer {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;

  private readonly cubeGroup = new THREE.Group();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly squareVisuals = new Map<string, SquareVisual>();
  private readonly squareMeshes: THREE.Mesh[] = [];
  private readonly pieceMeshes = new Map<string, THREE.Mesh>();
  private readonly squareOccupants = new Map<string, string>();
  private animationQueue: Promise<void> = Promise.resolve();

  onSquareSelected?: (squareId: string) => void;

  constructor(private readonly mountNode: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0f111a');
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.camera.position.set(10, 12, 14);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
    mountNode.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);

    this.addLights();
    this.buildCube();
    this.scene.add(this.cubeGroup);

    window.addEventListener('resize', () => this.handleResize());
    this.renderer.domElement.addEventListener('pointermove', (event) => this.updatePointer(event));
    this.renderer.domElement.addEventListener('pointerdown', (event) => this.handlePointer(event));

    this.renderLoop();
  }

  private addLights(): void {
    this.scene.add(new THREE.AmbientLight('#ffffff', 0.45));
    const dir = new THREE.DirectionalLight('#ffffff', 0.9);
    dir.position.set(6, 10, 8);
    this.scene.add(dir);
    const rim = new THREE.DirectionalLight('#90caf9', 0.6);
    rim.position.set(-8, -6, -10);
    this.scene.add(rim);
  }

  private buildCube(): void {
    enumerateSquares().forEach((descriptor) => {
      const anchor = new THREE.Object3D();
      anchor.position.copy(this.squareToWorld(descriptor));
      anchor.name = descriptor.id;

      const planeGeom = new THREE.PlaneGeometry(0.95, 0.95);
      const material = new THREE.MeshStandardMaterial({
        color: this.squareColor(descriptor),
        roughness: 0.55,
        metalness: 0.05,
      });
      const plane = new THREE.Mesh(planeGeom, material);
      const normal = new THREE.Vector3().copy(this.normalVector(descriptor));
      const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      plane.setRotationFromQuaternion(quaternion);
      plane.userData.squareId = descriptor.id;
      plane.castShadow = false;
      plane.receiveShadow = true;
      anchor.add(plane);

      this.squareVisuals.set(descriptor.id, {
        anchor,
        normal,
        material,
        baseColor: material.color.clone(),
      });
      this.squareMeshes.push(plane);
      this.cubeGroup.add(anchor);
    });
  }

  private normalVector(descriptor: ReturnType<typeof facePositionToDescriptor>): THREE.Vector3 {
    const vec = normalToVector(descriptor.normal);
    return new THREE.Vector3(vec.x, vec.y, vec.z);
  }

  private squareColor(descriptor: ReturnType<typeof facePositionToDescriptor>): string {
    const parity = (descriptor.u + descriptor.v) % 2;
    const palette: Record<typeof descriptor.face, [string, string]> = {
      front: ['#e53935', '#c62828'],      // Red (standard Rubik's cube front)
      back: ['#ff6d00', '#e65100'],        // Orange (standard Rubik's cube back)
      left: ['#43a047', '#2e7d32'],        // Green (standard Rubik's cube left)
      right: ['#1e88e5', '#1565c0'],       // Blue (standard Rubik's cube right)
      top: ['#ffffff', '#f5f5f5'],          // White (standard Rubik's cube top)
      bottom: ['#fdd835', '#fbc02d'],       // Yellow (standard Rubik's cube bottom)
    };
    return palette[descriptor.face][parity];
  }

  private squareToWorld(descriptor: ReturnType<typeof facePositionToDescriptor>): THREE.Vector3 {
    const center = (BOARD_SIZE - 1) / 2;
    const base = new THREE.Vector3(descriptor.coord.x - center, descriptor.coord.y - center, descriptor.coord.z - center);
    const normal = this.normalVector(descriptor).multiplyScalar(0.5);
    return base.add(normal);
  }

  private handleResize(): void {
    const { clientWidth, clientHeight } = this.mountNode;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
  }

  private updatePointer(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handlePointer(event: PointerEvent): void {
    this.updatePointer(event);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.squareMeshes, false)[0];
    if (hit && hit.object.userData.squareId) {
      this.onSquareSelected?.(hit.object.userData.squareId as string);
    }
  }

  syncState(state: GameState): void {
    const alive = new Set<string>();
    this.squareOccupants.clear();
    state.pieces.forEach((piece, squareId) => {
      alive.add(piece.id);
      this.squareOccupants.set(squareId, piece.id);
      const mesh = this.ensurePieceMesh(piece);
      this.placePieceMesh(mesh, squareId);
    });
    Array.from(this.pieceMeshes.entries()).forEach(([pieceId, mesh]) => {
      if (!alive.has(pieceId)) {
        mesh.parent?.remove(mesh);
        this.pieceMeshes.delete(pieceId);
      }
    });
  }

  updateHighlights(request: HighlightRequest): void {
    this.squareVisuals.forEach(({ material, baseColor }) => {
      material.color.copy(baseColor);
    });
    if (request.selected) this.tint(request.selected, SELECT_COLOR);
    request.moves?.forEach(({ id, capture }) => this.tint(id, capture ? CAPTURE_COLOR : MOVE_COLOR));
    request.inCheck?.forEach((id) => this.tint(id, CHECK_COLOR));
    request.lastMove?.forEach((id) => this.tint(id, LAST_MOVE_COLOR));
  }

  async playMove(move: Move, nextState: GameState): Promise<void> {
    this.animationQueue = this.animationQueue.then(() => this.animateMove(move));
    await this.animationQueue;
    this.syncState(nextState);
  }

  private tint(squareId: string, color: THREE.Color): void {
    const visual = this.squareVisuals.get(squareId);
    if (!visual) return;
    visual.material.color = visual.material.color.clone().lerp(color, 0.5);
  }

  private ensurePieceMesh(piece: Piece): THREE.Mesh {
    const existing = this.pieceMeshes.get(piece.id);
    if (existing) {
      return existing;
    }
    const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 24);
    const material = new THREE.MeshStandardMaterial({
      color: piece.color === 'white' ? '#fafafa' : '#1c1c1c',
      metalness: 0.2,
      roughness: 0.35,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.userData.pieceId = piece.id;
    this.pieceMeshes.set(piece.id, mesh);
    return mesh;
  }

  private placePieceMesh(mesh: THREE.Mesh, squareId: string): void {
    const visual = this.squareVisuals.get(squareId);
    if (!visual) return;
    visual.anchor.add(mesh);
    mesh.position.copy(visual.normal).multiplyScalar(PIECE_OFFSET);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), visual.normal);
    mesh.setRotationFromQuaternion(quaternion);
  }

  private async animateMove(move: Move): Promise<void> {
    if (move.kind === 'cube') {
      await this.animateCubeMove(move);
      return;
    }
    await this.animatePieceMove(move);
  }

  private async animatePieceMove(move: PieceMove): Promise<void> {
    const pieceId = this.squareOccupants.get(move.from);
    if (!pieceId) return;
    const mesh = this.pieceMeshes.get(pieceId);
    const sourceVisual = this.squareVisuals.get(move.from);
    const targetVisual = this.squareVisuals.get(move.to);
    if (!mesh || !sourceVisual || !targetVisual) return;

    if (move.capture) {
      const capturedId = this.squareOccupants.get(move.to);
      if (capturedId) {
        const capturedMesh = this.pieceMeshes.get(capturedId);
        capturedMesh?.parent?.remove(capturedMesh);
        if (capturedMesh) {
          this.pieceMeshes.delete(capturedId);
        }
      }
    }

    const start = new THREE.Vector3();
    sourceVisual.anchor.getWorldPosition(start);
    const end = new THREE.Vector3();
    targetVisual.anchor.getWorldPosition(end);

    const holder = new THREE.Object3D();
    this.scene.add(holder);
    sourceVisual.anchor.updateMatrixWorld();
    mesh.getWorldPosition(holder.position);
    holder.add(mesh);
    mesh.position.set(0, 0, 0);

    const duration = 0.35;
    const begin = performance.now();
    await new Promise<void>((resolve) => {
      const tick = () => {
        const elapsed = (performance.now() - begin) / 1000;
        const t = Math.min(1, elapsed / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        holder.position.copy(start.clone().lerp(end, eased));
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };
      tick();
    });

    holder.remove(mesh);
    this.scene.remove(holder);
    this.squareOccupants.delete(move.from);
    this.squareOccupants.set(move.to, pieceId);
    this.placePieceMesh(mesh, move.to);
  }

  private async animateCubeMove(move: CubeMove): Promise<void> {
    const layerAnchors = Array.from(this.squareVisuals.entries())
      .filter(([squareId]) => {
        const descriptor = facePositionToDescriptor(decodeSquareId(squareId));
        return descriptor.coord[move.axis] === move.layer;
      })
      .map(([, visual]) => visual.anchor);
    if (!layerAnchors.length) return;
    const pivot = new THREE.Group();
    this.scene.add(pivot);
    layerAnchors.forEach((anchor) => pivot.attach(anchor));
    const axis = axisVector(move.axis);
    const targetAngle = rotationAmount(move.direction);
    const duration = 0.5;
    const begin = performance.now();
    await new Promise<void>((resolve) => {
      const tick = () => {
        const elapsed = (performance.now() - begin) / 1000;
        const t = Math.min(1, elapsed / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        pivot.setRotationFromAxisAngle(axis, targetAngle * eased);
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };
      tick();
    });
    layerAnchors.forEach((anchor) => this.cubeGroup.attach(anchor));
    this.scene.remove(pivot);
  }

  private renderLoop(): void {
    requestAnimationFrame(() => this.renderLoop());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

function axisVector(axis: 'x' | 'y' | 'z'): THREE.Vector3 {
  switch (axis) {
    case 'x':
      return new THREE.Vector3(1, 0, 0);
    case 'y':
      return new THREE.Vector3(0, 1, 0);
    default:
      return new THREE.Vector3(0, 0, 1);
  }
}

function rotationAmount(direction: 'cw' | 'ccw' | '180'): number {
  if (direction === '180') return Math.PI;
  return direction === 'cw' ? -Math.PI / 2 : Math.PI / 2;
}
