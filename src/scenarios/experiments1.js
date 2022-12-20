import { GridHelper, PolarGridHelper, Vector3 } from 'three';
import { createNuclei, randomSphericVector, randomVector } from './helpers';
import { random, hexagonGenerator, shuffleArray, cubeGenerator } from '../helpers';
import { NuclearPotentialType, Particle } from '../physics';

export const experiments1 = [
    electronProtonNeutron,
    superNucleus3D,
    hexagonalCrystal,
    squareCrystal,
    standardModel3,
    standardModel2,
    standardModel1,
    plasmaBall,
];

function defaultParameters(simulation, cameraDistance = 1e4) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    simulation.fieldCleanup();

    graphics.cameraDistance = cameraDistance;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    graphics.cameraSetup();

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1;
    physics.nuclearChargeConstant = 1;
    physics.nuclearChargeRange = 1e3;

    physics.boundaryDistance = 1e5;
    physics.boundaryDamping = 0.9;
    physics.minDistance2 = Math.pow(1, 2);

    simulation.setParticleRadius(50, 25);
    simulation.bidimensionalMode(true);
}

function createParticles(simulation, typeList, n, options) {
    const defaultOptions = {
        randomSequence: true,

        m: 1,
        randomM: false,
        roundM: false,

        q: 1,
        randomQSignal: false, randomQThresh: 0.5,
        randomQ: false,
        roundQ: false,

        nq: 1,
        randomNQSignal: true,

        r0: 0,
        r1: 1, 
        center: new Vector3(),
        v1: 0,
    };
    options = { ...defaultOptions, ...options };

    for (let i = 0; i < n; ++i) {
        let p = new Particle();
        let type = random(0, typeList.length - 1, true);
        if (options.randomSequence == false) type = i % typeList.length;

        let m = options.m;
        m *= typeList[type].m;
        if (options.randomM == true) m *= random(0, 1);
        if (options.roundM == true) m = Math.round(m);
        p.mass = m;

        let q = options.q;
        q *= typeList[type].q;
        if ((options.randomQSignal == true) && (random(0, 1) >= options.randomQThresh)) q *= -1;
        if (options.randomQ == true) q *= random(0, 1);
        if (options.roundQ == true) q = Math.round(q);
        p.charge = q;

        let nq = options.nq;
        nq *= typeList[type].nq;
        if (options.randomNQSignal == true) {
            if (random(0, 1, true) == 1) nq *= -1;
        }
        p.nuclearCharge = nq;

        p.position = randomSphericVector(options.r0, options.r1, simulation.mode2D);
        p.position.add(options.center);

        p.velocity = randomSphericVector(0, options.v1, simulation.mode2D);

        simulation.physics.particleList.push(p);
    }
}

function electronProtonNeutron(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAX;
    simulation.mode2D = true;

    physics.nuclearChargeRange = 1e3;
    physics.boundaryDistance = 50 * physics.nuclearChargeRange;
    physics.boundaryDamping = 0.5;
    graphics.cameraDistance = 10.0 * physics.nuclearChargeRange;
    simulation.particleRadius = 0.01 * physics.nuclearChargeRange;
    simulation.particleRadiusRange = 0.25 * simulation.particleRadius;

    physics.forceConstant = 1;
    physics.massConstant = 1e-9;
    physics.chargeConstant = 1e-2;
    physics.nuclearChargeConstant = 1;
    physics.minDistance2 = Math.pow(0.001 * physics.nuclearChargeRange, 2);

    const n = 3;
    const m = 1;
    const q = 1;
    const nq = 1;
    const v = 1.0;

    let r0 = 0.1 * physics.nuclearChargeRange;
    let r1 = 0.5 * physics.nuclearChargeRange;
    let r2 = 0.493 * physics.nuclearChargeRange;

    let nucleusTypes = [
        { m: 1.007276466583, q: 1, nq: 1 },
        { m: 1.00866491588, q: 0, nq: 1 },
    ];
    let cloudTypes = [
        { m: 5.48579909065e-4, q: -1, nq: 1/137 },
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

        options = {...options, r0, r1};
        createParticles(simulation, cloudList, n * cloudList.length, options);
    }

    let size = Math.round(Math.sqrt(graphics.maxParticles / (8 * n)));
    if (size % 2 == 0) size -= 1;
    console.log(size);
    const gridSize = [size, size, 1];
    hexagonGenerator((vertex, totalLen) => {
        let s = ((vertex.i % 2 == 0) ? (1) : (-1));
        let center = new Vector3(vertex.x, vertex.y, 0);
        createNucleiFromList(simulation, nucleusTypes, cloudTypes, n, m, q, s * nq, r0, r1, center, v);
    }, r2, gridSize);
    shuffleArray(physics.particleList);
}

