import { drawGrid } from '../scenariosHelpers';
import { NuclearPotentialType } from '../physics';

export const sandbox = [
    {
        name: 'Sandbox',
        callback: sandbox0
    },
    {
        name: 'Scaled Sandbox',
        callback: scaledSandbox
    }
];

function defaultParameters(simulation, cameraDistance = 1e4) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;

    graphics.cameraDistance = cameraDistance;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    graphics.cameraSetup();

    physics.massConstant = 1e-3;
    physics.chargeConstant = 1;
    physics.nuclearForceConstant = 1;
    physics.nuclearForceRange = 1e3;

    physics.boundaryDistance = 1e5;
    physics.boundaryDamping = 0.9;
    physics.minDistance2 = Math.pow(1, 2);

    simulation.setParticleRadius(50, 25);
    simulation.bidimensionalMode(true);
}

function scaledSandbox(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAX;
    physics.useBoxBoundary = true;
    //physics.useDistance1 = true;
    simulation.mode2D = true;

    const m = 1 * 1e18; // attometer
    const kg = 1.0 * (1 / 9.1093837015) * 1e30; // kilogram, quantum mass
    const s = 1e27; // second, quantum time
    const c = 100.0 * (1 / 1.602176634) * 1e18; // attocoulomb
    const nuclearForceRange = 1e-15 * m;

    const nq = 1.0;
    const v = 1.0;

    physics.nuclearForceRange = nuclearForceRange;
    physics.boundaryDistance = 40 * physics.nuclearForceRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 15.0 * physics.nuclearForceRange;
    graphics.cameraSetup();
    simulation.particleRadius = 0.04 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.2 * simulation.particleRadius;

    physics.massConstant = 6.6743e-11 * kg ** -1 * m ** 3 * s ** -2;
    physics.chargeConstant = 8.988e9 * kg ** 1 * m ** 3 * s ** -2 * c ** -2;
    physics.nuclearForceConstant = 3.0;
    physics.timeStep = 1;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    drawGrid(simulation, 10);
}

function sandbox0(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    //graphics.setMaxParticles(10e3);

    drawGrid(simulation, 10);

    /*let radius = physics.boundaryDistance;
    let gridPolar = new PolarGridHelper(radius, 8, divisions/2);
    gridPolar.geometry.rotateX( Math.PI / 2 );
    gridPolar.geometry.translate(0, 0, z);
    graphics.scene.add(gridPolar);*/
}