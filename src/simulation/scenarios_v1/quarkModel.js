import { Vector3 } from 'three';
import { createNuclei, createNucleiFromList, createParticle, createParticlesList, parseElementRatioList, randomVector } from '../scenariosHelpers';
import { createParticles, hexagonGenerator, shuffleArray, cubeGenerator, random } from '../helpers';
import { NuclearPotentialType } from '../physics';
import { calcGridSize, calcAvgMass } from '../scenariosHelpers';

export const quarkModel = [
    //colorTests,
    //colorCharge,
    //crystal,
    air,
    fullScaleModel,
    water2,
    //miniverse2,
    //cosmological,
    essentialElements,
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

function standardModel3(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAX;
    simulation.mode2D = true;

    physics.nuclearForceRange = 1e4;
    physics.boundaryDistance = 25 * physics.nuclearForceRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 10 * physics.nuclearForceRange;
    simulation.particleRadius = 0.01 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.5 * simulation.particleRadius;

    physics.massConstant = 1e-3;
    physics.chargeConstant = 1;
    physics.nuclearForceConstant = 1;

    let particleTypes = [
        { m: 0.01, q: 0, nq: 1 },
        { m: 0.511, q: -1, nq: 1 },
        { m: 3, q: 2 / 3, nq: 1 },
        { m: 6, q: -1 / 3, nq: 1 },
    ]
    createParticles(simulation, particleTypes, graphics.maxParticles, {
        randomQSignal: false, v1: 0, r1: 2.0 * physics.nuclearForceRange
    });
    //drawGrid(simulation);
}

function colorTests(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAXv3;
    physics.useBoxBoundary = true;
    physics.enableColorCharge = true;
    //physics.useDistance1 = true;
    simulation.mode2D = false;

    const M = 1e18;
    const KG = 1e30;
    const S = (0.25) * 1e27;
    const C = (1 / 1.602176634) * 1e21;
    const nuclearForceRange = 3e-15 * M;

    physics.boundaryDistance = 10 * 1e-15 * M;
    physics.boundaryDamping = 0.9;

    graphics.cameraDistance = 0.25 * physics.boundaryDistance;
    graphics.cameraSetup();

    physics.nuclearForceRange = nuclearForceRange;
    simulation.particleRadius = 0.03 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.5 * simulation.particleRadius;

    physics.massConstant = 6.6743e-11 * KG ** -1 * M ** 3 * S ** -2;
    physics.chargeConstant = 8.988e9 * KG * M ** 3 * S ** -2 * C ** -2;
    physics.nuclearForceConstant = 30e3 * KG * M * S ** -2; // fine structure
    physics.timeStep = 1;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    let r0 = 0.05 * physics.nuclearForceRange;
    let r1 = 0.5 * physics.nuclearForceRange;
    let r2 = 2e3;// * physics.nuclearForceRange;

    let nucleusList = [
        // proton
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark up r', colorCharge: 1.0 },
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark up g ', colorCharge: 2.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark down b', colorCharge: 3.0 },

        // neutron
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark up r', colorCharge: 1.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark down g', colorCharge: 2.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark down b', colorCharge: 3.0 },
    ]

    let cloudList = [
        //{ m: (1e2) * 4.99145554865e-37 * KG, q: 0, nq: -1, name: 'neutrino' },
        { m: 9.1093837015e-31 * KG, q: -1 * 1.602176634e-19 * C, nq: -1, name: 'electron' },
    ]

    let zNumber = 1;
    let electrons = 10 * zNumber;
    let nq = 1;
    let v = 1e1 * M * S ** -2;
    let center = new Vector3(0, 0, 0);
    createNucleiFromList(simulation, nucleusList, cloudList, zNumber, 1.0, 1.0, nq, r0, r1, center, v, electrons);

    shuffleArray(physics.particleList);

    graphics.showAxis(true, simulation.mode2D, 1e-15 * M, true, '1 fm');
}

