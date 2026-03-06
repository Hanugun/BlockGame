import * as THREE from 'three';
import {
  getPieceCells,
  getPieceDefinition,
  type MatchState,
} from '../lib/core.js';
import type { BattleGameHandle } from './battle-game-handle.js';
import type { SceneModel } from './scenes/battle-scene-types.js';

interface CellMeshes {
  terrain: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  water: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshPhysicalMaterial>;
  hole: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  mine: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  ice: THREE.Mesh<THREE.RingGeometry, THREE.MeshStandardMaterial>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toLocal(x: number, y: number, width: number, height: number): { x: number; z: number } {
  return {
    x: (x - ((width - 1) / 2)) * 0.66,
    z: (y - ((height - 1) / 2)) * 0.66,
  };
}

function terrainY(height: number): number {
  return 0.1 + (height * 0.14);
}

class ThreeSoloScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly parent: HTMLElement;

  private readonly boardGroup = new THREE.Group();
  private readonly cells: CellMeshes[] = [];
  private readonly activeProjectionGroup = new THREE.Group();
  private readonly activeProjectionPatches: Array<THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>> = [];
  private readonly activePulseRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;

  private readonly terrainGeometry = new THREE.BoxGeometry(0.64, 1, 0.64);
  private readonly waterGeometry = new THREE.CylinderGeometry(0.27, 0.31, 1, 18);
  private readonly holeGeometry = new THREE.CylinderGeometry(0.19, 0.26, 0.14, 18);
  private readonly mineGeometry = new THREE.SphereGeometry(0.12, 16, 16);
  private readonly iceGeometry = new THREE.RingGeometry(0.19, 0.29, 24);
  private readonly projectionPatchGeometry = new THREE.BoxGeometry(0.62, 0.02, 0.62);

