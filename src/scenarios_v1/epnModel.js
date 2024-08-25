import { Vector3 } from 'three';
import { createNuclei, createNucleiFromList, parseElementRatioList, randomVector } from '../scenariosHelpers';
import { createParticles, hexagonGenerator, shuffleArray, cubeGenerator, random } from '../helpers';
import { NuclearPotentialType } from '../physics';
import { calcGridSize, calcAvgMass } from '../scenariosHelpers';

export const epnModel = [
    periodicTable,
    //randomElements,
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

function periodicTable(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAXv3;
    physics.useBoxBoundary = true;
    //physics.useDistance1 = true;
    simulation.mode2D = true;

    const M = 1e18;
    const KG = 1e30;
    const S = 1e26;
    const C = (1 / 1.602176634) * 1e21;
    const nuclearForceRange = 3e-15 * M;

    const q = 1;
    const nq = 1/3;
    const v = 1e3 * M / S;

    physics.nuclearForceRange = nuclearForceRange;
    physics.boundaryDistance = 40 * physics.nuclearForceRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 20.0 * physics.nuclearForceRange;
    graphics.cameraSetup();
    simulation.particleRadius = 0.04 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.2 * simulation.particleRadius;

    physics.massConstant = 6.6743e-11 * KG ** -1 * M ** 3 * S ** -2;
    physics.chargeConstant = 8.988e9 * KG ** 1 * M ** 3 * S ** -2 * C ** -2;
    physics.nuclearForceConstant = 30e3 * KG * M * S ** -2;
    physics.timeStep = 1/3;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    let r0 = 0.05 * physics.nuclearForceRange;
    let r1 = 0.5 * physics.nuclearForceRange;
    let r2 = 0.493 * physics.nuclearForceRange;

    let gridSize = [8, 8, 1];
    if (graphics.maxParticles >= (3 * 10 ** 4 / 2)) gridSize = [10, 10, 1];
    //let gridSize = calcGridSize(graphics, 3*50);

    let nucleusTypes = [
        { m: 1.67262192e-27 * KG, q: 1.602176634e-19 * C, nq: 3, name: 'proton' },
        { m: 1.67492749e-27 * KG, q: 0, nq: 3, name: 'neutron' },
    ];
    let cloudTypes = [
        { m: 9.1093837015e-31 * KG, q: -1.602176634e-19 * C, nq: -1, name: 'electron' },
    ];

    function createNucleiFromList(simulation, nucleusList, cloudList, n, m, q, nq, r0, r1, center, velocity) {
        let options = {
            m, q, nq,
            r0: 0, r1: r0,
            randomSequence: false,
            randomNQSignal: false,
            v1: velocity,
            center
        };
        createParticles(simulation, nucleusList, n * nucleusList.length, options);
        options = { ...options, r0, r1 };
        createParticles(simulation, cloudList, n * cloudList.length, options);
    }

    let n = 1;
    cubeGenerator((x, y, z) => {
        //let s = ((n % 2 == 0) ? (1) : (-1));
        //let s = ((random(0, 1) >= 0.5) ? (1) : (-1));
        let s = 1;
        let center = new Vector3(x, -y, z);
        createNucleiFromList(simulation, nucleusTypes, cloudTypes, n, 1.0, q, s * nq, r0, r1, center, v);
        n++;
    }, 6 * r2, gridSize);
    shuffleArray(physics.particleList);
}

function randomElements(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAX;
    physics.useBoxBoundary = true;
    //physics.useDistance1 = true;
    simulation.mode2D = true;

    const m = 1 * 1e18; // meter
    const kg = 1.0 * (1 / 9.1093837015) * 1e30; // kilogram
    const s = 1e27; // second
    const c = 100.0 * (1 / 1.602176634) * 1e18; // coulomb
    const nuclearForceRange = 1e-15 * m;
    const nq = 1.0;
    const v = 1.0;

    physics.nuclearForceRange = nuclearForceRange;
    physics.boundaryDistance = 25 * physics.nuclearForceRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 10.0 * physics.nuclearForceRange;
    graphics.cameraSetup();
    simulation.particleRadius = 0.04 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.2 * simulation.particleRadius;

    physics.massConstant = 6.6743e-11 * kg ** -1 * m ** 3 * s ** -2;
    physics.chargeConstant = 8.988e9 * kg ** 1 * m ** 3 * s ** -2 * c ** -2;
    physics.nuclearForceConstant = 3.0;
    physics.timeStep = 1 / 3;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    let r0 = 0.05 * physics.nuclearForceRange;
    let r1 = 0.5 * physics.nuclearForceRange;
    let r2 = 0.493 * physics.nuclearForceRange;

    let gridSize = calcGridSize(graphics, 3 * 15);

    simulation.field.probeConfig(0, 1e3, 0);
    //if (!ENV?.production) simulation.field.setup('2d', 50);

    let nucleusTypes = [
        { m: 1.67262192e-27 * kg, q: 1.602176634e-19 * c, nq: 1, name: 'proton' },
        { m: 1.67492749e-27 * kg, q: 0, nq: 1, name: 'neutron' },
    ];
    let cloudTypes = [
        { m: 9.1093837015e-31 * kg, q: -1.602176634e-19 * c, nq: -1 / 60, name: 'electron' },
    ];

    function createNucleiFromList(simulation, nucleusList, cloudList, n, m, q, nq, r0, r1, center, velocity) {
        let options = {
            m, q, nq,
            r0: 0, r1: r0,
            randomSequence: false,
            randomNQSignal: false,
            v1: velocity,
            center
        };
        createParticles(simulation, nucleusList, n * nucleusList.length, options);
        options = { ...options, r0, r1 };
        createParticles(simulation, cloudList, n * cloudList.length, options);
    }

    let index = 0;
    cubeGenerator((x, y, z) => {
        //let snq = nq * ((random(0, 1) >= 0.5) ? (1) : (-1));
        let snq = nq * (index % 2) ? (1) : (-1);
        let center = new Vector3(x, -y, z);
        let n = random(1, 26, true);
        createNucleiFromList(simulation, nucleusTypes, cloudTypes, n, 1.0, 1.0, snq, r0, r1, center, v);
        index++;
    }, 2.5 * r2, gridSize);
    shuffleArray(physics.particleList);
}