function colorCharge(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAXv3;
    physics.useBoxBoundary = true;
    physics.enableColorCharge = true;
    //physics.useDistance1 = true;
    //simulation.mode2D = false;

    const M = 1e18;
    const KG = 1e30;
    const S = (0.25) * 1e27;
    const C = (1 / 1.602176634) * 1e21;
    const nuclearForceRange = 3e-15 * M;

    physics.boundaryDistance = 100 * 1e-15 * M;
    physics.boundaryDamping = 0.9;

    graphics.cameraDistance = 0.25 * physics.boundaryDistance;
    graphics.cameraSetup();

    physics.nuclearForceRange = nuclearForceRange;
    simulation.particleRadius = 0.03 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.5 * simulation.particleRadius;

    physics.massConstant = 6.6743e-11 * KG ** -1 * M ** 3 * S ** -2;
    physics.chargeConstant = 8.988e9 * KG * M ** 3 * S ** -2 * C ** -2;
    physics.nuclearForceConstant = 30e3 * KG * M * S ** -2; // fine structure
    physics.timeStep = 1;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    let r0 = 0.05 * physics.nuclearForceRange;
    let r1 = 0.5 * physics.nuclearForceRange;
    let r2 = 2e3;// * physics.nuclearForceRange;

    let nucleusList = [
        // proton
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark up', colorCharge: 1.0 },
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark up', colorCharge: 2.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark down', colorCharge: 3.0 },

        // neutron
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark up', colorCharge: 1.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark down', colorCharge: 2.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark down', colorCharge: 3.0 },
    ]

    let cloudList = [
        //{ m: (1e2) * 4.99145554865e-37 * KG, q: 0, nq: -1, name: 'neutrino' },
        { m: 9.1093837015e-31 * KG, q: -1 * 1.602176634e-19 * C, nq: -1, name: 'electron' },
    ]

    let zNumber = 6;
    let electrons = 10 * zNumber;
    let grid = calcGridSize(graphics, 4 * zNumber * (nucleusList.length + 10 * cloudList.length));
    let nq = 1;
    let v = 1e1 * M * S ** -2;
    hexagonGenerator((vertex, totalLen) => {
        let snq = nq;
        //let snq = nq * ((random(0, 1) >= 0.001) ? (1) : (-1));
        //let snq = nq * (index % 2) ? (1) : (-1);
        //let center = new Vector3(x, y, z);
        let center = new Vector3(vertex.x, vertex.y, 0);

        createNucleiFromList(simulation, nucleusList, cloudList, zNumber, 1.0, 1.0, snq, r0, r1, center, v, electrons);
    }, r2, grid, 'offset', false);

    shuffleArray(physics.particleList);

    graphics.showAxis(true, simulation.mode2D, 1e-15 * M, true, '1 fm');
}

function crystal(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAXv3;
    physics.useBoxBoundary = true;
    //physics.useDistance1 = true;
    //simulation.mode2D = false;

    const M = 1e18;
    const KG = 1e30;
    const S = (0.25) * 1e27;
    const C = (1 / 1.602176634) * 1e21;
    const nuclearForceRange = 3e-15 * M;

    physics.boundaryDistance = 100 * 1e-15 * M;
    physics.boundaryDamping = 0.9;

    graphics.cameraDistance = 0.25 * physics.boundaryDistance;
    graphics.cameraSetup();

    physics.nuclearForceRange = nuclearForceRange;
    simulation.particleRadius = 0.01 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.2 * simulation.particleRadius;

    physics.massConstant = 6.6743e-11 * KG ** -1 * M ** 3 * S ** -2;
    physics.chargeConstant = 8.988e9 * KG * M ** 3 * S ** -2 * C ** -2;
    physics.nuclearForceConstant = 30e3 * KG * M * S ** -2; // fine structure
    physics.timeStep = 1;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    let r0 = 0.05 * physics.nuclearForceRange;
    let r1 = 0.5 * physics.nuclearForceRange;
    let r2 = 2e3;// * physics.nuclearForceRange;

    let nucleusList = [
        // proton
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark up', colorCharge: 0.0 },
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark up', colorCharge: 1.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark down', colorCharge: 2.0 },

        // neutron
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark up', colorCharge: 0.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark down', colorCharge: 1.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark down', colorCharge: 2.0 },
    ]

    let cloudList = [
        //{ m: (1e2) * 4.99145554865e-37 * KG, q: 0, nq: -1, name: 'neutrino' },
        { m: 9.1093837015e-31 * KG, q: -1 * 1.602176634e-19 * C, nq: -1, name: 'electron' },
    ]

    let zNumber = 6;
    let electrons = 10 * zNumber;
    let grid = calcGridSize(graphics, 4 * zNumber * (nucleusList.length + 10 * cloudList.length));
    let nq = 1;
    let v = 1e1 * M * S ** -2;
    hexagonGenerator((vertex, totalLen) => {
        let snq = nq;
        //let snq = nq * ((random(0, 1) >= 0.001) ? (1) : (-1));
        //let snq = nq * (index % 2) ? (1) : (-1);
        //let center = new Vector3(x, y, z);
        let center = new Vector3(vertex.x, vertex.y, 0);

        createNucleiFromList(simulation, nucleusList, cloudList, zNumber, 1.0, 1.0, snq, r0, r1, center, v, electrons);
    }, r2, grid, 'offset', false);

    shuffleArray(physics.particleList);

    graphics.showAxis(true, simulation.mode2D, 1e-15 * M, true, '1 fm');
}

