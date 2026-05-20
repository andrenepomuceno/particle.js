import { Physics } from './physics.js';
import { scenariosList } from './scenarios.js';
import { SimulationGPU } from './simulation';
import { GraphicsGPU } from './graphics.js';
import { FieldGPU } from './field.js';
import { createSimulationRuntime } from './runtime.js';

const graphics = new GraphicsGPU();

const runtime = createSimulationRuntime({
    graphics,
    scenariosList,
    PhysicsClass: Physics,
    SimulationClass: SimulationGPU,
    FieldClass: FieldGPU,
    onSimulationChange: (nextSimulation) => {
        simulation = nextSimulation;
    },
});

export let simulation = runtime.simulation;
export let core = runtime;