  private readonly terrainMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xb77848),
    roughness: 0.92,
    metalness: 0.05,
  });
  private readonly terrainPeakMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xcc8f57),
    roughness: 0.84,
    metalness: 0.03,
  });
  private readonly waterMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x6dd4ff),
    roughness: 0.1,
    metalness: 0,
    transparent: true,
    opacity: 0.72,
    transmission: 0.4,
    thickness: 0.16,
  });
  private readonly holeMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x120e0d),
    roughness: 1,
    metalness: 0,
  });
  private readonly mineMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xff7058),
    emissive: new THREE.Color(0xd2342a),
    emissiveIntensity: 0.66,
    roughness: 0.44,
    metalness: 0.2,
  });
  private readonly iceMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xd8f8ff),
    emissive: new THREE.Color(0x56cae6),
    emissiveIntensity: 0.46,
    transparent: true,
    opacity: 0.84,
    roughness: 0.14,
    metalness: 0.06,
    side: THREE.DoubleSide,
  });
  private readonly projectionPatchMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xff8fb0),
    transparent: true,
    opacity: 0.42,
  });

  private readonly disposer: Array<THREE.Material | THREE.BufferGeometry | THREE.Texture> = [];

  private model: SceneModel = {
    localSlot: 0,
    match: null,
    mode: 'solo',
    reducedMotion: false,
    highContrast: false,
    sendCommand: () => {},
  };

  private previousSnapshot: MatchState | null = null;
  private currentSnapshot: MatchState | null = null;
  private revisionKey = '';
  private transitionAt = performance.now();

  private animationFrame = 0;
  private disposed = false;

  constructor(parent: HTMLElement) {
    this.parent = parent;
    this.parent.tabIndex = 0;
    this.parent.style.touchAction = 'none';

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2e0a7e);
    this.scene.fog = new THREE.Fog(0x2a0a6f, 10, 42);

    this.camera = new THREE.PerspectiveCamera(44, 16 / 9, 0.1, 120);
    this.camera.position.set(0, 10.4, 11.7);
    this.camera.lookAt(0, 1.5, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.parent.appendChild(this.renderer.domElement);

    const starfield = new THREE.Mesh(
      this.track(new THREE.SphereGeometry(52, 24, 24)),
      this.track(new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x5b1cd1),
        side: THREE.BackSide,
      })),
    );
    this.scene.add(starfield);

    const nebula = new THREE.Mesh(
      this.track(new THREE.PlaneGeometry(52, 28)),
      this.track(new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x7f28f0),
        transparent: true,
        opacity: 0.22,
      })),
    );
    nebula.position.set(0, 9, -16);
    this.scene.add(nebula);

    const baseDisk = new THREE.Mesh(
      this.track(new THREE.CylinderGeometry(5.2, 6.2, 1.6, 44)),
      this.track(new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x5c3122),
        roughness: 0.93,
        metalness: 0,
      })),
    );
    baseDisk.position.y = -0.95;
    baseDisk.castShadow = true;
    baseDisk.receiveShadow = true;
    this.boardGroup.add(baseDisk);

    const rim = new THREE.Mesh(
      this.track(new THREE.TorusGeometry(6.3, 0.09, 10, 80)),
      this.track(new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x2ecfb0),
        emissive: new THREE.Color(0x1a8f7f),
        emissiveIntensity: 0.4,
        roughness: 0.25,
        metalness: 0.4,
      })),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.03;
    this.boardGroup.add(rim);

    this.scene.add(this.boardGroup);

    for (let index = 0; index < 36; index += 1) {
      const patch = new THREE.Mesh(this.projectionPatchGeometry, this.track(this.projectionPatchMaterial.clone()));
      patch.visible = false;
      this.activeProjectionGroup.add(patch);
      this.activeProjectionPatches.push(patch);
    }

    this.activePulseRing = new THREE.Mesh(
      this.track(new THREE.RingGeometry(0.42, 0.62, 32)),
      this.track(new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xff9dc0),
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      })),
    );
    this.activePulseRing.rotation.x = -Math.PI / 2;
    this.activePulseRing.visible = false;
    this.activeProjectionGroup.add(this.activePulseRing);

    this.scene.add(this.activeProjectionGroup);

    const hemi = new THREE.HemisphereLight(0xf0e1ff, 0x3e1f13, 0.68);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff3e0, 1.38);
    sun.position.set(8, 12, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x84b0ff, 0.44);
    fill.position.set(-8, 6, -8);
    this.scene.add(fill);

    this.parent.addEventListener('pointerdown', () => {
      this.parent.focus();
    });
    window.addEventListener('resize', this.resize);
    this.resize();
    this.animationFrame = window.requestAnimationFrame(this.loop);
  }

  setModel(model: SceneModel): void {
    this.model = model;
    if (!model.match || model.match.mode !== 'solo') {
      this.currentSnapshot = null;
      this.previousSnapshot = null;
      this.revisionKey = '';
      return;
    }

    const next = structuredClone(model.match);
    const nextKey = this.getRevision(next);
    if (!this.currentSnapshot) {
      this.currentSnapshot = next;
      this.revisionKey = nextKey;
      this.transitionAt = performance.now();
      return;
    }
    if (nextKey !== this.revisionKey) {
      this.previousSnapshot = this.currentSnapshot;
      this.currentSnapshot = next;
      this.revisionKey = nextKey;
      this.transitionAt = performance.now();
      return;
    }
    this.currentSnapshot = next;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    window.cancelAnimationFrame(this.animationFrame);
    window.removeEventListener('resize', this.resize);

    for (const resource of this.disposer) {
      resource.dispose();
    }

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.parent) {
      this.parent.removeChild(this.renderer.domElement);
    }
  }

  private track<T extends THREE.Material | THREE.BufferGeometry | THREE.Texture>(resource: T): T {
    this.disposer.push(resource);
    return resource;
  }

  private readonly resize = (): void => {
    const width = Math.max(1, this.parent.clientWidth || window.innerWidth || 1280);
    const height = Math.max(1, this.parent.clientHeight || window.innerHeight || 720);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  private readonly loop = (now: number): void => {
    if (this.disposed) {
      return;
    }
    this.animationFrame = window.requestAnimationFrame(this.loop);
    this.render(now);
  };

  private getRevision(snapshot: MatchState): string {
    const player = snapshot.players[0];
    return [
      snapshot.tick,
      snapshot.phase,
      snapshot.stormLevel,
      player.score,
      player.drainLevel,
      player.activePiece ? `${player.activePiece.id}:${player.activePiece.anchor.x}:${player.activePiece.anchor.y}:${player.activePiece.rotation}` : 'none',
      player.board.cells.map((cell) => `${cell.height},${Math.round(cell.water * 10)},${cell.holeDepth},${cell.mineTicks},${cell.frozenTicks}`).join('|'),
    ].join('::');
  }

  private ensureCells(width: number, height: number): void {
    const targetCount = width * height;
    while (this.cells.length < targetCount) {
      const terrain = new THREE.Mesh(this.terrainGeometry, this.terrainMaterial);
      terrain.castShadow = true;
      terrain.receiveShadow = true;

      const water = new THREE.Mesh(this.waterGeometry, this.waterMaterial);
      water.visible = false;

      const hole = new THREE.Mesh(this.holeGeometry, this.holeMaterial);
      hole.visible = false;

      const mine = new THREE.Mesh(this.mineGeometry, this.mineMaterial);
      mine.visible = false;

      const ice = new THREE.Mesh(this.iceGeometry, this.iceMaterial);
      ice.rotation.x = -Math.PI / 2;
      ice.visible = false;

      this.boardGroup.add(terrain, water, hole, mine, ice);
      this.cells.push({ terrain, water, hole, mine, ice });
    }
  }

  private render(now: number): void {
    const snapshot = this.currentSnapshot;
    if (!snapshot || snapshot.mode !== 'solo') {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const previous = this.previousSnapshot ?? snapshot;
    const player = snapshot.players[0];
    const previousPlayer = previous.players[0];

    this.ensureCells(player.board.width, player.board.height);

    const duration = this.model.reducedMotion ? 1 : 100;
    const alpha = clamp((now - this.transitionAt) / duration, 0, 1);

    for (let y = 0; y < player.board.height; y += 1) {
      for (let x = 0; x < player.board.width; x += 1) {
        const index = (y * player.board.width) + x;
        const mesh = this.cells[index]!;
        const next = player.board.cells[index]!;
        const prev = previousPlayer.board.cells[index] ?? next;
        const local = toLocal(x, y, player.board.width, player.board.height);

        const height = prev.height + ((next.height - prev.height) * alpha);
        const water = prev.water + ((next.water - prev.water) * alpha);
        const holeDepth = prev.holeDepth + ((next.holeDepth - prev.holeDepth) * alpha);

        const topY = terrainY(height);
        mesh.terrain.position.set(local.x, topY * 0.5, local.z);
        mesh.terrain.scale.set(1, topY, 1);
        mesh.terrain.material = height >= 5 ? this.terrainPeakMaterial : this.terrainMaterial;

        mesh.hole.visible = holeDepth > 0.1;
        if (mesh.hole.visible) {
          mesh.hole.position.set(local.x, 0.1, local.z);
          mesh.hole.scale.set(1, 1 + (holeDepth * 0.3), 1);
        }

        mesh.water.visible = water > 0.06 && !mesh.hole.visible;
        if (mesh.water.visible) {
          const wave = this.model.reducedMotion ? 0 : Math.sin((now * 0.003) + (x * 0.5) + (y * 0.32)) * 0.04;
          const waterHeight = Math.max(0.02, (water * 0.12) + wave);
          mesh.water.position.set(local.x, topY + (waterHeight * 0.5) + 0.03, local.z);
          mesh.water.scale.set(1, waterHeight, 1);
          mesh.water.material.opacity = clamp(0.7 + wave, 0.58, 0.84);
        }

        mesh.mine.visible = next.mineTicks > 0;
        if (mesh.mine.visible) {
          const pulse = this.model.reducedMotion ? 0 : Math.sin((now * 0.012) + x + y) * 0.2;
          mesh.mine.position.set(local.x, topY + 0.17, local.z);
          mesh.mine.scale.setScalar(1 + (pulse * 0.15));
          mesh.mine.material.emissiveIntensity = 0.66 + (pulse * 0.4);
        }

        mesh.ice.visible = next.frozenTicks > 0 && !mesh.hole.visible;
        if (mesh.ice.visible) {
          mesh.ice.position.set(local.x, topY + 0.05, local.z);
          mesh.ice.scale.setScalar(1.02);
        }
      }
    }

    for (let index = player.board.width * player.board.height; index < this.cells.length; index += 1) {
      const mesh = this.cells[index]!;
      mesh.terrain.visible = false;
      mesh.water.visible = false;
      mesh.hole.visible = false;
      mesh.mine.visible = false;
      mesh.ice.visible = false;
    }

    this.updateProjection(player, now);

    const orbit = this.model.reducedMotion ? 0 : Math.sin(now * 0.00022) * 0.35;
    this.camera.position.set(orbit, 10.2, 11.8);
    this.camera.lookAt(0, 1.5, 0);

    this.renderer.render(this.scene, this.camera);
  }

  private updateProjection(player: MatchState['players'][0], now: number): void {
    const activePiece = player.activePiece;
    if (!activePiece) {
      for (const patch of this.activeProjectionPatches) {
        patch.visible = false;
      }
      this.activePulseRing.visible = false;
      return;
    }

    const macroCells = getPieceCells(activePiece.kind, activePiece.rotation).map((cell) => ({
      x: activePiece.anchor.x + cell.x,
      y: activePiece.anchor.y + cell.y,
    }));

    const color = new THREE.Color(getPieceDefinition(activePiece.kind).color);
    const centerAccumulator = { x: 0, z: 0, count: 0 };
    let patchIndex = 0;

    for (const macroCell of macroCells) {
      for (let dy = 0; dy < player.cellScale; dy += 1) {
        for (let dx = 0; dx < player.cellScale; dx += 1) {
          const simulationX = (macroCell.x * player.cellScale) + dx;
          const simulationY = (macroCell.y * player.cellScale) + dy;
          if (simulationX < 0 || simulationY < 0 || simulationX >= player.board.width || simulationY >= player.board.height) {
            continue;
          }
          const patch = this.activeProjectionPatches[patchIndex]!;
          const local = toLocal(simulationX, simulationY, player.board.width, player.board.height);
          const cellIndex = (simulationY * player.board.width) + simulationX;
          const terrainHeight = terrainY(player.board.cells[cellIndex]!.height);

          patch.visible = true;
          patch.position.set(local.x, terrainHeight + 0.05, local.z);
          patch.material.color.copy(color);
          patch.material.opacity = clamp(0.3 + (Math.sin((now * 0.005) + patchIndex) * 0.08), 0.22, 0.44);

          centerAccumulator.x += local.x;
          centerAccumulator.z += local.z;
          centerAccumulator.count += 1;
          patchIndex += 1;

          if (patchIndex >= this.activeProjectionPatches.length) {
            break;
          }
        }
        if (patchIndex >= this.activeProjectionPatches.length) {
          break;
        }
      }
      if (patchIndex >= this.activeProjectionPatches.length) {
        break;
      }
    }

    for (; patchIndex < this.activeProjectionPatches.length; patchIndex += 1) {
      this.activeProjectionPatches[patchIndex]!.visible = false;
    }

    if (centerAccumulator.count > 0) {
      const cx = centerAccumulator.x / centerAccumulator.count;
      const cz = centerAccumulator.z / centerAccumulator.count;
      const pulse = this.model.reducedMotion ? 0 : Math.sin(now * 0.006) * 0.09;
      this.activePulseRing.visible = true;
      this.activePulseRing.position.set(cx, 0.54 + pulse, cz);
      this.activePulseRing.scale.setScalar(1.02 + (pulse * 0.6));
      this.activePulseRing.material.color.copy(color);
    } else {
      this.activePulseRing.visible = false;
    }
  }
}

export function createBattleGameThree(parent: HTMLElement): BattleGameHandle {
  const scene = new ThreeSoloScene(parent);

  return {
    game: {
      destroy: () => {
        scene.dispose();
      },
    },
    scene,
  };
}