function fullScaleModel(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAXv3;
    physics.useBoxBoundary = true;
    physics.enableColorCharge = false;
    //physics.useDistance1 = true;
    //simulation.mode2D = false;

    const M = 1e18;
    const KG = 1e30;
    const S = (0.5) * 1e27;
    const C = (1 / 1.602176634) * 1e21;
    const nuclearForceRange = 3e-15 * M;

    graphics.cameraDistance = 5 * nuclearForceRange;
    graphics.cameraSetup();

    physics.nuclearForceRange = nuclearForceRange;
    physics.boundaryDistance = 1e-12 * M;
    physics.boundaryDamping = 0.5;
    simulation.particleRadius = 0.01 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.2 * simulation.particleRadius;

    physics.massConstant = 6.6743e-11 * KG ** -1 * M ** 3 * S ** -2;
    physics.chargeConstant = 8.988e9 * KG * M ** 3 * S ** -2 * C ** -2;
    physics.nuclearForceConstant = 30e3 * KG * M * S ** -2; // fine structure
    physics.timeStep = 1;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    const density = 0.5e33 * M ** -2;
    let maxParticles = graphics.maxParticles;
    //maxParticles -= Math.round(80 * 80 * 9 / 16);
    let r0 = Math.sqrt(maxParticles / (density * Math.PI));

    let particles = [
        { m: (1e2) * 4.99145554865e-37 * KG, q: 0, nq: -1, name: 'neutrino' },
        { m: 9.1093837015e-31 * KG, q: -1 * 1.602176634e-19 * C, nq: -1, name: 'electron' },
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark up r', colorCharge: 1.0 }, // 3 MeV
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark up g', colorCharge: 2.0 }, // 3 MeV
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark up b', colorCharge: 3.0 }, // 3 MeV
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark down r', colorCharge: 1.0 }, // 6 MeV
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark down g', colorCharge: 2.0 }, // 6 MeV
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark down b', colorCharge: 3.0 }, // 6 MeV
    ];

    let options = {
        //m: 1, q: 1, nq: 1,
        r0: 0, r1: r0,
        randomSequence: true,
        randomQSignal: false,
        randomNQSignal: false,
        v1: 1.0 * M * S ** -1,
    };
    createParticles(simulation, particles, maxParticles, options);

    graphics.showAxis(true, simulation.mode2D, 1e-15 * M, true, '1 fm');
}