function superNucleus3D(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAX;
    simulation.mode2D = false;

    physics.nuclearChargeRange = 1e6;
    physics.boundaryDistance = 50 * physics.nuclearChargeRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 0.6 * physics.nuclearChargeRange;
    simulation.particleRadius = 0.001 * physics.nuclearChargeRange;
    simulation.particleRadiusRange = 0.25 * simulation.particleRadius;

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-6;
    physics.chargeConstant = 1e-2;
    physics.nuclearChargeConstant = 1;
    physics.minDistance2 = Math.pow(1/10, 2);

    let particleTypes = [
        { m: 256, q: 16, nq: 1}
    ]
    createParticles(simulation, particleTypes, graphics.maxParticles, {
        r1: 1.0,//2.0 * physics.nuclearChargeRange
        v1: 1.0,
        //m: 1.0,
        randomM: true, roundM: true,
        randomQSignal: true, //randomQThresh: 0.8,
        randomQ: true, roundQ: true, 
    });
    //drawGrid(simulation);
}

function hexagonalCrystal(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAX;
    simulation.mode2D = true;

    physics.nuclearChargeRange = 1e3;
    physics.boundaryDistance = 50 * physics.nuclearChargeRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 10 * physics.nuclearChargeRange;
    simulation.particleRadius = 0.05 * physics.nuclearChargeRange;
    simulation.particleRadiusRange = 0.49 * simulation.particleRadius;

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1;
    physics.nuclearChargeConstant = 1;

    const n = 2;
    const m = 1;
    const q = 1;
    const nq = 1;
    const v = 0;

    let r0 = 0.05 * physics.nuclearChargeRange;
    let r1 = 0.5 * physics.nuclearChargeRange;
    let r2 = 0.493 * physics.nuclearChargeRange;

    let size = Math.round(Math.sqrt(graphics.maxParticles / (28 * n)));
    if (size % 2 == 0) size -= 1;
    console.log(size);
    const gridSize = [size, size, 1];
    hexagonGenerator((vertex, totalLen) => {
        let s = ((vertex.i % 2 == 0) ? (1) : (-1));
        let center = new Vector3(vertex.x, vertex.y, 0);
        createNuclei(physics.particleList, n, m, q, s * nq, r0, r1, v, center, n, n);
    }, r2, gridSize);
    shuffleArray(physics.particleList);
}

function squareCrystal(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAX;
    simulation.mode2D = true;

    physics.nuclearChargeRange = 1e3;
    physics.boundaryDistance = 50 * physics.nuclearChargeRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 10 * physics.nuclearChargeRange;
    simulation.particleRadius = 0.05 * physics.nuclearChargeRange;
    simulation.particleRadiusRange = 0.49 * simulation.particleRadius;

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1;
    physics.nuclearChargeConstant = 1;

    const n = 2;
    const m = 1;
    const q = 1;
    const nq = 1;
    const v = 0;

    const r0 = physics.nuclearChargeRange * 0.01;
    const r1 = physics.nuclearChargeRange * 0.50;

    let size = Math.round(Math.sqrt(graphics.maxParticles / (8 * n)));
    if (size % 2 == 0) size -= 1;
    console.log(size);
    const gridSize = [size, size, 1];
    const gridWidth = r1 * gridSize[0];
    let aux = 0;
    cubeGenerator((x, y, z) => {
        createNuclei(
            physics.particleList,
            n, m, q,
            (aux % 2 == 0) ? (nq) : (-nq),
            r0, r1, v,
            new Vector3(x, y, z),
            n, n
        );
        ++aux;
    }, gridWidth, gridSize);
    shuffleArray(physics.particleList);
}

