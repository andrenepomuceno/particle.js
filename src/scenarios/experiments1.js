import { GridHelper, PolarGridHelper, Vector3 } from 'three';
import { randomSphericVector, randomVector } from './helpers';
import { random, hexagonGenerator, shuffleArray, cubeGenerator } from '../helpers';
import { NuclearPotentialType, Particle } from '../physics';

export const experiments1 = [
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
        r1: 1, v1: 0,
        q: 1, randomQSignal: false, randomQThresh: 0.5,
        nq: 1, randomNQSignal: true,
        m: 1, randomM: false, roundM: false
    };
    options = { ...defaultOptions, ...options };

    for (let i = 0; i < n; ++i) {
        let p = new Particle();
        let type = random(0, typeList.length - 1, true);

        let m = options.m;
        m *= typeList[type].m;
        if (options.randomM == true) m *= random(0, 1);
        if (options.roundM == true) m = Math.round(m);
        p.mass = m;

        let q = options.q;
        q *= typeList[type].q;
        if (options.randomQSignal == true) {
            let x = random(0, 1);
            if (x >= options.randomQThresh) q *= -1;
        }
        p.charge = q;

        let nq = typeList[type].nq;
        if (options.randomNQSignal == true) {
            if (random(0, 1, true) == 1) nq *= -1;
        }
        p.nuclearCharge = nq;

        p.position = randomSphericVector(0, options.r1, simulation.mode2D);
        p.velocity = randomVector(options.v1);

        simulation.physics.particleList.push(p);
    }
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