function water2(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAXv3;
    physics.useBoxBoundary = true;
    //physics.useDistance1 = true;
    simulation.mode2D = true;

    const M = 1e18;
    const KG = 1e30;
    const S = (0.1) * 1e27;
    const C = (1 / 1.602176634) * 1e21;
    const nuclearForceRange = 3e-15 * M;

    const nq = 1.0;
    const v = 1e-6;

    physics.nuclearForceRange = nuclearForceRange;
    physics.boundaryDistance = 100 * physics.nuclearForceRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 5.0 * physics.nuclearForceRange;
    graphics.cameraSetup();
    simulation.particleRadius = 0.04 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.2 * simulation.particleRadius;

    physics.massConstant = 6.6743e-11 * KG ** -1 * M ** 3 * S ** -2;
    physics.chargeConstant = 8.988e9 * KG ** 1 * M ** 3 * S ** -2 * C ** -2;
    physics.nuclearForceConstant = 30e3 * KG * M * S ** -2;
    physics.timeStep = 1;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    let r0 = 0.01 * physics.nuclearForceRange;
    let r1 = 0.5 * physics.nuclearForceRange;
    let r2 = 0.95 * physics.nuclearForceRange;

    let gridSize = calcGridSize(graphics, (2 * (3 + 1) + 8 * (2 * 3 + 1)));

    let nucleusTypes = [
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark up' }, // 3 MeV
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark down' }, // 6 MeV
    ];
    let cloudTypes = [
        { m: 9.1093837015e-31 * KG, q: -1.602176634e-19 * C, nq: -1, name: 'electron' },
    ];

    let index = 0;

    cubeGenerator((x, y, z) => {
        let zNumber = 1;

        let snq = nq;
        //let snq = nq * ((random(0, 1) >= 0.001) ? (1) : (-1));
        //let snq = nq * (index % 2) ? (1) : (-1);
        let center = new Vector3(x, -y, z);

        zNumber = 8;
        createNucleiFromList(simulation, nucleusTypes, cloudTypes, 3 * zNumber, 1.0, 1.0, snq, r0, r1, center, v, zNumber);

        zNumber = 1;
        let hydrogen = [
            nucleusTypes[0],
            nucleusTypes[0],
            nucleusTypes[1]
        ];
        let side = random(0, 1, true) == 0 ? -1 : 1;
        let offset = new Vector3(r2 * Math.cos(30 * Math.PI / 180), side * r2 * Math.sin(30 * Math.PI / 180), 0);
        createNucleiFromList(simulation, hydrogen, cloudTypes, zNumber, 1.0, 1.0, snq, r0, r1, center.clone().add(offset), v, zNumber);
        offset = new Vector3(-r2 * Math.cos(30 * Math.PI / 180), side * r2 * Math.sin(30 * Math.PI / 180), 0);
        createNucleiFromList(simulation, hydrogen, cloudTypes, zNumber, 1.0, 1.0, snq, r0, r1, center.clone().add(offset), v, zNumber);

        index++;
    }, 4.0 * r2, gridSize);
    shuffleArray(physics.particleList);

    graphics.showAxis(true, simulation.mode2D, 1e-15 * M, true, '1 fm');
}

function miniverse2(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAXv3;
    //physics.useBoxBoundary = true;
    //physics.useDistance1 = true;
    simulation.mode2D = false;

    const M = 1 * 1e19;
    const KG = 1.0 * (1 / 9.1093837015) * 1e30; // kilogram, quantum mass
    const S = 1e26;
    const C = 100.0 * (1 / 1.602176634) * 1e19; // attocoulomb
    const nuclearForceRange = 1e-15 * M;

    physics.nuclearForceRange = nuclearForceRange;
    physics.boundaryDistance = 1e5 * physics.nuclearForceRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 1e2 * physics.nuclearForceRange;
    graphics.cameraSetup();
    simulation.particleRadius = 0.25 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.2 * simulation.particleRadius;

    physics.massConstant = 1e39 * 6.6743e-11 * KG ** -1 * M ** 3 * S ** -2;
    physics.chargeConstant = 8.988e9 * KG ** 1 * M ** 3 * S ** -2 * C ** -2;
    physics.nuclearForceConstant = 25e3 * KG * M * S ** -2; // fine structure
    physics.timeStep = 1 / 3;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    let r0 = 1e0 * nuclearForceRange;

    let particles = [
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark up' }, // 3 MeV
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark down' }, // 6 MeV
        { m: 9.1093837015e-31 * KG, q: -1.602176634e-19 * C, nq: -1, name: 'electron' },
    ];

    let options = {
        m: 1, q: 1, nq: 1,
        r0: 0, r1: r0,
        randomSequence: true,
        randomQSignal: true,
        randomNQSignal: true,
        //v1: 1e-6,
    };
    createParticles(simulation, particles, graphics.maxParticles, options);
}

