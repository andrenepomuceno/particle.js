import { AxesHelper, Color, PerspectiveCamera, Plane, Raycaster, Scene, Vector2, Vector3, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { compileForce, ForceValidationError, type CompiledForce } from '../engine/forces/compile';
import { summarizeEnergy, summarizeSpacetime, type SpacetimeSample } from '../engine/cpu/energy';
import {
  DEFAULT_PROBE, fieldGrid, fieldReference, fieldView, validateColumns, validateProbe, type FieldProbe,
} from '../engine/field';
import { inactiveCouplings } from '../engine/forces/couplings';
import { forceFromPreset, type ForcePresetId } from '../engine/forces/presets';
import type { ForceDefinition } from '../engine/forces/types';
import { groupParticles, type ParticleGroup } from '../engine/particleGroups';
import { GpuCompute, HistoryAllocationError, ShaderCompileError, textureWidthFor } from '../engine/gpu/GpuCompute';
import type { SpeciesId } from '../engine/species';
import { assertStorableParticle, ParticleKind, ParticleSet, TEXEL, type Particle, type Vec3 } from '../engine/particles';
import { createRng, inSphere, inDisk } from '../engine/random';
import { BoundaryLines } from '../engine/render/BoundaryLines';
import { FieldArrows } from '../engine/render/FieldArrows';
import { ParticlePoints, type ColorMode, type ParticleStyle } from '../engine/render/ParticlePoints';
import { ParticleTrail } from '../engine/render/ParticleTrail';
import { inverseLightSpeed2 } from '../engine/metric';
import { DEFAULT_SETTINGS, HISTORY_DEPTH_RANGE, validateSettings, type SimulationSettings } from '../engine/settings';
import { JsonReader } from '../engine/json';
import { createSnapshot, readSnapshot, SNAPSHOT_FORMAT, type Snapshot } from '../engine/snapshot';
import { applyEvent, formatCaption, reached, scaleTimeline, type TimelineEvent } from '../scenarios/timeline';
import { findScenario, SCENARIOS } from '../scenarios';
import { listedScenarios, SCENARIO_ORDERS, type ScenarioOrder } from '../scenarios/order';
import { parseScenario, SCENARIO_FORMAT } from '../scenarios/scenarioFile';
import { parseEdit, sourceOf, type ScenarioSource } from '../scenarios/source';
import { scaleBoundary } from '../scenarios/scaling';
import type { Scenario, ScenarioField } from '../scenarios/types';
import { limitFrame } from './frameLimiter';
import { Store } from './store';

export interface GeneratorTemplate {
  /** Species last applied to the template; any manual attribute edit makes it 'custom'. */
  species: SpeciesId | 'custom';
  count: number;
  cloudRadius: number;
  mass: number;
  charge: number;
  charge2: number;
  chargeSpread: 'fixed' | 'random sign';
  spin: Vec3;
  isospin: number;
  parity: number;
  nuclearCharge: number;
  color: Vec3;
  speed: number;
  fixed: boolean;
}

export const DEFAULT_GENERATOR: GeneratorTemplate = {
  species: 'custom',
  count: 100, cloudRadius: 50, mass: 1, charge: 1, chargeSpread: 'random sign',
  charge2: 0, spin: [0, 0, 0], isospin: 0, parity: 1, nuclearCharge: 0, color: [0, 0, 0], speed: 0, fixed: false,
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
  /** CPU time spent issuing a frame; GPU execution is asynchronous and not included. */
  frameMs: number;
  /** Time of the once-per-second readback (velocity + potential pass) itself. */
  sampleMs: number;
}

export interface FieldSettings {
  enabled: boolean;
  /** Probes across the view; rows follow from the aspect ratio (square cells). */
  columns: number;
  /** Re-fit the grid to the view whenever a camera move ends. */
  autoRefresh: boolean;
  /** Logarithmic color scale, for fields whose |F| spans many orders of magnitude (e.g. near 1/r^n cores). */
  logScale: boolean;
  /**
   * Keep the current color reference instead of re-normalizing to the field: the default scale
   * makes a scaled test particle (charge ×5, mass ×10) look identical, so comparisons need a lock.
   */
  lockScale: boolean;
  probe: FieldProbe;
}

export const DEFAULT_FIELD: FieldSettings = { enabled: false, columns: 48, autoRefresh: true, logScale: false, lockScale: false, probe: DEFAULT_PROBE };

export interface FieldInfo {
  columns: number;
  rows: number;
  /** World distance between neighboring probes. */
  spacing: number;
  /** |F| at the top of the palette (90th percentile of the probes). */
  reference: number;
}

/** What diagnostics() reports (the recorder writes it for the first and last frames). */
export interface Diagnostics {
  time: number;
  particles: number;
  kinetic: number;
  /** From potential-mode forces only; `potentialLeavesOut` names the force-mode ones it cannot include. */
  potential: number;
  total: number;
  potentialLeavesOut: string[];
  /** Set when the potential pass failed to compile (potential and total are then NaN). */
  energyError?: string;
  momentum: Vec3;
  temperature: number;
  meanSpeed: number;
  maxSpeed: number;
}

export interface Notice {
  id: number;
  level: 'info' | 'error';
  text: string;
}

export interface AppState {
  /** The bundled scenario's id; '' for imported files, applied edits and snapshots. */
  scenarioId: string;
  /** The scenario file behind the current world (Information → JSON); undefined for a snapshot. */
  scenarioSource: ScenarioSource | undefined;
  /** Seed of the current scenario's layout: fixed by its file, or drawn for this start; undefined for a snapshot. */
  seed: { value: number; fixed: boolean } | undefined;
  description: string;
  name: string;
  settings: SimulationSettings;
  forces: ForceDefinition[];
  /** The enabled forces that compiled, in order: what the GPU runs (the plots reuse them). */
  compiledForces: readonly CompiledForce[];
  forceErrors: Record<string, string[]>;
  forceWarnings: Record<string, string[]>;
  shaderError: string | undefined;
  paused: boolean;
  time: number;
  particleCount: number;
  /** Bumped on every particle upload (add, remove, edit), so views of particle properties refresh. */
  particlesVersion: number;
  capacity: number;
  particleTarget: number | undefined;
  /** How the scenario list is ordered and whether it is grouped by folder (the scenario browser). */
  scenarioOrder: ScenarioOrder;
  scenariosByFolder: boolean;
  colorMode: ColorMode;
  particleStyle: ParticleStyle;
  fpsLimit: FpsLimit;
  averageSpeed: number;
  /** Lorentz factors and clock spread from the once-per-second sample. */
  spacetime: SpacetimeSample;
  physicsHistory: PhysicsSample[];
  performanceHistory: PerformanceSample[];
  /** Enabled forces written as F(r): their energy is not in the potential total. */
  energyMissing: string[];
  energyError: string | undefined;
  particleRadius: number;
  showAxes: boolean;
  /** The user's choice to draw the boundary (E); nothing is drawn while the boundary is 'none'. */
  showBoundary: boolean;
  inspected: { index: number; particle: Particle } | undefined;
  followInspected: boolean;
  /** Draw the inspected particle's recent path (K). */
  showTrail: boolean;
  selection: number[];
  clipboard: Particle[];
  generator: GeneratorTemplate;
  field: FieldSettings;
  fieldInfo: FieldInfo | undefined;
  fieldError: string | undefined;
  fps: number;
  recording: boolean;
  notices: Notice[];
  /** Overlay text set by the scenario timeline. */
  caption: string | undefined;
  /** Events of the scenario timeline already fired, of `total`; `nextAt` is the next event's time. */
  timeline: { fired: number; total: number; nextAt: number | undefined };
}

export const FPS_LIMITS = [30, 60, 0] as const;
/** 0 means unlimited. */
export type FpsLimit = (typeof FPS_LIMITS)[number];

const DEFAULT_CAPACITY = 128 * 128;
/** 256² slots: the O(N²) step is already far from interactive there (v1 topped out at 50k in its record build). */
export const MAX_CAPACITY = 256 * 256;
const NOTICE_LIFETIME_MS = 6000;
/** Near/far planes as fractions of the orbit distance (depth range 1e6). */
const DEPTH_NEAR = 1e-3;
const DEPTH_FAR = 1e3;
/** The probe pass is O(probes × N) plus a readback, so it is not repeated every frame. */
const FIELD_INTERVAL_MS = 100;
/** The color scale needs a readback (pipeline stall), so it is refreshed far less often than the field. */
const FIELD_REFERENCE_INTERVAL_MS = 1000;
/** While following a particle the camera moves without OrbitControls events; re-fit at this pace. */
const FIELD_FOLLOW_REFIT_MS = 250;
/** The palette's speed and clock ranges (and the frame-rate readout) are sampled this often. */
const SAMPLE_INTERVAL_MS = 1000;

function structureKey(forces: readonly CompiledForce[]): string {
  return JSON.stringify(forces.map(({ definition: d }) => [d.expression, d.mode, d.range, d.retarded === true, d.params.map((p) => p.name)]));
}

export class SimulationController {
  readonly store: Store<AppState>;
  readonly renderer: WebGLRenderer;
  readonly camera = new PerspectiveCamera(60, 1, 0.1, 1e6);
  readonly controls: OrbitControls;
  private readonly scene = new Scene();
  private readonly axes = new AxesHelper(100);
  private set: ParticleSet;
  private gpu: GpuCompute;
  private points: ParticlePoints;
  private readonly arrows = new FieldArrows();
  private readonly boundaryLines = new BoundaryLines();
  private readonly trail = new ParticleTrail();
  private boundaryDrawn = false;
  private fieldDirty = false;
  private fieldTime = NaN;
  private fieldComputedAt = 0;
  private fieldReferenceAt = 0;
  private fieldFollowFitAt = 0;
  private compiled: CompiledForce[] = [];
  private compiledKey = '';
  private cpuStale = false;
  /** The user's field settings while a scenario's `view.field` holds the field (see showScenarioField). */
  private fieldBeforeScenario: FieldSettings | undefined;
  private stepRequested = false;
  private running = false;
  private frameHandle = 0;
  private lastFrame = 0;
  private fpsFrames = 0;
  private fpsSince = 0;
  private noticeId = 0;
  private recorder: MediaRecorder | undefined;
  private onRecording: ((video: Blob) => void) | undefined;
  private statsActive = false;
  private frameMsSinceSample = 0;
  /** Settings and forces the current world was loaded with, for "restore" buttons. */
  private loadedSettings: SimulationSettings = { ...DEFAULT_SETTINGS };
  private loadedForces: ForceDefinition[] = [];
  private timelineEvents: readonly TimelineEvent[] = [];
  /** Caption text with its `{path}` placeholders, re-formatted whenever forces or settings change. */
  private captionTemplate: string | undefined;
  private cameraMove: { from: [Vector3, Vector3]; to: [Vector3, Vector3]; start: number; duration: number } | undefined;
  /** Set while an offline recorder drives the frames (beginCapture): its video clock, in milliseconds. */
  private capture: { clock: number; sampledAt: number } | undefined;
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
    this.scene.add(this.points.object, this.arrows.object, this.axes, this.boundaryLines.object, this.trail.object);
    this.controls.addEventListener('start', () => this.cancelCameraMove());
    this.controls.addEventListener('end', () => this.autoFitField());
    this.store = new Store<AppState>({
      scenarioId: '', scenarioSource: undefined, seed: undefined, description: '', name: '', settings: { ...DEFAULT_SETTINGS }, forces: [], compiledForces: [], forceErrors: {}, forceWarnings: {},
      shaderError: undefined, paused: false, time: 0, particleCount: 0, particlesVersion: 0, capacity: this.set.capacity, particleTarget: undefined, scenarioOrder: 'suggested', scenariosByFolder: true,
      colorMode: 'charge', particleStyle: 'spherow', fpsLimit: 60, averageSpeed: 0, spacetime: { maxGamma: 1, clockMin: 0, clockMax: 0 }, physicsHistory: [], performanceHistory: [], energyMissing: [], energyError: undefined, particleRadius: 3, showAxes: true, showBoundary: true, inspected: undefined, followInspected: false, showTrail: false,
      selection: [], clipboard: [], generator: { ...DEFAULT_GENERATOR }, field: { ...DEFAULT_FIELD },
      fieldInfo: undefined, fieldError: undefined, fps: 0, recording: false, notices: [],
      caption: undefined, timeline: { fired: 0, total: 0, nextAt: undefined },
    });
  }

  get state(): AppState {
    return this.store.get();
  }

  /** Attaches the canvas and starts the frame loop; returns the matching detach. */
  mount(container: HTMLElement): () => void {
    container.appendChild(this.renderer.domElement);
    this.resize(container.clientWidth, container.clientHeight);
    // A recorder owns time for the rest of the page's life; a remount (e.g. hot reload) must not restart the loop.
    if (this.capture) return () => this.renderer.domElement.remove();
    this.running = true;
    this.fpsSince = performance.now();
    this.fpsFrames = 0;
    this.frameMsSinceSample = 0;
    this.scheduleFrame();
    return () => {
      this.running = false;
      cancelAnimationFrame(this.frameHandle);
      if (this.recorder?.state === 'recording') this.recorder.stop();
      this.renderer.domElement.remove();
    };
  }

  dispose(): void {
    this.running = false;
    if (this.recorder?.state === 'recording') this.recorder.stop();
    cancelAnimationFrame(this.frameHandle);
    this.controls.dispose();
    this.gpu.dispose();
    this.points.dispose();
    this.arrows.dispose();
    this.boundaryLines.dispose();
    this.trail.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.applyRadius();
    this.autoFitField();
  }

  notify(text: string, level: Notice['level'] = 'info'): void {
    if (level === 'error') console.error(text);
    const notice = { id: ++this.noticeId, level, text };
    this.store.set({ notices: [...this.state.notices, notice] });
    setTimeout(() => this.store.set({ notices: this.state.notices.filter((n) => n.id !== notice.id) }), NOTICE_LIFETIME_MS);
  }

  /* Scenarios and snapshots */

  /** Loads a bundled scenario; `seed` (an integer ≥ 0) fixes its layout for reproducible runs, R included. */
  loadScenario(id: string, seed?: number): void {
    if (seed !== undefined && !(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff)) throw new Error(`seed must be an integer within [0, 4294967295], got ${seed}`);
    const scenario = findScenario(id);
    this.startScenario(scenario, id, sourceOf(scenario), seed);
  }

  /**
   * Starts an edit of the current scenario file (Information → JSON) the way an import does, so R
   * restarts the edit. Text that fails to parse or validate throws, and the current world keeps running.
   */
  applyScenarioEdit(text: string): void {
    const current = this.state.scenarioSource;
    if (!current) throw new Error('the current world came from a snapshot, which has no scenario file to edit');
    const { scenario, source } = parseEdit(current, text);
    this.startScenario(scenario, '', source);
  }

  private startScenario(scenario: Scenario, scenarioId: string, source: ScenarioSource, forcedSeed?: number): void {
    // An empty scenario (sandbox) has nothing to scale; the target only resizes populated ones.
    const target = scenario.defaultCount > 0 ? this.state.particleTarget : undefined;
    // A scenario without a seed (and no seed asked for) is laid out anew on every start, so each run is unique.
    const seed = forcedSeed ?? scenario.seed ?? crypto.getRandomValues(new Uint32Array(1))[0]!;
    const { particles, linearScale } = scenario.build(createRng(seed), target);
    const settings = scaleBoundary({ ...DEFAULT_SETTINGS, ...scenario.settings }, linearScale);
    this.replaceWorld(scenario.name, settings, scenario.forces(), particles, 0);
    this.store.set({ scenarioId, scenarioSource: source, seed: { value: seed, fixed: forcedSeed !== undefined || scenario.seed !== undefined }, description: scenario.description, particleRadius: scenario.particleRadius });
    this.setColorMode(scenario.colorMode);
    this.resetCamera(scenario.cameraDistance * linearScale);
    this.applyRadius();
    this.timelineEvents = scaleTimeline(scenario.timeline, linearScale);
    this.runTimeline();
    this.showScenarioField(scenario.field);
    this.restart = () => this.startScenario(scenario, scenarioId, source, forcedSeed);
  }

  /**
   * A scenario with `view.field` shows the field with its options; the next scenario without one gives
   * the user's own field settings back. Any field edit by the user ends the scenario's hold.
   */
  private showScenarioField(field: ScenarioField | undefined): void {
    try {
      if (field) {
        const before = this.fieldBeforeScenario ?? this.state.field;
        this.applyField({
          ...before, enabled: true, lockScale: false,
          columns: field.columns ?? DEFAULT_FIELD.columns, logScale: field.logScale ?? DEFAULT_FIELD.logScale, probe: field.probe ?? DEFAULT_PROBE,
        });
        this.fieldBeforeScenario = before;
      } else if (this.fieldBeforeScenario) {
        const before = this.fieldBeforeScenario;
        this.fieldBeforeScenario = undefined;
        this.applyField(before);
      }
    } catch (error) {
      this.notify(`The scenario's field view could not be shown: ${(error as Error).message}`, 'error');
    }
  }

  /** Recreates the current world from its source: bundled scenario, imported scenario or snapshot. */
  reset(): void {
    this.restart();
  }

  /** The bundled scenarios as the list shows them (order and folder grouping). */
  listedScenarios(): Scenario[] {
    return listedScenarios(SCENARIOS, this.state.scenarioOrder, this.state.scenariosByFolder);
  }

  setScenarioOrder(scenarioOrder: ScenarioOrder, scenariosByFolder: boolean): void {
    if (!SCENARIO_ORDERS.includes(scenarioOrder)) throw new Error(`scenario order must be one of ${SCENARIO_ORDERS.join(', ')}, got '${scenarioOrder}'`);
    this.store.set({ scenarioOrder, scenariosByFolder });
  }

  /** Previous/next scenario in the listed order (PageUp/PageDown). */
  cycleScenario(offset: number): void {
    const listed = this.listedScenarios();
    const index = listed.findIndex((s) => s.id === this.state.scenarioId);
    if (index === -1) {
      this.notify('The current world was imported and is not in the scenario list; press Home for the first scenario', 'error');
      return;
    }
    const next = Math.min(Math.max(index + offset, 0), listed.length - 1);
    if (next !== index) this.loadScenario(listed[next]!.id);
  }

  /** The first scenario of the listed order (Home). */
  loadFirstScenario(): void {
    this.loadScenario(this.listedScenarios()[0]!.id);
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
      const scenario = parseScenario(text, fileName);
      this.startScenario(scenario, '', sourceOf(scenario));
      return;
    }
    if (format !== SNAPSHOT_FORMAT) {
      json.fail('format', `unknown format ${JSON.stringify(format)}; expected '${SNAPSHOT_FORMAT}' or '${SCENARIO_FORMAT}'`);
    }
    const snapshot = readSnapshot(value);
    const load = () => {
      this.replaceWorld(snapshot.name, snapshot.settings, snapshot.forces, snapshot.particles, snapshot.time);
      this.store.set({ scenarioId: '', scenarioSource: undefined, seed: undefined, description: `Snapshot imported from ${fileName}` });
      // A snapshot has no view.field: like a scenario without one, it ends a scenario's hold on the field.
      this.showScenarioField(undefined);
    };
    load();
    this.restart = load;
  }

  /**
   * Particle total for the next generated scenario (v1's adjustable max particles); undefined
   * keeps each scenario's own count. Applied on the next reset or scenario load.
   */
  setParticleTarget(particleTarget: number | undefined): void {
    if (particleTarget !== undefined && !(Number.isInteger(particleTarget) && particleTarget >= 1 && particleTarget <= MAX_CAPACITY)) {
      throw new Error(`particle count must be an integer within [1, ${MAX_CAPACITY}], got ${particleTarget}`);
    }
    this.store.set({ particleTarget });
  }

  /** Rebuilds the GPU buffers when a world needs more slots than the current capacity. */
  private ensureCapacity(count: number): void {
    if (count <= this.set.capacity) return;
    if (count > MAX_CAPACITY) throw new Error(`${count} particles exceed the maximum capacity ${MAX_CAPACITY}`);
    const width = textureWidthFor(count);
    // Build first: if the GPU refuses the new buffers, the old ones must still be intact.
    const set = new ParticleSet(width * width);
    const gpu = new GpuCompute(this.renderer, set);
    const points = new ParticlePoints(width);
    this.scene.remove(this.points.object);
    this.gpu.dispose();
    this.points.dispose();
    this.set = set;
    this.gpu = gpu;
    this.points = points;
    this.points.setStyle(this.state.particleStyle);
    this.points.setColorMode(this.state.colorMode);
    this.scene.add(this.points.object);
    this.compiledKey = '';
    this.cpuStale = false;
    this.applyRadius();
    this.store.set({ capacity: this.set.capacity });
  }

  private replaceWorld(name: string, requested: SimulationSettings, forces: ForceDefinition[], particles: Particle[], time: number): void {
    // A scenario or snapshot made on a GPU with more texture array layers loads here with the history this
    // one holds, and says so (a shorter reach for its retarded forces), rather than not loading at all.
    const settings = { ...requested, historyDepth: Math.min(requested.historyDepth, this.maxHistoryDepth) };
    // Whatever can refuse the new world is checked before the old one is touched (an edit applied from
    // Information → JSON must leave the running world intact when it fails).
    const problems = validateSettings(settings);
    if (problems.length > 0) throw new Error(problems.join('; '));
    if (settings.historyDepth < requested.historyDepth) {
      this.notify(`${name} asks for a history of ${requested.historyDepth} steps; this GPU holds ${settings.historyDepth}, so its retarded forces reach less far`, 'error');
    }
    const inverseC2 = inverseLightSpeed2(settings);
    particles.forEach((particle, index) => assertStorableParticle(particle, index, inverseC2));
    this.loadedSettings = { ...settings };
    this.loadedForces = forces.map((f) => ({ ...f, params: f.params.map((p) => ({ ...p })) }));
    this.ensureCapacity(particles.length);
    // The old world goes first, unread: a new metric then has no velocities to convert, and the new
    // particles are stored for it.
    this.cpuStale = false;
    this.set.clear();
    this.setSettings(settings);
    this.setForces(forces);
    this.points.setHighlight(undefined);
    this.set.addAll(particles);
    this.cpuStale = false;
    this.timelineEvents = [];
    this.cameraMove = undefined;
    this.captionTemplate = undefined;
    this.store.set({
      name, time, inspected: undefined, selection: [], followInspected: false, physicsHistory: [],
      caption: undefined, timeline: { fired: 0, total: 0, nextAt: undefined },
    });
    this.uploadParticles();
    // Probes may belong to a replaced GpuCompute and the plane depends on mode2D: re-fit now
    // that settings, forces and particles are in place.
    this.refitFieldIfEnabled();
  }

  /* Physics configuration */

  setSettings(patch: Partial<SimulationSettings>): void {
    const settings = { ...this.state.settings, ...patch };
    const problems = validateSettings(settings);
    // The static range covers the common limit; a GPU with fewer texture array layers refuses beyond its own.
    if (problems.length === 0 && settings.historyDepth > this.gpu.maxHistoryDepth) {
      problems.push(`historyDepth ${settings.historyDepth} exceeds this GPU's limit of ${this.gpu.maxHistoryDepth} history steps (texture array layers)`);
    }
    if (problems.length > 0) throw new Error(problems.join('; '));
    const planeChanged = settings.mode2D !== this.state.settings.mode2D;
    // A new metric or c rewrites the stored velocities (u = γv under Minkowski), keeping each v; it
    // throws, leaving everything as it was, when a particle would reach the new c.
    const inverseC2 = inverseLightSpeed2(settings);
    const metricChanged = inverseC2 !== this.set.inverseLightSpeed2;
    if (metricChanged) {
      this.syncFromGpu();
      this.set.setMetric(settings);
    }
    this.gpu.setSettings(settings);
    this.points.setInverseLightSpeed2(inverseC2);
    if (metricChanged) this.uploadParticles();
    const previous = this.state.settings;
    this.store.set({ settings });
    this.syncHistory();
    if (['boundary', 'boundarySize', 'boundaryDepth', 'mode2D'].some((key) => settings[key as keyof SimulationSettings] !== previous[key as keyof SimulationSettings]) || !this.boundaryDrawn) {
      this.boundaryLines.update(settings);
      this.boundaryDrawn = true;
    }
    this.refreshCaption();
    this.refreshForceWarnings();
    this.fieldDirty = true;
    if (planeChanged) this.refitFieldIfEnabled();
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
      this.syncHistory();
      this.fieldDirty = true;
    } catch (error) {
      if (!(error instanceof ShaderCompileError)) throw error;
      shaderError = error.log;
      this.notify(`Shader compile failed; previous forces stay active.\n${error.log}`, 'error');
    }
    this.store.set({ forces, compiledForces: this.compiled, forceErrors, shaderError });
    this.refreshForceWarnings();
    this.refreshCaption();
  }

  /**
   * The loaded settings and forces with the timeline events fired so far re-applied: what the
   * world would have now without the user's edits (a script's later multiply events stay consistent).
   */
  private scriptedState(): { settings: SimulationSettings; forces: ForceDefinition[] } {
    let forces = this.loadedForces.map((f) => ({ ...f, params: f.params.map((p) => ({ ...p })) }));
    let settings = { ...this.loadedSettings };
    for (const event of this.timelineEvents.slice(0, this.state.timeline.fired)) ({ forces, settings } = applyEvent(event, forces, settings));
    return { settings, forces };
  }

  /** Back to the scenario's settings, as its script has them now (particles untouched). */
  restoreSettings(): void {
    const { settings } = this.scriptedState();
    const planeChanged = settings.mode2D !== this.state.settings.mode2D;
    this.setSettings(settings);
    if (planeChanged) this.resetCamera();
  }

  /** Back to the scenario's forces, as its script has them now, undoing the user's edits. */
  restoreForces(): void {
    this.setForces(this.scriptedState().forces);
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

  /** Runs `steps` simulation steps immediately (benchmarks and parity checks). */
  advance(steps: number): void {
    if (!Number.isInteger(steps) || steps < 0) throw new Error(`steps must be an integer >= 0, got ${steps}`);
    let time = this.state.time;
    for (let k = 0; k < steps; k++) {
      this.gpu.step(time);
      time += this.state.settings.timeStep;
      const { nextAt } = this.state.timeline;
      if (nextAt !== undefined && reached(time, nextAt, this.state.settings.timeStep)) {
        this.store.set({ time });
        this.runTimeline();
      }
    }
    this.cpuStale = true;
    this.store.set({ time });
  }

  requestStep(): void {
    this.stepRequested = true;
  }

  /* Offline capture (scripts/record.mjs) */

  /**
   * Hands time to an offline recorder for the rest of the page's life: the frame loop stops, and
   * captureFrame advances the simulation, scripted camera moves and the field explicitly.
   */
  beginCapture(): void {
    this.running = false;
    cancelAnimationFrame(this.frameHandle);
    this.capture = { clock: 0, sampledAt: -Infinity };
    // Throttles timed on the wall clock restart on the video clock.
    this.fieldReferenceAt = -Infinity;
    this.fieldFollowFitAt = -Infinity;
  }

  /**
   * One video frame: `steps` simulation steps (timeline events fire on simulation time, as in advance;
   * the trail gets a point per step, as in the app), then what the app's frame does after its step
   * (present), on the video clock: camera moves eased by `seconds` of video time, the palette sampled
   * every video second (and on the first frame), the field recomputed on every frame. The canvas
   * (preserveDrawingBuffer) then holds the frame, with no UI on it.
   */
  captureFrame(steps: number, seconds: number): void {
    const capture = this.capture;
    if (!capture) throw new Error('captureFrame needs beginCapture first');
    if (!(Number.isInteger(steps) && steps >= 0)) throw new Error(`steps must be an integer >= 0, got ${steps}`);
    if (!(Number.isFinite(seconds) && seconds >= 0)) throw new Error(`frame seconds must be a finite number >= 0, got ${seconds}`);
    const { inspected, showTrail } = this.state;
    for (let k = 0; k < steps; k++) {
      this.advance(1);
      // present() adds the last step's point.
      if (inspected && showTrail && k < steps - 1) this.trail.push(this.gpu.readPosition(inspected.index));
    }
    capture.clock += seconds * 1000;
    const now = capture.clock;
    if (now - capture.sampledAt >= SAMPLE_INTERVAL_MS) {
      capture.sampledAt = now;
      this.sampleState();
    }
    // Smooth video: every frame gets its field (the app recomputes it at most every FIELD_INTERVAL_MS).
    this.fieldComputedAt = -Infinity;
    this.present(now, steps > 0);
  }

  /** The background behind the particles, as a CSS colour (e.g. '#000000'). */
  setBackground(color: string): void {
    this.renderer.setClearColor(new Color(color));
  }

  /**
   * Energy, momentum and temperature now: a readback and, for potential-mode forces, the potential
   * pass (for scripts such as the recorder, not per frame). Momentum is Σ m·u (relativistic under Minkowski).
   */
  diagnostics(): Diagnostics {
    this.syncFromGpu();
    const { time, settings } = this.state;
    let potentials: Float32Array = new Float32Array(this.set.count);
    let energyError: string | undefined;
    try {
      if (this.set.count > 0) potentials = this.gpu.readPotentials(time);
    } catch (error) {
      if (!(error instanceof ShaderCompileError)) throw error;
      energyError = `Potential-energy pass failed to compile; forces are unaffected.\n${error.log}`;
      potentials.fill(NaN);
    }
    const energy = summarizeEnergy(this.set, this.set.velocity, potentials, this.compiled, settings.mode2D);
    const momentum: Vec3 = [0, 0, 0];
    for (let k = 0; k < this.set.count; k++) {
      const o = k * TEXEL;
      if (this.set.position[o + 3] === ParticleKind.fixed) continue;
      for (let c = 0; c < 3; c++) momentum[c] = momentum[c]! + this.set.attributes[o]! * this.set.velocity[o + c]!;
    }
    return {
      time, particles: this.set.count, kinetic: energy.kinetic, potential: energy.potential, total: energy.kinetic + energy.potential,
      potentialLeavesOut: energy.missing, momentum, temperature: energy.temperature, meanSpeed: energy.meanSpeed, maxSpeed: energy.maxSpeed,
      ...(energyError ? { energyError } : {}),
    };
  }

  /* Scenario timeline (v1's scripted actions) */

  /** Fires every pending event whose time has come, in order; a reset rewinds by reloading the scenario. */
  private runTimeline(): void {
    const events = this.timelineEvents;
    const before = this.state.timeline;
    let { fired } = before;
    while (fired < events.length && reached(this.state.time, events[fired]!.at, this.state.settings.timeStep)) this.fireEvent(events[fired++]!);
    if (fired === before.fired && before.total === events.length) return;
    this.store.set({ timeline: { fired, total: events.length, nextAt: events[fired]?.at } });
  }

  private fireEvent(event: TimelineEvent): void {
    if (event.changes.length > 0) {
      const { forces, settings, missing } = applyEvent(event, this.state.forces, this.state.settings);
      if (missing.length > 0) this.notify(`Timeline at t = ${event.at}: ${missing.join(', ')} no longer exist (renamed or removed); skipped`, 'error');
      // Separately, so an invalid setting (e.g. a multiply past a limit) does not drop the force changes.
      try {
        this.setSettings(settings);
      } catch (error) {
        this.notify(`Timeline at t = ${event.at}: settings not applied: ${(error as Error).message}`, 'error');
      }
      this.setForces(forces);
    }
    if (event.caption !== undefined) {
      this.captionTemplate = event.caption === '' ? undefined : event.caption;
      this.refreshCaption();
    }
    if (event.camera) {
      const { position, target, duration } = event.camera;
      this.store.set({ followInspected: false });
      this.cameraMove = {
        from: [this.camera.position.clone(), this.controls.target.clone()],
        to: [new Vector3(...position), new Vector3(...target)],
        start: this.now(),
        duration: duration * 1000,
      };
      this.updateCameraMove(this.now());
    }
  }

  private refreshCaption(): void {
    const template = this.captionTemplate;
    const caption = template === undefined ? undefined : formatCaption(template, this.state.forces, this.state.settings);
    if (caption !== this.state.caption) this.store.set({ caption });
  }

  /** The user takes the camera (orbit, reset, front view, follow): a scripted move stops where it is. */
  private cancelCameraMove(): void {
    this.cameraMove = undefined;
  }

  /** Wall-clock milliseconds, or the video clock while an offline recorder drives the frames. */
  private now(): number {
    return this.capture ? this.capture.clock : performance.now();
  }

  /** v1's cameraTransition: eases the camera and orbit target over wall-clock (or video) time. */
  private updateCameraMove(now: number): void {
    const move = this.cameraMove;
    if (!move) return;
    // rAF timestamps can precede the performance.now() that started the move.
    const t = move.duration > 0 ? Math.min(1, Math.max(0, (now - move.start) / move.duration)) : 1;
    const s = t * t * (3 - 2 * t);
    this.camera.position.lerpVectors(move.from[0], move.to[0], s);
    this.controls.target.lerpVectors(move.from[1], move.to[1], s);
    this.controls.update();
    if (t === 1) {
      this.cameraMove = undefined;
      this.autoFitField();
    }
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

  toggleBoundary(): void {
    this.boundaryLines.setVisible(!this.state.showBoundary);
    this.store.set({ showBoundary: !this.state.showBoundary });
  }

  toggleAxes(): void {
    this.axes.visible = !this.axes.visible;
    this.store.set({ showAxes: this.axes.visible });
  }

  resetCamera(distance = this.camera.position.length() || 1000): void {
    this.cancelCameraMove();
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(0, 0, distance);
    this.camera.up.set(0, 1, 0);
    this.controls.enableRotate = !this.state.settings.mode2D;
    this.controls.update();
    this.store.set({ followInspected: false });
    this.autoFitField();
  }

  /** Looks straight down the z axis at the current target, as v1's [V] key. */
  frontCamera(): void {
    this.cancelCameraMove();
    const target = this.controls.target;
    this.camera.position.set(target.x, target.y, target.z + this.controls.getDistance());
    this.camera.up.set(0, 1, 0);
    this.controls.update();
    this.autoFitField();
  }

  /* Field */

  setField(patch: Partial<FieldSettings>): void {
    this.fieldBeforeScenario = undefined;
    this.applyField(patch);
  }

  private applyField(patch: Partial<FieldSettings>): void {
    const field = { ...this.state.field, ...patch };
    const problems = [validateColumns(field.columns), ...validateProbe(field.probe)].filter((p) => p !== undefined);
    if (problems.length > 0) throw new Error(problems.join('; '));
    const previous = this.state.field;
    this.store.set({ field, fieldError: undefined });
    this.arrows.setVisible(field.enabled);
    this.arrows.setLogScale(field.logScale);
    // The color scale is a draw-time uniform: no need to recompute the O(probes·N) field.
    const onlyColors = JSON.stringify({ ...field, logScale: previous.logScale, lockScale: previous.lockScale }) === JSON.stringify(previous);
    if (onlyColors) return;
    if (!field.enabled) {
      this.store.set({ fieldInfo: undefined });
      return;
    }
    if (!previous.enabled || field.columns !== previous.columns || (field.autoRefresh && !previous.autoRefresh)) {
      try {
        this.fitField();
      } catch (error) {
        this.store.set({ field: previous });
        this.arrows.setVisible(previous.enabled);
        this.arrows.setLogScale(previous.logScale);
        throw error;
      }
    }
    this.fieldDirty = true;
  }

  toggleField(): void {
    this.setField({ enabled: !this.state.field.enabled });
  }

  /** Lays the probe grid over the current view (v1's [F]). */
  fitField(): void {
    const { field, settings } = this.state;
    if (!field.enabled) {
      this.notify('The field is off: press J to show it', 'error');
      return;
    }
    this.camera.updateMatrixWorld();
    const direction = this.camera.getWorldDirection(new Vector3());
    const right = new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0).normalize();
    const view = fieldView({
      position: this.camera.position.toArray(), target: this.controls.target.toArray(), direction: direction.toArray(),
      right: right.toArray(), fovDegrees: this.camera.fov, aspect: this.camera.aspect,
    }, settings.mode2D);
    const grid = fieldGrid(view, field.columns);
    this.gpu.setProbes(grid.positions);
    this.arrows.setGrid({ probes: this.gpu.probeTexture, field: this.gpu.fieldTexture }, this.gpu.probeWidth, grid.count, grid.spacing);
    this.store.set({ fieldInfo: { columns: grid.columns, rows: grid.rows, spacing: grid.spacing, reference: this.state.fieldInfo?.reference ?? 0 } });
    this.fieldDirty = true;
  }

  private refitFieldIfEnabled(): void {
    if (!this.state.field.enabled) return;
    try {
      this.fitField();
    } catch (error) {
      this.setField({ enabled: false });
      this.notify(`The field was turned off: its grid could not be fitted (${(error as Error).message})`, 'error');
    }
  }

  private autoFitField(): void {
    const { enabled, autoRefresh } = this.state.field;
    if (!enabled || !autoRefresh) return;
    // Runs from camera and resize events, where a throw would escape as an uncaught error.
    try {
      this.fitField();
    } catch (error) {
      this.notify(`Field re-fit failed: ${(error as Error).message}`, 'error');
    }
  }

  /** Recomputes the field when something changed, and at most every FIELD_INTERVAL_MS while time runs. */
  private updateField(now: number): void {
    const { field, fieldInfo, time } = this.state;
    if (!field.enabled || !fieldInfo) return;
    const due = time !== this.fieldTime && now - this.fieldComputedAt >= FIELD_INTERVAL_MS;
    if (!this.fieldDirty && !due) return;
    try {
      this.gpu.computeField(time, field.probe);
      const refresh = this.fieldDirty || now - this.fieldReferenceAt >= FIELD_REFERENCE_INTERVAL_MS;
      if (refresh && !(field.lockScale && fieldInfo.reference > 0)) {
        const reference = fieldReference(this.gpu.readFieldMagnitudes());
        this.arrows.setReference(reference);
        this.fieldReferenceAt = now;
        if (reference !== fieldInfo.reference) this.store.set({ fieldInfo: { ...fieldInfo, reference } });
      }
    } catch (error) {
      if (!(error instanceof ShaderCompileError)) throw error;
      this.setField({ enabled: false });
      const fieldError = `Field pass failed to compile; the simulation is unaffected.\n${error.log}`;
      this.store.set({ fieldError });
      this.notify(fieldError, 'error');
    }
    this.fieldDirty = false;
    this.fieldTime = time;
    this.fieldComputedAt = now;
  }

  /* Particles */

  private syncFromGpu(): void {
    if (!this.cpuStale) return;
    this.gpu.readback();
    this.cpuStale = false;
  }

  private uploadParticles(): void {
    // Edits can move or renumber particles: a trail would jump.
    this.trail.clear();
    try {
      this.gpu.upload(this.state.time);
    } catch (error) {
      // More particles can need a larger history than the GPU holds; the particles are uploaded regardless.
      this.historyFailed(error);
    }
    this.points.setCount(this.set.count);
    this.store.set({ particleCount: this.set.count, particlesVersion: this.state.particlesVersion + 1 });
    this.fieldDirty = true;
    this.refreshForceWarnings();
    this.refreshInspected();
  }

  /** Attribute columns never change on the GPU, so the CPU copy is current even when positions are stale. */
  private refreshForceWarnings(): void {
    const forceWarnings: Record<string, string[]> = {};
    const { settings } = this.state;
    let span: number | undefined;
    for (const force of this.compiled) {
      const warnings = inactiveCouplings(force, this.set);
      if (force.velocity && settings.integrator === 'verlet') {
        warnings.push('depends on velocity: the step uses the Euler update (implicit for v_i) instead of Verlet, which assumes position-only forces');
      }
      if (force.retarded && settings.metric !== 'minkowski') {
        warnings.push('retarded: acts instantaneously under the Galilean metric (c → ∞); the light cone needs Minkowski (Spacetime dialog)');
      } else if (force.retarded) {
        const reach = settings.lightSpeed * (settings.historyDepth - 1) * settings.timeStep;
        span ??= this.particleSpan();
        if (span > reach) {
          warnings.push(`retarded: pairs farther apart than c·(K − 1)·dt = ${reach.toPrecision(3)} see their sources' oldest stored step moved back in uniform motion (exact only if they moved uniformly), and the particles span about ${span.toPrecision(3)}; raise the history depth K or the time step (Spacetime, Parameters)`);
        }
      }
      if (warnings.length > 0) forceWarnings[force.definition.id] = warnings;
    }
    // Refreshed every second while retarded forces run: unchanged warnings must not re-render the dialog.
    if (JSON.stringify(forceWarnings) !== JSON.stringify(this.state.forceWarnings)) this.store.set({ forceWarnings });
  }

  /** Retarded forces read the GPU history only under Minkowski; under Galilean they act instantaneously. */
  private syncHistory(): void {
    const { settings } = this.state;
    const needed = settings.metric === 'minkowski' && this.compiled.some((f) => f.retarded);
    try {
      this.gpu.setHistoryDepth(needed ? settings.historyDepth : 0, this.state.time);
    } catch (error) {
      this.historyFailed(error);
    }
  }

  /** Without a history (freed by GpuCompute) retarded forces act instantaneously: say so, do not fail the edit. */
  private historyFailed(error: unknown): void {
    if (!(error instanceof HistoryAllocationError)) throw error;
    this.notify(`Retarded forces act instantaneously: ${error.message}. Lower the history depth K (Spacetime).`, 'error');
  }

  /** Most history steps this GPU can hold (Spacetime dialog). */
  get maxHistoryDepth(): number {
    return Math.min(HISTORY_DEPTH_RANGE[1], this.gpu.maxHistoryDepth);
  }

  /** Bytes a history of `depth` steps takes on the GPU at the current capacity (Spacetime dialog). */
  historyBytes(depth: number): number {
    return this.gpu.historyBytes(depth);
  }

  /** Diagonal of the particles' bounding box, from the CPU copy (current after the last sync). */
  private particleSpan(): number {
    const low = [Infinity, Infinity, Infinity];
    const high = [-Infinity, -Infinity, -Infinity];
    for (let k = 0; k < this.set.count; k++) {
      for (let c = 0; c < 3; c++) {
        const x = this.set.position[k * TEXEL + c]!;
        low[c] = Math.min(low[c]!, x);
        high[c] = Math.max(high[c]!, x);
      }
    }
    return this.set.count > 0 ? Math.hypot(high[0]! - low[0]!, high[1]! - low[1]!, high[2]! - low[2]!) : 0;
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
    if (index !== this.state.inspected?.index) this.trail.clear();
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

  /** Shows or hides the inspected particle's recent path; it starts empty and grows as time runs. */
  toggleTrail(): void {
    const showTrail = !this.state.showTrail;
    this.trail.clear();
    this.trail.setVisible(showTrail);
    this.store.set({ showTrail });
  }

  toggleFollow(): void {
    this.cancelCameraMove();
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

  /** Centers the orbit target on the selection's centroid, keeping the camera's offset (v1's Look At). */
  lookAtSelection(): void {
    const { selection } = this.state;
    if (selection.length === 0) {
      this.notify('Nothing selected: shift+drag to select particles first', 'error');
      return;
    }
    this.syncFromGpu();
    this.cancelCameraMove();
    this.centerOn(centroid(selection.map((k) => this.set.get(k).position)));
    this.controls.update();
    this.autoFitField();
    this.store.set({ followInspected: false });
  }

  /** Moves the orbit target to `point`, translating the camera with it (keeps the view direction). */
  /**
   * Puts the camera at `position` looking at `target`; the field re-fits. A scripted move under way
   * (e.g. a timeline event at t = 0) carries on from here, as from an initial camera.
   */
  setCamera(position: Vec3, target: Vec3): void {
    if (![...position, ...target].every(Number.isFinite)) throw new Error(`camera position and target must be finite, got ${JSON.stringify({ position, target })}`);
    this.camera.position.set(...position);
    this.controls.target.set(...target);
    if (this.cameraMove) this.cameraMove.from = [this.camera.position.clone(), this.controls.target.clone()];
    this.controls.update();
    this.autoFitField();
  }

  private centerOn(point: Vec3): void {
    const shift = new Vector3(...point).sub(this.controls.target);
    this.controls.target.add(shift);
    this.camera.position.add(shift);
  }

  /** The UI decides how a finished recording is saved; undefined detaches it. */
  setRecordingSink(sink: ((video: Blob) => void) | undefined): void {
    this.onRecording = sink;
  }

  /** Records the canvas to a WebM file (v1's [*]); calling it again stops and downloads. */
  toggleRecording(): void {
    if (this.recorder) {
      // A second press while the recorder is still finishing is ignored rather than re-stopping it.
      if (this.recorder.state === 'recording') this.recorder.stop();
      return;
    }
    if (typeof MediaRecorder === 'undefined') throw new Error('this browser has no MediaRecorder; recording is unavailable');
    const mimeType = ['video/webm;codecs=vp9', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType) throw new Error('this browser cannot record WebM video');
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(this.renderer.domElement.captureStream(60), { mimeType });
    recorder.ondataavailable = (event) => event.data.size > 0 && chunks.push(event.data);
    recorder.onstop = () => {
      this.recorder = undefined;
      this.store.set({ recording: false });
      this.onRecording?.(new Blob(chunks, { type: 'video/webm' }));
    };
    recorder.start(1000);
    this.recorder = recorder;
    this.store.set({ recording: true });
    this.notify('Recording… press * again to stop and save the video');
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
        ...signedCharges(g, rng),
        spin: [...g.spin],
        isospin: g.isospin,
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

  /**
   * Applies v -> v * factor + random kick to every dynamic particle (v1's B/T/Y keys). Under
   * Minkowski it acts on the momentum per mass u = γv, so speeds stay below c.
   */
  scaleVelocities(factor: number, kick = 0): void {
    const rng = createRng(Date.now());
    this.editParticles((set) => {
      for (let k = 0; k < set.count; k++) {
        if (set.position[k * TEXEL + 3] === ParticleKind.fixed) continue;
        set.scaleVelocity(k, factor, this.state.settings.mode2D ? inDisk(rng, kick) : inSphere(rng, kick));
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
    this.arrows.setViewport(this.renderer.domElement.width, height, this.camera.fov);
  }

/**
   * Near and far planes follow the orbit distance (scenes span 10 to 1e6 units): a fixed far plane
   * clipped zoomed-out worlds, and a fixed huge range would waste depth precision.
   */
  private fitDepthRange(): void {
    const distance = Math.max(this.camera.position.distanceTo(this.controls.target), 1e-6);
    const near = distance * DEPTH_NEAR;
    const far = distance * DEPTH_FAR;
    if (near === this.camera.near && far === this.camera.far) return;
    this.camera.near = near;
    this.camera.far = far;
    this.camera.updateProjectionMatrix();
  }

    private render(): void {
    this.fitDepthRange();
    this.points.setTime(this.state.time);
    this.points.bind({
      position: this.gpu.positionTexture,
      velocity: this.gpu.velocityTexture,
      attributes: this.gpu.attributesTexture,
      color: this.gpu.colorTexture,
      spin: this.gpu.spinTexture,
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
    const tick = limitFrame(now, this.lastFrame, limit);
    this.lastFrame = tick.last;
    if (!tick.render) {
      this.scheduleFrame();
      return;
    }
    this.scheduleFrame();
    const frameStart = performance.now();
    const { paused, settings } = this.state;
    let stepped = false;
    if (!paused || this.stepRequested) {
      this.stepRequested = false;
      this.gpu.step(this.state.time);
      this.cpuStale = true;
      this.store.set({ time: this.state.time + settings.timeStep });
      this.runTimeline();
      stepped = true;
    }
    this.present(now, stepped);
    this.frameMsSinceSample += performance.now() - frameStart;
    this.trackFps(now);
  };

  /**
   * What a frame does after its steps, at `now` (wall clock in the app, video clock in captureFrame):
   * camera move, trail (the last step's point) and follow, field, render.
   */
  private present(now: number, stepped: boolean): void {
    const { inspected, followInspected, showTrail } = this.state;
    this.updateCameraMove(now);
    // One texel read back per frame, shared by following and the trail.
    const position = inspected && (followInspected || (showTrail && stepped)) ? this.gpu.readPosition(inspected.index) : undefined;
    if (position && showTrail && stepped) this.trail.push(position);
    if (followInspected && position) {
      this.centerOn(position);
      if (now - this.fieldFollowFitAt >= FIELD_FOLLOW_REFIT_MS) {
        this.fieldFollowFitAt = now;
        this.autoFitField();
      }
    }
    this.controls.update();
    this.updateField(now);
    this.render();
  }

  private trackFps(now: number): void {
    this.fpsFrames++;
    if (now - this.fpsSince < SAMPLE_INTERVAL_MS) return;
    const seconds = (now - this.fpsSince) / 1000;
    const fps = this.fpsFrames / seconds;
    const frameMs = this.frameMsSinceSample / this.fpsFrames;
    this.fpsFrames = 0;
    this.frameMsSinceSample = 0;
    this.fpsSince = now;
    const sampleStart = performance.now();
    this.sampleState();
    const sampleMs = performance.now() - sampleStart;
    this.store.set({
      fps,
      performanceHistory: appendBounded(this.state.performanceHistory, { wall: now / 1000, fps, frameMs, sampleMs }),
    });
    this.refreshInspected();
  }

  /** Physics history (energy, temperature) is only sampled while the Statistics dialog is open. */
  setStatsActive(active: boolean): void {
    this.statsActive = active;
  }

  /** The particles grouped by their properties, largest group first; these live CPU-side, so no readback. */
  particleGroups(): ParticleGroup[] {
    return groupParticles(this.set);
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
    // Retarded forces under Minkowski need the positions too (their reach warning follows the particles):
    // then one full readback serves both.
    const retarded = settings.metric === 'minkowski' && this.compiled.some((f) => f.retarded);
    if (retarded) this.syncFromGpu();
    const velocity = retarded ? this.set.velocity : this.set.count > 0 ? this.gpu.readVelocities() : new Float32Array();
    // The potential pass is a full O(N²) sweep plus a readback, so it only runs while someone is looking.
    let potentials: Float32Array = new Float32Array(this.set.count);
    let energyError: string | undefined;
    if (advanced && this.statsActive && this.set.count > 0) {
      try {
        potentials = this.gpu.readPotentials(time);
      } catch (error) {
        if (!(error instanceof ShaderCompileError)) throw error;
        energyError = `Potential-energy pass failed to compile; forces are unaffected.\n${error.log}`;
        potentials.fill(NaN);
      }
    }
    const energy = summarizeEnergy(this.set, velocity, potentials, this.compiled, settings.mode2D);
    if (energyError !== this.state.energyError) this.store.set({ energyError });
    const spacetime = summarizeSpacetime(this.set, velocity);
    this.points.setAverageSpeed(energy.meanSpeed);
    this.points.setClockRange(spacetime.clockMin, spacetime.clockMax, time);
    this.store.set({ averageSpeed: energy.meanSpeed, energyMissing: energy.missing, spacetime });
    if (retarded) this.refreshForceWarnings();
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

/** 'random sign' flips the whole 2D charge, so the pair keeps its direction in charge space. */
function signedCharges(g: GeneratorTemplate, rng: () => number): { charge: number; charge2: number } {
  const sign = g.chargeSpread === 'random sign' && rng() < 0.5 ? -1 : 1;
  return { charge: sign * g.charge, charge2: sign * g.charge2 };
}

function centroid(points: Vec3[]): Vec3 {
  const sum = points.reduce((acc, p) => acc.map((c, k) => c + p[k]!) as Vec3, [0, 0, 0] as Vec3);
  return sum.map((c) => c / Math.max(points.length, 1)) as Vec3;
}