function standardModel3(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAX;
    simulation.mode2D = true;

    physics.nuclearChargeRange = 1e4;
    physics.boundaryDistance = 25 * physics.nuclearChargeRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 10 * physics.nuclearChargeRange;
    simulation.particleRadius = 0.01 * physics.nuclearChargeRange;
    simulation.particleRadiusRange = 0.5 * simulation.particleRadius;

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1;
    physics.nuclearChargeConstant = 1;

    let particleTypes = [
        { m: 0.01, q: 0, nq: 1 },
        { m: 0.511, q: -1, nq: 1 },
        { m: 3, q: 2 / 3, nq: 1 },
        { m: 6, q: -1 / 3, nq: 1 },
    ]
    createParticles(simulation, particleTypes, graphics.maxParticles, {
        randomQSignal: false, v1: 0, r1: 2.0 * physics.nuclearChargeRange
    });
    //drawGrid(simulation);
}

function standardModel2(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAX;
    simulation.mode2D = true;

    physics.boundaryDistance = 1e8;

    physics.nuclearChargeRange = 1e6;
    graphics.cameraDistance = 3 * physics.nuclearChargeRange;
    simulation.particleRadius = 0.01 * physics.nuclearChargeRange;
    simulation.particleRadiusRange = 0.5 * simulation.particleRadius;

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1;
    physics.nuclearChargeConstant = 1;

    let particleTypes = [
        //{ m: 0, q: 0, nq: 1 },
        { m: 0.511, q: -1, nq: 1 },
        { m: 3, q: 2 / 3, nq: 1 },
        { m: 6, q: -1 / 3, nq: 1 },
    ]
    createParticles(simulation, particleTypes, graphics.maxParticles, { randomQSignal: true, v1: 1 });
    //drawGrid(simulation);
}

function standardModel1(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAX;
    simulation.mode2D = true;

    physics.boundaryDistance = 1e7;

    physics.nuclearChargeRange = 1e6;
    graphics.cameraDistance = 5 * physics.nuclearChargeRange;
    simulation.particleRadius = 0.01 * physics.nuclearChargeRange;
    simulation.particleRadiusRange = 0.5 * simulation.particleRadius;

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1;
    physics.nuclearChargeConstant = 1;

    let particleTypes = [
        { m: 0.511, q: -1, nq: 1 },
        { m: 3, q: 2 / 3, nq: 1 },
        { m: 6, q: -1 / 3, nq: 1 },
    ]
    createParticles(simulation, particleTypes, graphics.maxParticles, { randomQSignal: false });
    //drawGrid(simulation);
}

function plasmaBall(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAX;
    simulation.mode2D = false;

    physics.boundaryDistance = 1e5;
    graphics.cameraDistance = physics.boundaryDistance;

    physics.nuclearChargeRange = 1e4;
    simulation.particleRadius = 0.01 * physics.nuclearChargeRange;

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1 / 60;
    physics.nuclearChargeConstant = 1;

    let particleTypes = [
        { m: 0.5, q: -1, nq: 1 },
        { m: 3, q: 2 / 3, nq: 1 },
        { m: 6, q: -1 / 3, nq: 1 },
    ]
    createParticles(simulation, particleTypes, graphics.maxParticles);
    //drawGrid(simulation);
}