function cosmological(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    //physics.nuclearPotential = NuclearPotentialType.potential_powAXv3;
    //physics.useBoxBoundary = true;
    physics.useDistance1 = true;
    //simulation.mode2D = false;

    const M = 1e-15;
    const KG = 1e-36;
    const S = 6e-9;
    const C = 1e-27;
    const nuclearForceRange = 3e-15 * M;

    physics.nuclearForceRange = 1;//nuclearForceRange;
    physics.boundaryDistance = 1e9 * physics.nuclearForceRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 3e6 * physics.nuclearForceRange;
    graphics.cameraSetup();
    simulation.particleRadius = 1e3;//0.25 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.8 * simulation.particleRadius;

    physics.massConstant = 6.6743e-11 * KG ** -1 * M ** 3 * S ** -2;
    physics.chargeConstant = 8.988e9 * KG ** 1 * M ** 3 * S ** -2 * C ** -2;
    physics.nuclearForceConstant = 30e3 * KG * M * S ** -2;
    physics.timeStep = 1;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    let r0 = 1;

    let particles = [
        { m: 10, q: 1, nq: 1 },
    ];

    let options = {
        m: 1, q: 1, nq: 1,
        r0: 0, r1: r0,
        //randomSequence: true,
        randomM: true,
        randomMr2: true,
        //randomMSignal: true,
        randomQ: true,
        randomQSignal: true,
        randomNQ: true,
        randomNQSignal: true,
        v1: 1e-9,
    };
    createParticles(simulation, particles, graphics.maxParticles, options);
}

function essentialElements(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAXv2;
    physics.useBoxBoundary = true;
    //physics.useDistance1 = true;
    simulation.mode2D = true;

    const M = 1e18;
    const KG = 1e30;
    const S = 1e26;
    const C = (1 / 1.602176634) * 1e21;
    const nuclearForceRange = 3e-15 * M;

    const nq = 1.0;
    const v = 1.0;

    physics.nuclearForceRange = nuclearForceRange;
    physics.boundaryDistance = 16 * physics.nuclearForceRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 15.0 * physics.nuclearForceRange;
    graphics.cameraSetup();
    simulation.particleRadius = 0.04 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.2 * simulation.particleRadius;

    physics.massConstant = 6.6743e-11 * KG ** -1 * M ** 3 * S ** -2;
    physics.chargeConstant = 8.988e9 * KG ** 1 * M ** 3 * S ** -2 * C ** -2;
    physics.nuclearForceConstant = 30e3 * KG * M * S ** -2;
    physics.timeStep = 1;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    let r0 = 0.05 * physics.nuclearForceRange;
    let r1 = 0.5 * physics.nuclearForceRange;
    let r2 = 0.493 * physics.nuclearForceRange;

    let nucleusTypes = [
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark up' }, // 3 MeV
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark down' }, // 6 MeV
    ];
    let cloudTypes = [
        { m: 9.1093837015e-31 * KG, q: -1.602176634e-19 * C, nq: -1, name: 'electron' },
    ];
    let elementsRatios = [
        { r: 100, n: 1, name: 'H' },
        { r: 30, n: 6, name: 'C' },
        { r: 30, n: 7, name: 'N' },
        { r: 10, n: 8, name: 'O' },
        { r: 1, n: 12, name: 'Mg' },
        { r: 1, n: 15, name: 'P' },
        { r: 1, n: 16, name: 'S' },
        { r: 1, n: 26, name: 'Fe' },
        { r: 1, n: 29, name: 'Cu' },
        { r: 1, n: 30, name: 'Zn' },
    ];
    parseElementRatioList(elementsRatios);
    console.log(elementsRatios);
    let avgMass = calcAvgMass(elementsRatios);

    let gridSize = calcGridSize(graphics, 7 * Math.round(avgMass + 0.5));
    physics.boundaryDistance = gridSize[0] * physics.nuclearForceRange;

    let eleHistogram = new Map();
    let index = 0;
    for (let j = 0; j < gridSize[0] * gridSize[1] * gridSize[2]; ++j) {
        let sq = 1.0;
        let snq = nq;
        if (random(0, 1) <= 0.1) {
            snq *= -1;
            sq *= -1;
        }
        let center = randomVector(-physics.boundaryDistance, physics.boundaryDistance);

        let rng = random(0, 1);
        let zNumber = 1;
        for (let i = 0; i < elementsRatios.length; ++i) {
            if (rng < elementsRatios[i].r) {
                let element = elementsRatios[i];
                zNumber = element.n;

                if (eleHistogram.has(element.name)) {
                    eleHistogram.get(element.name).count++;
                } else {
                    eleHistogram.set(element.name, {
                        count: 1
                    });
                }
                //console.log(ratios[i].name);
                break;
            }
        }

        createNucleiFromList(simulation, nucleusTypes, cloudTypes, 3 * zNumber, 1.0, sq, snq, r0, r1, center, v, zNumber);
        index++;
    }
    shuffleArray(physics.particleList);

    console.log(eleHistogram);
    let total = 0;
    eleHistogram.forEach(v => {
        total += v.count;
    });
    console.log(total);

    graphics.showAxis(true, simulation.mode2D, 1e-15 * M, true, '1 fm');
}

