import { AxesHelper, PerspectiveCamera, Plane, Raycaster, Scene, Vector2, Vector3, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { compileForce, ForceValidationError, type CompiledForce } from '../engine/forces/compile';
import { summarizeEnergy } from '../engine/cpu/energy';
import { inactiveCouplings } from '../engine/forces/couplings';
import { forceFromPreset, type ForcePresetId } from '../engine/forces/presets';
import type { ForceDefinition } from '../engine/forces/types';
import { GpuCompute, ShaderCompileError, textureWidthFor } from '../engine/gpu/GpuCompute';
import { ParticleKind, ParticleSet, type Particle, type Vec3 } from '../engine/particles';
import { createRng, inSphere, inDisk, uniform } from '../engine/random';
import { ParticlePoints, type ColorMode, type ParticleStyle } from '../engine/render/ParticlePoints';
import { DEFAULT_SETTINGS, validateSettings, type SimulationSettings } from '../engine/settings';
import { JsonReader } from '../engine/json';
import { createSnapshot, readSnapshot, SNAPSHOT_FORMAT, type Snapshot } from '../engine/snapshot';
import { findScenario, SCENARIOS } from '../scenarios';
import { readScenario, SCENARIO_FORMAT } from '../scenarios/scenarioFile';
import type { Scenario } from '../scenarios/types';
import { Store } from './store';

export interface GeneratorTemplate {
  count: number;
  cloudRadius: number;
  mass: number;
  charge: number;
  chargeSpread: 'fixed' | 'random sign';
  spin: number;
  parity: number;
  nuclearCharge: number;
  color: Vec3;
  speed: number;
  fixed: boolean;
}

export const DEFAULT_GENERATOR: GeneratorTemplate = {
  count: 100, cloudRadius: 50, mass: 1, charge: 1, chargeSpread: 'random sign',
  spin: 0, parity: 1, nuclearCharge: 0, color: [0, 0, 0], speed: 0, fixed: false,
};

export interface PhysicsSample {
  time: number;
  kinetic: number;
  potential: number;
  total: number;
  meanSpeed: number;
  maxSpeed: number;
  temperature: number;
}

export interface PerformanceSample {
  /** Seconds since page load. */
  wall: number;
  fps: number;
  stepsPerSecond: number;
  /** CPU time spent issuing a frame; GPU execution is asynchronous and not included. */
  frameMs: number;
  /** Time of the once-per-second readback (velocity + potential pass) itself. */
  sampleMs: number;
}

export interface Notice {
  id: number;
  level: 'info' | 'error';
  text: string;
}

export interface AppState {
  scenarioId: string;
  description: string;
  name: string;
  settings: SimulationSettings;
  forces: ForceDefinition[];
  forceErrors: Record<string, string[]>;
  forceWarnings: Record<string, string[]>;
  shaderError: string | undefined;
  paused: boolean;
  time: number;
  particleCount: number;
  capacity: number;
  colorMode: ColorMode;
  particleStyle: ParticleStyle;
  fpsLimit: FpsLimit;
  averageSpeed: number;
  physicsHistory: PhysicsSample[];
  performanceHistory: PerformanceSample[];
  /** Enabled forces written as F(r): their energy is not in the potential total. */
  energyMissing: string[];
  particleRadius: number;
  showAxes: boolean;
  inspected: { index: number; particle: Particle } | undefined;
  followInspected: boolean;
  selection: number[];
  clipboard: Particle[];
  generator: GeneratorTemplate;
  fps: number;
  notices: Notice[];
}

export const FPS_LIMITS = [30, 60, 0] as const;
/** 0 means unlimited. */
export type FpsLimit = (typeof FPS_LIMITS)[number];

const DEFAULT_CAPACITY = 128 * 128;
const NOTICE_LIFETIME_MS = 6000;

function structureKey(forces: readonly CompiledForce[]): string {
  return JSON.stringify(forces.map(({ definition: d }) => [d.expression, d.mode, d.range, d.params.map((p) => p.name)]));
}

export class SimulationController {
  readonly store: Store<AppState>;
  readonly renderer: WebGLRenderer;
  readonly camera = new PerspectiveCamera(60, 1, 0.1, 1e6);
  readonly controls: OrbitControls;
  private readonly scene = new Scene();
  private readonly axes = new AxesHelper(100);
  private readonly set: ParticleSet;
  private readonly gpu: GpuCompute;
  private readonly points: ParticlePoints;
  private compiled: CompiledForce[] = [];
  private compiledKey = '';
  private cpuStale = false;
  private stepRequested = false;
  private running = false;
  private frameHandle = 0;
  private lastFrame = 0;
  private fpsFrames = 0;
  private fpsSince = 0;
  private noticeId = 0;
  private stepsSinceSample = 0;
  private statsActive = false;
  private frameMsSinceSample = 0;
  private restart: () => void = () => {
    throw new Error('no scenario loaded yet');
  };

  constructor(capacity = DEFAULT_CAPACITY) {
    const width = textureWidthFor(capacity);
    this.set = new ParticleSet(width * width);
    this.renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.gpu = new GpuCompute(this.renderer, this.set);
    this.points = new ParticlePoints(width);
    this.scene.add(this.points.object, this.axes);
    this.store = new Store<AppState>({
      scenarioId: '', description: '', name: '', settings: { ...DEFAULT_SETTINGS }, forces: [], forceErrors: {}, forceWarnings: {},
      shaderError: undefined, paused: false, time: 0, particleCount: 0, capacity: this.set.capacity,
      colorMode: 'charge', particleStyle: 'spherow', fpsLimit: 60, averageSpeed: 0, physicsHistory: [], performanceHistory: [], energyMissing: [], particleRadius: 3, showAxes: true, inspected: undefined, followInspected: false,
      selection: [], clipboard: [], generator: { ...DEFAULT_GENERATOR }, fps: 0, notices: [],
    });
  }

  get state(): AppState {
    return this.store.get();
  }

  /** Attaches the canvas and starts the frame loop; returns the matching detach. */
  mount(container: HTMLElement): () => void {
    container.appendChild(this.renderer.domElement);
    this.resize(container.clientWidth, container.clientHeight);
    this.running = true;
    this.scheduleFrame();
    return () => {
      this.running = false;
      cancelAnimationFrame(this.frameHandle);
      this.renderer.domElement.remove();
    };
  }

  dispose(): void {
    this.running = false;
    cancelAnimationFrame(this.frameHandle);
    this.controls.dispose();
    this.gpu.dispose();
    this.points.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.applyRadius();
  }

  notify(text: string, level: Notice['level'] = 'info'): void {
    if (level === 'error') console.error(text);
    const notice = { id: ++this.noticeId, level, text };
    this.store.set({ notices: [...this.state.notices, notice] });
    setTimeout(() => this.store.set({ notices: this.state.notices.filter((n) => n.id !== notice.id) }), NOTICE_LIFETIME_MS);
  }

  /* Scenarios and snapshots */

  loadScenario(id: string): void {
    this.startScenario(findScenario(id), id);
  }

  private startScenario(scenario: Scenario, scenarioId: string): void {
    const settings = { ...DEFAULT_SETTINGS, ...scenario.settings };
    const particles = scenario.particles(createRng(scenario.seed));
    this.replaceWorld(scenario.name, settings, scenario.forces(), particles, 0);
    this.store.set({ scenarioId, description: scenario.description, particleRadius: scenario.particleRadius });
    this.setColorMode(scenario.colorMode);
    this.resetCamera(scenario.cameraDistance);
    this.applyRadius();
    this.restart = () => this.startScenario(scenario, scenarioId);
  }

  /** Recreates the current world from its source: bundled scenario, imported scenario or snapshot. */
  reset(): void {
    this.restart();
  }

  cycleScenario(offset: number): void {
    const index = SCENARIOS.findIndex((s) => s.id === this.state.scenarioId);
    if (index === -1) {
      this.notify('The current world was imported and is not in the scenario list; press Home for the first scenario', 'error');
      return;
    }
    const next = Math.min(Math.max(index + offset, 0), SCENARIOS.length - 1);
    if (next !== index) this.loadScenario(SCENARIOS[next]!.id);
  }

  exportSnapshot(): Snapshot {
    this.syncFromGpu();
    const { name, time, settings, forces } = this.state;
    return createSnapshot(name, time, settings, forces, this.set.toArray());
  }

  /** Accepts either a snapshot or a scenario file, dispatching on its `format` field. */
  importFile(text: string, fileName: string): void {
    const json = new JsonReader(`file ${fileName}`);
    const value = json.parse(text);
    const format = json.object(value, '$').format;
    if (format === SCENARIO_FORMAT) {
      this.startScenario(readScenario(value, fileName), '');
      return;
    }
    if (format !== SNAPSHOT_FORMAT) {
      json.fail('format', `unknown format ${JSON.stringify(format)}; expected '${SNAPSHOT_FORMAT}' or '${SCENARIO_FORMAT}'`);
    }
    const snapshot = readSnapshot(value);
    const load = () => {
      this.replaceWorld(snapshot.name, snapshot.settings, snapshot.forces, snapshot.particles, snapshot.time);
      this.store.set({ scenarioId: '', description: `Snapshot imported from ${fileName}` });
    };
    load();
    this.restart = load;
  }

  private replaceWorld(name: string, settings: SimulationSettings, forces: ForceDefinition[], particles: Particle[], time: number): void {
    if (particles.length > this.set.capacity) {
      throw new Error(`'${name}' needs ${particles.length} particles, capacity is ${this.set.capacity}`);
    }
    this.setSettings(settings);
    this.setForces(forces);
    this.points.setHighlight(undefined);
    this.set.clear();
    this.set.addAll(particles);
    this.cpuStale = false;
    this.store.set({ name, time, inspected: undefined, selection: [], followInspected: false, physicsHistory: [] });
    this.uploadParticles();
  }

  /* Physics configuration */

  setSettings(patch: Partial<SimulationSettings>): void {
    const settings = { ...this.state.settings, ...patch };
    const problems = validateSettings(settings);
    if (problems.length > 0) throw new Error(problems.join('; '));
    this.gpu.setSettings(settings);
    this.store.set({ settings });
  }

  setForces(forces: ForceDefinition[]): void {
    const forceErrors: Record<string, string[]> = {};
    const compiled: CompiledForce[] = [];
    for (const force of forces) {
      try {
        const result = compileForce(force);
        if (force.enabled) compiled.push(result);
      } catch (error) {
        if (!(error instanceof ForceValidationError)) throw error;
        forceErrors[force.id] = error.problems;
      }
    }
    let shaderError: string | undefined;
    try {
      const key = structureKey(compiled);
      if (key !== this.compiledKey) {
        this.gpu.setForces(compiled);
        this.compiledKey = key;
      } else {
        this.gpu.setForceValues(compiled);
      }
      this.compiled = compiled;
    } catch (error) {
      if (!(error instanceof ShaderCompileError)) throw error;
      shaderError = error.log;
      this.notify(`Shader compile failed; previous forces stay active.\n${error.log}`, 'error');
    }
    this.store.set({ forces, forceErrors, shaderError });
    this.refreshForceWarnings();
  }

  get compiledForces(): readonly CompiledForce[] {
    return this.compiled;
  }

  addForce(preset: ForcePresetId): void {
    this.setForces([...this.state.forces, forceFromPreset(preset)]);
  }

  updateForce(id: string, patch: Partial<ForceDefinition>): void {
    this.setForces(this.state.forces.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  removeForce(id: string): void {
    this.setForces(this.state.forces.filter((f) => f.id !== id));
  }

  /* Time control */

  togglePause(): void {
    this.store.set({ paused: !this.state.paused });
  }

  requestStep(): void {
    this.stepRequested = true;
  }

  /* View */

  setColorMode(colorMode: ColorMode): void {
    this.points.setColorMode(colorMode);
    this.store.set({ colorMode });
  }

  setParticleStyle(particleStyle: ParticleStyle): void {
    this.points.setStyle(particleStyle);
    this.store.set({ particleStyle });
  }

  setParticleRadius(particleRadius: number): void {
    if (!(particleRadius > 0)) throw new Error(`particle radius must be > 0, got ${particleRadius}`);
    this.store.set({ particleRadius });
    this.applyRadius();
  }

  toggleAxes(): void {
    this.axes.visible = !this.axes.visible;
    this.store.set({ showAxes: this.axes.visible });
  }

  resetCamera(distance = this.camera.position.length() || 1000): void {
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(0, 0, distance);
    this.camera.up.set(0, 1, 0);
    this.controls.enableRotate = !this.state.settings.mode2D;
    this.controls.update();
    this.store.set({ followInspected: false });
  }

  /** Looks straight down the z axis at the current target, as v1's [V] key. */
  frontCamera(): void {
    const target = this.controls.target;
    this.camera.position.set(target.x, target.y, target.z + this.controls.getDistance());
    this.camera.up.set(0, 1, 0);
    this.controls.update();
  }

  /* Particles */

  private syncFromGpu(): void {
    if (!this.cpuStale) return;
    this.gpu.readback();
    this.cpuStale = false;
  }

  private uploadParticles(): void {
    this.gpu.upload();
    this.points.setCount(this.set.count);
    this.store.set({ particleCount: this.set.count });
    this.refreshForceWarnings();
    this.refreshInspected();
  }

  /** Attribute columns never change on the GPU, so the CPU copy is current even when positions are stale. */
  private refreshForceWarnings(): void {
    const forceWarnings: Record<string, string[]> = {};
    for (const force of this.compiled) {
      const warnings = inactiveCouplings(force, this.set);
      if (warnings.length > 0) forceWarnings[force.definition.id] = warnings;
    }
    this.store.set({ forceWarnings });
  }

  /** Every CPU-side edit goes through here: read back, mutate, upload. */
  editParticles(mutate: (set: ParticleSet) => void): void {
    this.syncFromGpu();
    mutate(this.set);
    this.uploadParticles();
  }

  readParticles(): Particle[] {
    this.syncFromGpu();
    return this.set.toArray();
  }

  inspect(index: number | undefined): void {
    this.points.setHighlight(index);
    if (index === undefined) {
      this.store.set({ inspected: undefined, followInspected: false });
      return;
    }
    this.syncFromGpu();
    this.store.set({ inspected: { index, particle: this.set.get(index) } });
  }

  refreshInspected(): void {
    const inspected = this.state.inspected;
    if (!inspected) return;
    if (inspected.index >= this.set.count) {
      this.inspect(undefined);
      return;
    }
    this.syncFromGpu();
    this.store.set({ inspected: { index: inspected.index, particle: this.set.get(inspected.index) } });
  }

  /** Patches the live particle, so fields the GPU keeps changing are never overwritten by a stale copy. */
  updateInspected(patch: Partial<Particle>): void {
    const inspected = this.state.inspected;
    if (!inspected) throw new Error('no particle is being inspected');
    this.editParticles((set) => set.set(inspected.index, { ...set.get(inspected.index), ...patch }));
  }

  toggleFollow(): void {
    this.store.set({ followInspected: !this.state.followInspected && this.state.inspected !== undefined });
  }

  /** Returns the particle drawn closest to a canvas pixel, within a pick radius. */
  /** Visits every particle in front of the camera with its client-space pixel position. */
  private forEachOnScreen(visit: (index: number, x: number, y: number) => void): void {
    this.syncFromGpu();
    const rect = this.renderer.domElement.getBoundingClientRect();
    const point = new Vector3();
    for (let k = 0; k < this.set.count; k++) {
      point.fromArray(this.set.position, k * 4).project(this.camera);
      if (point.z > 1) continue;
      visit(k, rect.left + ((point.x + 1) / 2) * rect.width, rect.top + ((1 - point.y) / 2) * rect.height);
    }
  }

  pickAt(clientX: number, clientY: number, radiusPx = 12): number | undefined {
    let best: number | undefined;
    let bestDistance = radiusPx;
    this.forEachOnScreen((k, x, y) => {
      const distance = Math.hypot(x - clientX, y - clientY);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = k;
      }
    });
    return best;
  }

  selectInRect(x0: number, y0: number, x1: number, y1: number): void {
    const [left, right] = [Math.min(x0, x1), Math.max(x0, x1)];
    const [top, bottom] = [Math.min(y0, y1), Math.max(y0, y1)];
    const selection: number[] = [];
    this.forEachOnScreen((k, x, y) => {
      if (x >= left && x <= right && y >= top && y <= bottom) selection.push(k);
    });
    this.store.set({ selection });
    this.notify(`Selected ${selection.length} particle(s)`);
  }

  clearSelection(): void {
    this.store.set({ selection: [] });
  }

  copySelection(): void {
    const { selection } = this.state;
    if (selection.length === 0) {
      this.notify('Nothing selected: shift+drag to select particles first', 'error');
      return;
    }
    this.syncFromGpu();
    const particles = selection.map((k) => this.set.get(k));
    const center = centroid(particles.map((p) => p.position));
    const clipboard = particles.map((p) => ({ ...p, position: p.position.map((c, k) => c - center[k]!) as Vec3 }));
    this.store.set({ clipboard });
    this.notify(`Copied ${clipboard.length} particle(s); hold Z and click to place`);
  }

  /** Removal shifts indices, so the index-based selection and inspection are dropped with it. */
  removeParticles(indices: readonly number[]): void {
    this.inspect(undefined);
    this.store.set({ selection: [] });
    this.editParticles((set) => set.remove(indices));
  }

  deleteSelection(): void {
    const { selection } = this.state;
    if (selection.length === 0) {
      this.notify('Nothing selected: shift+drag to select particles first', 'error');
      return;
    }
    this.removeParticles(selection);
    this.notify(`Deleted ${selection.length} particle(s)`);
  }

  deleteAll(): void {
    this.removeParticles(Array.from({ length: this.set.count }, (_, k) => k));
  }

  placeClipboard(clientX: number, clientY: number): void {
    const { clipboard } = this.state;
    if (clipboard.length === 0) {
      this.notify('Clipboard is empty: select particles and press X first', 'error');
      return;
    }
    const at = this.worldAt(clientX, clientY);
    this.addParticles(clipboard.map((p) => ({ ...p, position: p.position.map((c, k) => c + at[k]!) as Vec3 })));
  }

  setGenerator(patch: Partial<GeneratorTemplate>): void {
    this.store.set({ generator: { ...this.state.generator, ...patch } });
  }

  generateAt(clientX: number | undefined, clientY: number | undefined): void {
    const g = this.state.generator;
    const at = clientX === undefined || clientY === undefined ? [0, 0, 0] : this.worldAt(clientX, clientY);
    const rng = createRng(Date.now());
    const mode2D = this.state.settings.mode2D;
    const particles = Array.from({ length: g.count }, (): Particle => {
      const offset = mode2D ? inDisk(rng, g.cloudRadius) : inSphere(rng, g.cloudRadius);
      const direction = mode2D ? inDisk(rng, 1) : inSphere(rng, 1);
      return {
        kind: g.fixed ? 2 : 1,
        position: offset.map((c, k) => c + at[k]!) as Vec3,
        velocity: direction.map((c) => c * g.speed) as Vec3,
        time: 0,
        mass: g.mass,
        charge: g.chargeSpread === 'random sign' && uniform(rng, 0, 1) < 0.5 ? -g.charge : g.charge,
        spin: g.spin,
        parity: g.parity,
        nuclearCharge: g.nuclearCharge,
        color: [...g.color],
      };
    });
    this.addParticles(particles);
  }

  addParticles(particles: Particle[]): void {
    const free = this.set.capacity - this.set.count;
    if (particles.length > free) {
      this.notify(`Cannot add ${particles.length} particles: only ${free} of ${this.set.capacity} slots free`, 'error');
      return;
    }
    this.editParticles((set) => set.addAll(particles));
  }

  /** Applies v -> v * factor + random kick to every dynamic particle (v1's B/T/Y keys). */
  scaleVelocities(factor: number, kick = 0): void {
    const rng = createRng(Date.now());
    this.editParticles((set) => {
      for (let k = 0; k < set.count; k++) {
        const p = set.get(k);
        if (p.kind === ParticleKind.fixed) continue;
        const noise = this.state.settings.mode2D ? inDisk(rng, kick) : inSphere(rng, kick);
        set.set(k, { ...p, velocity: p.velocity.map((v, axis) => v * factor + noise[axis]!) as Vec3 });
      }
    });
  }

  /** World point under the cursor on the plane through the orbit target facing the camera. */
  worldAt(clientX: number, clientY: number): Vec3 {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const raycaster = new Raycaster();
    raycaster.setFromCamera(ndc, this.camera);
    const normal = this.camera.getWorldDirection(new Vector3()).negate();
    const plane = new Plane().setFromNormalAndCoplanarPoint(normal, this.controls.target);
    const hit = raycaster.ray.intersectPlane(plane, new Vector3()) ?? this.controls.target.clone();
    if (this.state.settings.mode2D) hit.z = 0;
    return [hit.x, hit.y, hit.z];
  }

  screenshot(): Promise<Blob> {
    this.render();
    return new Promise((resolve, reject) =>
      this.renderer.domElement.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas produced no image'))), 'image/png'),
    );
  }

  /* Frame loop */

  private applyRadius(): void {
    const height = this.renderer.domElement.height;
    this.points.setRadius(this.state.particleRadius, height, this.camera.fov);
  }

  private render(): void {
    this.points.bind({
      position: this.gpu.positionTexture,
      velocity: this.gpu.velocityTexture,
      attributes: this.gpu.attributesTexture,
      color: this.gpu.colorTexture,
    });
    this.renderer.render(this.scene, this.camera);
  }

  setFpsLimit(fpsLimit: FpsLimit): void {
    if (!FPS_LIMITS.includes(fpsLimit)) throw new Error(`fps limit must be one of ${FPS_LIMITS.join(', ')}, got ${fpsLimit}`);
    this.store.set({ fpsLimit });
  }

  // "Unlimited" means every display refresh. Rendering faster than requestAnimationFrame
  // (e.g. via MessageChannel) only queues frames nobody sees and starves the page.
  private scheduleFrame(): void {
    if (this.running) this.frameHandle = requestAnimationFrame(this.frame);
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    const limit = this.state.fpsLimit;
    // Half a millisecond of slack keeps a 60 Hz display at 60 fps despite rAF timestamp jitter.
    if (limit > 0) {
      const interval = 1000 / limit;
      if (now - this.lastFrame < interval - 0.5) {
        this.scheduleFrame();
        return;
      }
      // Advance by whole intervals so 60 on a 144 Hz display averages 60, not 48; resync after stalls.
      this.lastFrame = now - this.lastFrame > 2 * interval ? now : this.lastFrame + interval;
    } else {
      this.lastFrame = now;
    }
    this.scheduleFrame();
    const frameStart = performance.now();
    const { paused, settings, inspected, followInspected } = this.state;
    if (!paused || this.stepRequested) {
      this.stepRequested = false;
      this.stepsSinceSample++;
      this.gpu.step(this.state.time);
      this.cpuStale = true;
      this.store.set({ time: this.state.time + settings.timeStep });
    }
    if (followInspected && inspected) {
      const position = this.gpu.readPosition(inspected.index);
      const shift = new Vector3(...position).sub(this.controls.target);
      this.controls.target.add(shift);
      this.camera.position.add(shift);
    }
    this.controls.update();
    this.render();
    this.frameMsSinceSample += performance.now() - frameStart;
    this.trackFps(now);
  };

  private trackFps(now: number): void {
    this.fpsFrames++;
    if (now - this.fpsSince < 1000) return;
    const seconds = (now - this.fpsSince) / 1000;
    const fps = this.fpsFrames / seconds;
    const frameMs = this.frameMsSinceSample / this.fpsFrames;
    const stepsPerSecond = this.stepsSinceSample / seconds;
    this.fpsFrames = 0;
    this.frameMsSinceSample = 0;
    this.stepsSinceSample = 0;
    this.fpsSince = now;
    const sampleStart = performance.now();
    this.sampleState();
    const sampleMs = performance.now() - sampleStart;
    this.store.set({
      fps,
      performanceHistory: appendBounded(this.state.performanceHistory, { wall: now / 1000, fps, stepsPerSecond, frameMs, sampleMs }),
    });
    this.refreshInspected();
  }

  /** Physics history (energy, temperature) is only sampled while the Statistics dialog is open. */
  setStatsActive(active: boolean): void {
    this.statsActive = active;
  }

  clearHistory(): void {
    this.store.set({ physicsHistory: [], performanceHistory: [] });
  }

  /**
   * Once-per-second velocity readback that feeds the speed palette, as v1 did. It stalls the
   * pipeline briefly; a GPU reduction is tracked in tasks/inbox/benchmark-script.md.
   */
  private sampleState(): void {
    const { time, settings, physicsHistory } = this.state;
    const advanced = physicsHistory.length === 0 || physicsHistory[physicsHistory.length - 1]!.time !== time;
    const velocity = this.set.count > 0 ? this.gpu.readVelocities() : new Float32Array();
    // The potential pass is a full O(N²) sweep plus a readback, so it only runs while someone is looking.
    const potentials = advanced && this.statsActive && this.set.count > 0 ? this.gpu.readPotentials() : new Float32Array(this.set.count);
    const energy = summarizeEnergy(this.set, velocity, potentials, this.compiled, settings.mode2D);
    this.points.setAverageSpeed(energy.meanSpeed);
    this.store.set({ averageSpeed: energy.meanSpeed, energyMissing: energy.missing });
    if (!advanced || !this.statsActive) return;
    const { kinetic, potential, meanSpeed, maxSpeed, temperature } = energy;
    this.store.set({
      physicsHistory: appendBounded(physicsHistory, { time, kinetic, potential, total: kinetic + potential, meanSpeed, maxSpeed, temperature }),
    });
  }
}

const HISTORY_LENGTH = 600;

function appendBounded<T>(history: readonly T[], sample: T): T[] {
  const next = history.length >= HISTORY_LENGTH ? history.slice(history.length - HISTORY_LENGTH + 1) : [...history];
  next.push(sample);
  return next;
}

function centroid(points: Vec3[]): Vec3 {
  const sum = points.reduce((acc, p) => acc.map((c, k) => c + p[k]!) as Vec3, [0, 0, 0] as Vec3);
  return sum.map((c) => c / Math.max(points.length, 1)) as Vec3;
}