function air(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAXv3;
    physics.useBoxBoundary = true;
    //physics.useDistance1 = true;
    simulation.mode2D = true;

    const M = 1e18;
    const KG = 1e30;
    const S = (0.1) * 1e27;
    const C = (1 / 1.602176634) * 1e21;
    const nuclearForceRange = 3e-15 * M;

    const nq = 1.0;
    const v = 1e-6;

    physics.nuclearForceRange = nuclearForceRange;
    physics.boundaryDistance = 20 * physics.nuclearForceRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 15.0 * physics.nuclearForceRange;
    graphics.cameraSetup();
    simulation.particleRadius = 0.04 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.2 * simulation.particleRadius;

    physics.massConstant = 6.6743e-11 * KG ** -1 * M ** 3 * S ** -2;
    physics.chargeConstant = 8.988e9 * KG ** 1 * M ** 3 * S ** -2 * C ** -2;
    physics.nuclearForceConstant = 30e3 * KG * M * S ** -2;
    physics.timeStep = 1;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    let r0 = 0.05 * physics.nuclearForceRange;
    let r1 = 0.5 * physics.nuclearForceRange;
    let r2 = 0.493 * physics.nuclearForceRange;

    let gridSize = calcGridSize(graphics, 7 * 8);

    let nucleusTypes = [
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark up' }, // 3 MeV
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: 1, name: 'quark down' }, // 6 MeV
    ];
    let cloudTypes = [
        { m: 9.1093837015e-31 * KG, q: -1.602176634e-19 * C, nq: -1, name: 'electron' },
    ];

    let elementsRatios = [
        { r: 2 * 78.084, n: 7, name: 'N2' }, // N2
        { r: 2 * 20.946, n: 8, name: 'O2' }, // O2
        { r: 0.9340, n: 33, name: 'Ar' }, // Ar
        // CO2
        { r: 0.0417, n: 6, name: "C (CO2)" }, // C
        { r: 2 * 0.0417, n: 8, name: "O2 (CO2)" }, // O2
        { r: 0.001818, n: 10, name: 'Ne' }, // Ne
        { r: 0.000524, n: 2, name: 'He' }, // He
        // CH4
        { r: 0.0417, n: 6, name: "C (CH4)" }, // C
        { r: 4 * 0.0417, n: 1, name: "H4 (CH4)" }, // H4
        { r: 0.000114, n: 36, name: 'Kr' }, // Kr
    ];
    parseElementRatioList(elementsRatios);
    console.log(elementsRatios);

    let eleHistogram = new Map();
    let index = 0;
    cubeGenerator((x, y, z) => {
        let snq = nq * ((random(0, 1) >= 0.01) ? (1) : (-1));
        //let snq = nq * (index % 2) ? (1) : (-1);
        let center = new Vector3(x, -y, z);

        let rng = random(0, 1);
        let zNumber = 1;
        for (let i = 0; i < elementsRatios.length; ++i) {
            if (rng < elementsRatios[i].r) {
                let element = elementsRatios[i];
                zNumber = element.n;

                if (eleHistogram.has(element.name)) {
                    eleHistogram.get(element.name).count++;
                } else {
                    eleHistogram.set(element.name, {
                        count: 1
                    });
                }
                //console.log(ratios[i].name);
                break;
            }
        }

        createNucleiFromList(simulation, nucleusTypes, cloudTypes, 3 * zNumber, 1.0, 1.0, snq, r0, r1, center, v, zNumber);
        index++;
    }, 3 * r2, gridSize);
    shuffleArray(physics.particleList);

    console.log(eleHistogram);
    let total = 0;
    eleHistogram.forEach(v => {
        total += v.count;
    });
    console.log(total);

    graphics.showAxis(true, simulation.mode2D, 1e-15 * M, true, '1 fm');
}
