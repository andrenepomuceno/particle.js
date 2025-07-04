import { Vector3 } from 'three';
import { createNucleiFromList } from '../scenariosHelpers';
import { createParticles, hexagonGenerator, random, shuffleArray, stringToCoordinates, caption } from '../helpers';
import { FrictionModel, NuclearPotentialType } from '../physics';
import { calcGridSize } from '../scenariosHelpers';
import { core } from '../core';
import { Particle, ParticleType } from '../particle';

export const forceMap = [
    {
        name: 'The Egg',
        callback: theEgg
    },
    {
        name: 'Gravity',
        callback: gravity
    },
    {
        name: 'Welcome',
        callback: welcome
    },
    {
        name: 'Experiments 4',
        callback: experiments4
    },
    {
        name: 'Uncertainty',
        callback: uncertainty
    },
    {
        name: 'Hexagonal Crystal',
        callback: hexagonalCrystal
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

    physics.nuclearPotential = NuclearPotentialType.potential_forceMap1;

    physics.enableFriction = true;
    physics.frictionConstant = 1e-3;
    physics.frictionModel = FrictionModel.square;
}

function createParticle(particleList, mass = 1, charge = 0, nuclearCharge = 0, position = new Vector3(), velocity = new Vector3(), fixed = false) {
    let p = new Particle();
    p.mass = mass;
    p.charge = charge;
    p.nuclearCharge = nuclearCharge;
    p.position.add(position);
    p.velocity.add(velocity);
    if (fixed) p.type = ParticleType.fixed;
    particleList.push(p);
}

function hexagonalCrystal2(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    simulation.mode2D = true;
    /*physics.roundPosition = true;
    physics.roundVelocity = true;*/

    const M = (10/3) * 1e18;
    const S = (5) * 1e26;
    const KG = (10 / 9.1093837015) * 1e29;
    const C = (1 / 1.602176634) * 1e21;
    const lightSpeed = 299792458 * M / S;
    const planckConstant =  (1/2 * Math.PI) * 6.62607015e-34 * M ** 2 * KG / S

    physics.nuclearForceRange = 3.0e-15 * M;
    let r0 = 0.1 * physics.nuclearForceRange;
    let r1 = 1.0 * physics.nuclearForceRange;
    let r2 = 0.30 * physics.nuclearForceRange;

    physics.nuclearForceConstant = 10e3 * KG * M * S ** -2;
    physics.massConstant = 1e37 * 6.6743e-11 * KG ** -1 * M ** 3 * S ** -2;
    physics.chargeConstant = 8.988e9 * KG * M ** 3 * S ** -2 * C ** -2;
    physics.colorChargeConstant = physics.nuclearForceConstant;
    physics.fineStructureConstant = (1/137) * planckConstant * lightSpeed;

    physics.nuclearPotential = NuclearPotentialType.lennardJones;    
    physics.forceMap = [32.0, 1e3, -1.0];
    physics.useDistance1 = true;

    physics.timeStep = 0.2;
    physics.maxVel = lightSpeed * 1e2;
    
    physics.enableColision = false;
    physics.minDistance2 = Math.pow(1, 2);
    physics.enableColorCharge = false;
    physics.enableLorentzFactor = false;
    physics.enableFineStructure = false;
    physics.enableRandomNoise = false;
    physics.randomNoiseConstant = 0.1;
    physics.enableFriction = true;
    physics.frictionConstant = 1e-4;

    physics.useBoxBoundary = true;
    physics.boundaryDistance = 1e9;
    physics.boundaryDamping = 0.9;

    simulation.particleRadius = 125; //0.05 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 10; //0.4 * simulation.particleRadius;
    // simulation.graphics.arrow3d = false;
    // simulation.graphics.particle3d = false;

    graphics.cameraDistance = 1e4;
    graphics.cameraSetup();

    
    let nq = 10;
    let nucleusList = [
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 1.0 },
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 2.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 3.0 },
        
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 3.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 2.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 1.0 },
    ]

    let cloudList = [
        { m: 9.1093837015e-31 * KG, q: -1 * 1.602176634e-19 * C, nq: nq/6, name: 'electron' },
    ]

    let zNumber = 1;
    let electrons = 1;
    let grid = calcGridSize(graphics, 4 * zNumber * (nucleusList.length + electrons * cloudList.length));
    nq = 1;
    let v = 0;//1e1 * M * S ** -2;
    hexagonGenerator((vertex, totalLen) => {
        let snq = nq;
        //let snq = nq * ((random(0, 1) >= 0.001) ? (1) : (-1));
        //let snq = nq * (index % 2) ? (1) : (-1);
        //let center = new Vector3(x, y, z);
        let center = new Vector3(vertex.x, vertex.y, 0);

        createNucleiFromList(simulation, nucleusList, cloudList, zNumber, 1.0, 1.0, snq, r0, r1, center, v, zNumber * electrons);
    }, r2, grid, 'offset', true);

    shuffleArray(physics.particleList);

    graphics.showAxis(true, simulation.mode2D, 1e-15 * M, true, '1 fm');
}

function colorTest(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    simulation.mode2D = true;
    /*physics.roundPosition = true;
    physics.roundVelocity = true;*/

    simulation.field.probeConfig(0, 0, 1e2, 1);
    simulation.field.setup('2d', 100);

    const M = (1/3) * 1e19;
    const S = (5) * 1e26;
    const KG = (1) * 1e29;
    const C = (1 / 1.602176634) * 1e21;

    const nuclearForce = 30e3 * KG * M * S ** -2;
    physics.nuclearForceRange = 3.0e-15 * M;
    physics.nuclearForceConstant = 0;//nuclearForce;
    physics.massConstant = 6.6743e-11 * KG ** -1 * M ** 3 * S ** -2;
    physics.chargeConstant = 8.988e9 * KG * M ** 3 * S ** -2 * C ** -2;

    physics.enableColorCharge = true;
    physics.colorChargeConstant = nuclearForce;

    physics.nuclearPotential = NuclearPotentialType.potential_forceMap2;
    physics.forceMap = [1.0, 0.1, 1.0];

    physics.timeStep = 1;
    physics.useDistance1 = false;
    const lightSpeed = 10e6 * 299792458 * M / S;
    physics.maxVel = lightSpeed;
    physics.enableLorentzFactor = false;

    physics.enableFineStructure = false;
    const planckConstant =  (1/2 * Math.PI) * 6.62607015e-34 * M ** 2 * KG / S
    physics.fineStructureConstant = (1/137) * planckConstant * lightSpeed;

    physics.minDistance2 = Math.pow(1e-3, 2);

    physics.enableRandomNoise = false;
    physics.randomNoiseConstant = 1.0;

    physics.enableFriction = false;
    physics.frictionConstant = 1e-9;

    physics.useBoxBoundary = true;
    physics.boundaryDistance = 1e6;
    physics.boundaryDamping = 0.9;

    graphics.cameraDistance = physics.nuclearForceRange;
    graphics.cameraSetup();

    simulation.particleRadius = 0.05 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.4 * simulation.particleRadius;

    const nq = 10;
    let typeList = [
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 1.0 },
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 2.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 3.0 },

        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 3.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 2.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 1.0 },

        /*{ m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: -nq, name: 'quark up', colorCharge: 1.0 },
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: -nq, name: 'quark up', colorCharge: 2.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: -nq, name: 'quark down', colorCharge: 3.0 },

        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: -nq, name: 'quark up', colorCharge: 3.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: -nq, name: 'quark down', colorCharge: 2.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: -nq, name: 'quark down', colorCharge: 1.0 },*/

        //{ m: 9.1093837015e-31 * KG, q: -1 * 1.602176634e-19 * C, nq: -nq/6, name: 'electron' },
    ]

    let n = typeList.length; //Math.min(10e3, );
    let options = {
        randomSequence: false,
        //randomM: true,
        randomQ: false,
        randomQSignal: false,
        randomNQSignal: false,
        radialVelocity: true,
        randomVelocity: false,
        v1: 0.0,
        r0: 0.1 * physics.nuclearForceRange,
    }
    createParticles(simulation, typeList, n, options);

    shuffleArray(physics.particleList);

    graphics.showAxis(true, simulation.mode2D, 1e-15 * M, true, '1 fm');
}

function theEgg(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    simulation.mode2D = true;
    /*physics.roundPosition = true;
    physics.roundVelocity = true;*/

    const M = (10/3) * 1e18;
    const S = (5) * 1e26;
    const KG = (10 / 9.1093837015) * 1e29;
    const C = (1 / 1.602176634) * 1e21;
    const lightSpeed = 299792458 * M / S;
    const planckConstant =  (1/2 * Math.PI) * 6.62607015e-34 * M ** 2 * KG / S

    physics.nuclearForceRange = 3.0e-15 * M;
    physics.nuclearForceConstant = 10e3 * KG * M * S ** -2;
    physics.massConstant = 6.6743e-11 * KG ** -1 * M ** 3 * S ** -2;
    physics.chargeConstant = 8.988e9 * KG * M ** 3 * S ** -2 * C ** -2;
    physics.colorChargeConstant = physics.nuclearForceConstant;
    physics.fineStructureConstant = (1/137) * planckConstant * lightSpeed;

    physics.nuclearPotential = NuclearPotentialType.potential_forceMap2;    
    physics.forceMap = [1.0, 0.1, 1.0];
    physics.useDistance1 = true;

    physics.timeStep = 1.0;
    physics.maxVel = lightSpeed * 1e9;

    physics.minDistance2 = Math.pow(1, 2);
    physics.enableColorCharge = true;
    physics.enableLorentzFactor = false;
    physics.enableFineStructure = false;
    physics.enableRandomNoise = true;
    physics.randomNoiseConstant = 1.0;
    physics.enableFriction = true;
    physics.frictionConstant = 1e-9;

    physics.useBoxBoundary = true;
    physics.boundaryDistance = 1e18;
    physics.boundaryDamping = 0.9;

    simulation.particleRadius = 0.05 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.4 * simulation.particleRadius;

    graphics.cameraDistance = 2e6;
    graphics.cameraSetup();

    const nq = 10;
    let typeList = [
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 1.0 },
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 2.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 3.0 },
        
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 3.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 2.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 1.0 },

        { m: 9.1093837015e-31 * KG, q: -1 * 1.602176634e-19 * C, nq: -nq/6, name: 'electron' },
    ]

    let n = graphics.maxParticles; //Math.min(10e3, );
    let options = {
        randomSequence: false,
        //randomM: true,
        randomQ: false,
        randomQSignal: false,
        randomNQSignal: false,
        v1: 0,
        r0: 20 * physics.nuclearForceRange
    }
    createParticles(simulation, typeList, n, options);

    shuffleArray(physics.particleList);

    graphics.showAxis(true, simulation.mode2D, 1e-15 * M, true, '1 fm');
    
    const cyclesPerMs = (53/1000)/physics.timeStep;
    simulation.addActionArray([
        {
            cycle: 0.01 * 1e3 * cyclesPerMs,
            callback: () => {
                //graphics.drawCursor(false);
                caption(graphics,"Gravity: " + physics.massConstant.toExponential(2));
            }
        },
        {
            cycle: 2 * 1e3 * cyclesPerMs,
            callback: () => {
                core.updatePhysics('massConstant', physics.massConstant * 1e41
                );
                caption(graphics,"Gravity: " + physics.massConstant.toExponential(2));
            }
        },
        {
            cycle: 5 * 1e3 * cyclesPerMs,
            callback: () => {
                core.updatePhysics('massConstant', physics.massConstant * 1e-1);
                core.updatePhysics('frictionConstant', physics.frictionConstant * 1e1);
                caption(graphics,"Gravity: " + physics.massConstant.toExponential(2) + 
                        "\nFriction: " + physics.frictionConstant.toExponential(2));
            }
        },
        {
            cycle: 6.0 * 1e3 * cyclesPerMs,
            callback: () => {
                //core.updatePhysics('massConstant', physics.massConstant * 1e-1);
                core.updatePhysics('frictionConstant', physics.frictionConstant * 1e1);
                caption(graphics,"Gravity: " + physics.massConstant.toExponential(2) + 
                        "\nFriction: " + physics.frictionConstant.toExponential(2));
            }
        },
        {
            cycle: 7.0 * 1e3 * cyclesPerMs,
            callback: () => {
                //core.updatePhysics('massConstant', physics.massConstant * 1e-1);
                core.updatePhysics('frictionConstant', physics.frictionConstant * 1e1);
                caption(graphics,"Gravity: " + physics.massConstant.toExponential(2) + 
                        "\nFriction: " + physics.frictionConstant.toExponential(2));
            }
        },
        {
            cycle: 8.0 * 1e3 * cyclesPerMs,
            callback: () => {
                core.updatePhysics('massConstant', physics.massConstant * 1e-1);
                core.updatePhysics('frictionConstant', physics.frictionConstant * 1e1);
                caption(graphics,"Gravity: " + physics.massConstant.toExponential(2) + 
                        "\nFriction: " + physics.frictionConstant.toExponential(2));
            }
        },
        {
            cycle: 120.0 * 1e3 * cyclesPerMs,
            callback: () => {
                core.updatePhysics('massConstant', physics.massConstant * 1e-1);
                //core.updatePhysics('frictionConstant', physics.frictionConstant * 1e1);
                caption(graphics,"Gravity: " + physics.massConstant.toExponential(2) + 
                        "\nFriction: " + physics.frictionConstant.toExponential(2));
            }
        },
        {
            cycle: 122.0 * 1e3 * cyclesPerMs,
            callback: () => {
                core.updatePhysics('massConstant', physics.massConstant * 1e-1);
                //core.updatePhysics('frictionConstant', physics.frictionConstant * 1e1);
                caption(graphics,"Gravity: " + physics.massConstant.toExponential(2) + 
                        "\nFriction: " + physics.frictionConstant.toExponential(2));
            }
        },
    ]);
}

function uncertainty(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    simulation.mode2D = true;
    /*physics.roundPosition = true;
    physics.roundVelocity = true;*/

    const M = (1/3) * 1e19;
    const S = (5) * 1e26;
    const KG = (1) * 1e29;
    const C = (1 / 1.602176634) * 1e21;

    physics.nuclearForceRange = 3.0e-15 * M;
    physics.nuclearForceConstant = 30e3 * KG * M * S ** -2;
    physics.massConstant = 6.6743e-11 * KG ** -1 * M ** 3 * S ** -2;
    physics.chargeConstant = 8.988e9 * KG * M ** 3 * S ** -2 * C ** -2;

    physics.nuclearPotential = NuclearPotentialType.potential_forceMap2;
    physics.forceMap = [1.0, 0.2, 1.0];

    physics.timeStep = 1e3;
    physics.useDistance1 = true;
    const lightSpeed = 299792458 * M / S;
    physics.maxVel = lightSpeed;
    physics.enableLorentzFactor = true;

    physics.enableFineStructure = false;
    const planckConstant =  (1/2 * Math.PI) * 6.62607015e-34 * M ** 2 * KG / S
    physics.fineStructureConstant = (1/137) * planckConstant * lightSpeed;

    physics.enableColorCharge = true;
    physics.colorChargeConstant = physics.nuclearForceConstant;

    physics.minDistance2 = Math.pow(1e-3, 2);

    physics.enableRandomNoise = true;
    physics.randomNoiseConstant = 1.0;

    physics.enableFriction = false;
    physics.frictionConstant = 1e-5;

    physics.useBoxBoundary = true;
    physics.boundaryDistance = 1e6;
    physics.boundaryDamping = 0.9;

    graphics.cameraDistance = 4e5;
    graphics.cameraSetup();

    simulation.particleRadius = 0.05 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.4 * simulation.particleRadius;

    const nq = 10;
    let typeList = [
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 1.0 },
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 2.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 3.0 },
        
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 3.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 2.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 1.0 },

        { m: 9.1093837015e-31 * KG, q: -1 * 1.602176634e-19 * C, nq: -nq/3, name: 'electron' },
    ]

    let n = graphics.maxParticles; //Math.min(10e3, );
    let options = {
        randomSequence: false,
        //randomM: true,
        randomQ: false,
        randomQSignal: false,
        randomNQSignal: false,
        v1: 0,
        r0: 20 * physics.nuclearForceRange
    }
    createParticles(simulation, typeList, n, options);

    shuffleArray(physics.particleList);

    graphics.showAxis(true, simulation.mode2D, 1e-15 * M, true, '1 fm');
    
    return;
    const cyclesPerMs = (60/1000);///physics.timeStep;
    simulation.addActionArray([
        {
            cycle: 0.1 * 1e3 * cyclesPerMs,
            callback: () => {
                //graphics.drawCursor(false);
                caption(graphics,"Gravity: " + physics.massConstant);
            }
        },
        {
            cycle: 2 * 1e3 * cyclesPerMs,
            callback: () => {
                core.updatePhysics('massConstant', physics.massConstant * 1e41
                );
                caption(graphics,"Gravity: " + physics.massConstant);
            }
        },
        {
            cycle: 5 * 1e3 * cyclesPerMs,
            callback: () => {
                core.updatePhysics('massConstant', physics.massConstant * 1e-2);
                caption(graphics,"Gravity: " + physics.massConstant);
            }
        },
        {
            cycle: 60 * 1e3 * cyclesPerMs,
            callback: () => {
                core.updatePhysics('massConstant', physics.massConstant * 1e-2);
                core.updatePhysics('frictionConstant', physics.frictionConstant * 1e1);
                caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
            }
        },
        {
            cycle: 70 * 1e3 * cyclesPerMs,
            callback: () => {
                core.updatePhysics('frictionConstant', physics.frictionConstant * 1e-1);
                caption(graphics,"Friction: " + physics.frictionConstant);
            }
        },
        {
            cycle: 80 * 1e3 * cyclesPerMs,
            callback: () => {
                core.updatePhysics('frictionConstant', physics.frictionConstant * 1e-1);
                caption(graphics,"Friction: " + physics.frictionConstant);
            }
        }
    ]);
}

function rngTest(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearForceRange = 1e4;
    physics.nuclearForceConstant = 0;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    physics.minDistance2 = Math.pow(1e-3, 2);

    physics.enableRandomNoise = true;
    physics.randomNoiseConstant = 100.0;

    physics.useBoxBoundary = true;

    physics.boundaryDistance = 1e6;
    physics.boundaryDamping = 1.0;

    graphics.cameraDistance = 4e5;
    graphics.cameraSetup();

    simulation.particleRadius = 0.05 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.4 * simulation.particleRadius;

    physics.nuclearPotential = NuclearPotentialType.potential_forceMap2;
    physics.forceMap = [1.0, 0.05, 1.0, 1.0];

    const nq = 10;
    let typeList = [
        // proton
        { m: 1, q: 1, nq: 1, name: '', colorCharge: 1.0 },
    ]

    let n = graphics.maxParticles;
    let options = {
        randomSequence: false,
        //randomM: true,
        randomQ: false,
        randomQSignal: true,
        randomNQSignal: true,
        v1: 0,
        r0: 20 * physics.nuclearForceRange
    }
    createParticles(simulation, typeList, n, options);

    shuffleArray(physics.particleList);
}

function nuclearField(simulation) {
    const graphics = simulation.graphics;
    const physics = simulation.physics;
    const grid = 100;
    const particleList = simulation.particleList;

    physics.nuclearPotential = NuclearPotentialType.potential_forceMap2;
    physics.forceMap = [1.0, 0.2, 1.0];

    physics.timeStep = 1;
    physics.massConstant = 1;
    physics.chargeConstant = 1;
    physics.nuclearForceConstant = 1;
    physics.nuclearForceRange = 1e3;

    physics.enableRandomNoise = false;
    physics.randomNoiseConstant = 1.0;

    simulation.bidimensionalMode(true);
    simulation.setParticleRadius(0.05 * physics.nuclearForceRange, 0);

    simulation.field.probeConfig(0, 0, 1e2);
    simulation.field.setup('2d', grid);

    const distance = 2 * physics.nuclearForceRange;
    graphics.cameraDistance = distance;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    graphics.cameraSetup();

    let x = new Vector3(1.1 * physics.nuclearForceRange, 0, 0);
    let v = new Vector3(1, 0, 0);
    let fixed = true;
    let q = 1;
    let m = 1;
    let nq = 1;

    createParticle(particleList, m, q, nq, new Vector3().sub(x), new Vector3().add(v), fixed);
    createParticle(particleList, m, -q, -nq, new Vector3().add(x), new Vector3().sub(v), fixed);
}

function gravity(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    simulation.mode2D = true;

    const M = (1) * 1e-16;
    const S = (1) * 1e-15;
    const KG = (1) * 1e-30;
    const C = (1 / 1.602176634) * 1e-18;

    physics.nuclearForceRange = 3.0e-15 * M;
    physics.nuclearForceConstant = 30e3 * KG * M * S ** -2;
    physics.massConstant = 6.6743e-11 * KG ** -1 * M ** 3 * S ** -2;
    physics.chargeConstant = 8.988e9 * KG * M ** 3 * S ** -2 * C ** -2;

    physics.nuclearPotential = NuclearPotentialType.potential_forceMap2;
    physics.forceMap = [1.0, 0.5, 1.0];

    physics.timeStep = 1/4;
    physics.useDistance1 = true;
    physics.enablePostGravity = true;

    physics.maxVel = 299792458 * M / S;
    physics.enableLorentzFactor = true;
 
    physics.minDistance2 = Math.pow(1e-3, 2);

    physics.enableFriction = false;
    physics.frictionConstant = 1e-6;

    /*physics.roundPosition = true;
    physics.roundVelocity = true;*/

    physics.useBoxBoundary = false;
    physics.boundaryDistance = 1e9;
    physics.boundaryDamping = 0.9;

    const n = graphics.maxParticles;
    const scaling = n/30976;

    simulation.particleRadius = 3e2;
    simulation.particleRadiusRange = 0.4 * simulation.particleRadius;

    let typeList = [
        { m: 2e31 * KG, q: 2e9 * C, nq: 10, name: '', colorCharge: 0.0 },
    ]
    let r = 4e5 * scaling;
    let vel = 2 * 2.4e4 * M / S * scaling;

    let options = {
        randomSequence: false,

        randomM: true,
        exponentialMass: true,
        expoent: 3,

        randomQ: true,
        randomQSignal: true,

        randomNQ: true,
        randomNQSignal: true,

        v1: vel,
        radialVelocity: true,
        randomVelocity: true,

        r0: 0.5 * r,
        r1: r,
    }
    createParticles(simulation, typeList, n, options);

    shuffleArray(physics.particleList);

    graphics.cameraDistance = 6e5 * scaling;
    graphics.cameraSetup();
    graphics.showAxis(true, simulation.mode2D, 1e18 * M, true, '1e18 m');
}

function experiments4(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    simulation.mode2D = true;
    /*physics.roundPosition = true;
    physics.roundVelocity = true;*/

    const M = (1/3) * 1e19;
    const S = (5) * 1e26;
    const KG = (1) * 1e29;
    const C = (1 / 1.602176634) * 1e21;

    physics.nuclearForceRange = 3.0e-15 * M;
    physics.nuclearForceConstant = 30e3 * KG * M * S ** -2;
    physics.massConstant = 6.6743e-11 * KG ** -1 * M ** 3 * S ** -2;
    physics.chargeConstant = 8.988e9 * KG * M ** 3 * S ** -2 * C ** -2;

    physics.nuclearPotential = NuclearPotentialType.potential_forceMap2;
    physics.forceMap = [1.0, 0.2, 1.0];

    physics.timeStep = 1.0;
    physics.useDistance1 = true;
    const lightSpeed = 299792458 * M / S;
    physics.maxVel = lightSpeed * 1e7;
    physics.enableLorentzFactor = false;

    physics.enableFineStructure = false;
    const planckConstant =  (1/2 * Math.PI) * 6.62607015e-34 * M ** 2 * KG / S
    physics.fineStructureConstant = (1/137) * planckConstant * lightSpeed;

    physics.enableColorCharge = true;
    physics.colorChargeConstant = physics.nuclearForceConstant;

    physics.minDistance2 = Math.pow(1e-3, 2);

    physics.enableRandomNoise = true;
    physics.randomNoiseConstant = 1.0;

    physics.enableFriction = true;
    physics.frictionConstant = 1e-5;

    physics.useBoxBoundary = true;
    physics.boundaryDistance = 1e6;
    physics.boundaryDamping = 0.9;

    graphics.cameraDistance = 4e5;
    graphics.cameraSetup();

    simulation.particleRadius = 0.05 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.4 * simulation.particleRadius;

    const nq = 10;
    let typeList = [
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 1.0 },
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 2.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 3.0 },
        
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 3.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 2.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 1.0 },

        { m: 9.1093837015e-31 * KG, q: -1 * 1.602176634e-19 * C, nq: -nq/3, name: 'electron' },
    ]

    let n = graphics.maxParticles; //Math.min(10e3, );
    let options = {
        randomSequence: false,
        //randomM: true,
        randomQ: false,
        randomQSignal: false,
        randomNQSignal: false,
        v1: 0,
        r0: 20 * physics.nuclearForceRange
    }
    createParticles(simulation, typeList, n, options);

    shuffleArray(physics.particleList);

    graphics.showAxis(true, simulation.mode2D, 1e-15 * M, true, '1 fm');
    
    const cyclesPerMs = (60/1000)/physics.timeStep;
    simulation.addActionArray([
        {
            cycle: 0.1 * 1e3 * cyclesPerMs,
            callback: () => {
                //graphics.drawCursor(false);
                caption(graphics,"Gravity: " + physics.massConstant);
            }
        },
        {
            cycle: 2 * 1e3 * cyclesPerMs,
            callback: () => {
                core.updatePhysics('massConstant', physics.massConstant * 1e41
                );
                caption(graphics,"Gravity: " + physics.massConstant);
            }
        },
        {
            cycle: 5 * 1e3 * cyclesPerMs,
            callback: () => {
                core.updatePhysics('massConstant', physics.massConstant * 1e-2);
                caption(graphics,"Gravity: " + physics.massConstant);
            }
        },
        {
            cycle: 60 * 1e3 * cyclesPerMs,
            callback: () => {
                core.updatePhysics('massConstant', physics.massConstant * 1e-2);
                core.updatePhysics('frictionConstant', physics.frictionConstant * 1e1);
                caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
            }
        },
        {
            cycle: 70 * 1e3 * cyclesPerMs,
            callback: () => {
                core.updatePhysics('frictionConstant', physics.frictionConstant * 1e-1);
                caption(graphics,"Friction: " + physics.frictionConstant);
            }
        },
        /*{
            cycle: 80 * 1e3 * cyclesPerMs,
            callback: () => {
                core.updatePhysics('frictionConstant', physics.frictionConstant * 1e-1);
                caption(graphics,"Friction: " + physics.frictionConstant);
            }
        }*/
    ]);
}

function experiments3(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    const M = 1e18;
    const KG = 1e30;
    const S = 1e27;
    const C = (1 / 1.602176634) * 1e21;

    const nuclearForceRange = 1e4;

    physics.useBoxBoundary = true;
    //physics.enableColorCharge = true;
    physics.useDistance1 = true;
    //simulation.mode2D = false;
    physics.enableFriction = true;

    /*physics.roundPosition = true;
    physics.roundVelocity = true;*/

    physics.boundaryDistance = 5e5;
    physics.boundaryDamping = 0.9;

    graphics.cameraDistance = 3e5;
    graphics.cameraSetup();

    physics.nuclearForceRange = nuclearForceRange;
    simulation.particleRadius = 0.03 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.5 * simulation.particleRadius;

    physics.frictionConstant = 1e-5;
    physics.massConstant = 1e0; //6.6743e-11 * KG ** -1 * M ** 3 * S ** -2;
    physics.chargeConstant = 500; //8.988e9 * KG * M ** 3 * S ** -2 * C ** -2;
    physics.nuclearForceConstant = 1; //30e3 * KG * M * S ** -2;
    physics.timeStep = 1;
    physics.minDistance2 = Math.pow(1e-3, 2);

    physics.nuclearPotential = NuclearPotentialType.potential_forceMap1
    physics.forceMap = [
        1,-1,-1,-1
    ]

    let typeList = [
        //{ m: 1.01, q: 0, nq: 1 },
        //{ m: 1, q: 1, nq: 1 },

        { m: 1, q: 2/3, nq: 1 },
        { m: 1, q: 2/3, nq: 1 },
        { m: 1/2, q: -1/3, nq: 1 },

        { m: 1, q: 2/3, nq: 1 },
        { m: 1/2, q: -1/3, nq: 1 },
        { m: 1/2, q: -1/3, nq: 1 },

        { m: 1/10, q: -1, nq: -1/6 },
    ]

    let n = graphics.maxParticles; //Math.min(10e3, );
    let options = {
        //randomSequence: false,
        //randomM: true,
        //randomQ: true,
        randomQSignal: false,
        randomNQSignal: false,
        v1: 1,
        r0: 20 * physics.nuclearForceRange
    }
    createParticles(simulation, typeList, n, options);

    shuffleArray(physics.particleList);

    graphics.showAxis(true, simulation.mode2D, 1e-15 * M, true, '1 fm');

    const cyclesPerMs = (60/1000);
    simulation.addActionArray([
        {
            cycle: 0.1 * 1e3 * cyclesPerMs,
            callback: () => {
                //graphics.drawCursor(false);
                caption(graphics,"Gravity: " + physics.massConstant);
            }
        },
        {
            cycle: 2 * 1e3 * cyclesPerMs,
            callback: () => {
                core.updatePhysics('massConstant', 2e4);
                caption(graphics,"Gravity: " + physics.massConstant);
            }
        },
        {
            cycle: 5 * 1e3 * cyclesPerMs,
            callback: () => {
                core.updatePhysics('massConstant', 5e1);
                caption(graphics,"Gravity: " + physics.massConstant);
            }
        },
        {
            cycle: 45 * 1e3 * cyclesPerMs,
            callback: () => {
                core.updatePhysics('massConstant', 1);
                core.updatePhysics('frictionConstant', 1e-4);
                caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
            }
        },
        {
            cycle: 50 * 1e3 * cyclesPerMs,
            callback: () => {
                core.updatePhysics('frictionConstant', 1e-6);
                caption(graphics,"Friction: " + physics.frictionConstant);
            }
        }
    ]);
}

function experiments2(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_forceMap1
    physics.forceMap = [
        0, 1, 0, 0,
        0, 0, 0, -2
    ]

    physics.useBoxBoundary = true;
    //physics.enableColorCharge = true;
    physics.useDistance1 = true;
    //simulation.mode2D = false;
    physics.enableFriction = true;
    physics.frictionConstant = 1e-5;

    const M = 1e18;
    const KG = 1e30;
    const S = (0.25) * 1e27;
    const C = (1 / 1.602176634) * 1e21;
    const nuclearForceRange = 3e-15 * M;

    physics.boundaryDistance = 20 * 1e-15 * M;
    physics.boundaryDamping = 0.9;

    graphics.cameraDistance = 0.25 * physics.boundaryDistance;
    graphics.cameraSetup();

    physics.nuclearForceRange = nuclearForceRange;
    simulation.particleRadius = 0.03 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.5 * simulation.particleRadius;

    physics.massConstant = 0; //6.6743e-11 * KG ** -1 * M ** 3 * S ** -2;
    physics.chargeConstant = 0; //8.988e9 * KG * M ** 3 * S ** -2 * C ** -2;
    physics.nuclearForceConstant = 1; //30e3 * KG * M * S ** -2; // fine structure
    physics.timeStep = 1;
    physics.minDistance2 = Math.pow(1, 2);

    let x = new Vector3(1.1 * physics.nuclearForceRange, 0, 0);
    let v = new Vector3(10, 0, 0);
    let fixed = true;
    let q = 1;
    let m = 1;
    let nq = 1;

    createParticle(simulation.particleList, m, q, nq, new Vector3(), new Vector3().add(v), true);
    createParticle(simulation.particleList, m, -q, -nq, new Vector3().add(x), new Vector3().sub(v), false);

    shuffleArray(physics.particleList);

    let grid = 100;
    simulation.field.probeConfig(0, 0, 1e2);
    simulation.field.setup('2d', grid);

    graphics.showAxis(true, simulation.mode2D, 1e-15 * M, true, '1 fm');
}

function experiments1(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_forceMap1
    physics.forceMap = [0, 0, 1, 0, 0, 0, 0, -1]

    physics.useBoxBoundary = true;
    //physics.enableColorCharge = true;
    physics.useDistance1 = true;
    //simulation.mode2D = false;
    physics.frictionConstant = 1e-3;

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

    physics.massConstant = 1e-2; //6.6743e-11 * KG ** -1 * M ** 3 * S ** -2;
    physics.chargeConstant = 1e-4; //8.988e9 * KG * M ** 3 * S ** -2 * C ** -2;
    physics.nuclearForceConstant = 1; //30e3 * KG * M * S ** -2; // fine structure
    physics.timeStep = 1;
    physics.minDistance2 = Math.pow(1, 2);

    let r0 = 0.05 * physics.nuclearForceRange;
    let r1 = 1/2 * physics.nuclearForceRange;
    let r2 = 1.2 * physics.nuclearForceRange;
    let nq = 1/3;
    let nucleusList = [
        // proton
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 1.0 },
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 2.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 3.0 },
        
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 3.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 2.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 1.0 },
    ]

    let cloudList = [
        //{ m: (1e2) * 4.99145554865e-37 * KG, q: 0, nq: -1, name: 'neutrino' },
        { m: 9.1093837015e-31 * KG, q: -1 * 1.602176634e-19 * C, nq: -1, name: 'electron' },
    ]

    let zNumber = 6;
    let electrons = 1;
    let grid = calcGridSize(graphics, 4 * zNumber * (nucleusList.length + electrons * cloudList.length));
    nq = 1;
    let v = 1e1 * M * S ** -2;
    hexagonGenerator((vertex, totalLen) => {
        let snq = nq;
        //let snq = nq * ((random(0, 1) >= 0.001) ? (1) : (-1));
        //let snq = nq * (index % 2) ? (1) : (-1);
        //let center = new Vector3(x, y, z);
        let center = new Vector3(vertex.x, vertex.y, 0);

        createNucleiFromList(simulation, nucleusList, cloudList, zNumber, 1.0, 1.0, snq, r0, r1, center, v, electrons * zNumber);
    }, r2, grid, 'offset', false);

    shuffleArray(physics.particleList);

    graphics.showAxis(true, simulation.mode2D, 1e-15 * M, true, '1 fm');
}

function welcome(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    const M = (10/3) * 1e18;
    const S = (5) * 1e26;
    const KG = (10 / 9.1093837015) * 1e29;
    const C = (1 / 1.602176634) * 1e21;
    const lightSpeed = 299792458 * M / S;
    const planckConstant =  (1/2 * Math.PI) * 6.62607015e-34 * M ** 2 * KG / S

    physics.nuclearForceRange = 3.0e-15 * M;
    physics.nuclearForceConstant = 10e3 * KG * M * S ** -2;
    physics.massConstant = 6.6743e-11 * KG ** -1 * M ** 3 * S ** -2;
    physics.chargeConstant = 8.988e9 * KG * M ** 3 * S ** -2 * C ** -2;
    physics.colorChargeConstant = physics.nuclearForceConstant;
    physics.fineStructureConstant = (1/137) * planckConstant * lightSpeed;

    physics.nuclearPotential = NuclearPotentialType.potential_forceMap2;    
    physics.forceMap = [1.0, 0.1, 1.0];
    physics.useDistance1 = false;

    physics.timeStep = 1.0;
    physics.maxVel = lightSpeed * 1e2;

    physics.minDistance2 = Math.pow(1e-3, 2);
    physics.enableColorCharge = true;
    physics.enableLorentzFactor = false;
    physics.enableFineStructure = false;
    physics.enableRandomNoise = true;
    physics.randomNoiseConstant = 1.0;
    physics.enableFriction = true;
    physics.frictionConstant = 1e-6;

    physics.useBoxBoundary = true;
    physics.boundaryDistance = 1e18;
    physics.boundaryDamping = 0.9;

    simulation.particleRadius = 0.05 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.4 * simulation.particleRadius;

    graphics.cameraDistance = 6.8e5;
    graphics.cameraSetup();

    const nq = 10;
    let nucleusList = [
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 1.0 },
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 2.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 3.0 },
        
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 3.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 2.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 1.0 },
    ]

    let cloudList = [
        { m: 9.1093837015e-31 * KG, q: -1 * 1.602176634e-19 * C, nq: -nq/6, name: 'electron' },
    ]

    let r0 = 0.05 * physics.nuclearForceRange;
    let r1 = 2/3 * physics.nuclearForceRange;
    let r2 = 3/3 * physics.nuclearForceRange;
    let vel = 0;
    let zNumber = 1;
    let cloudN = 2 * zNumber;

    let fontSize = 20;
    let alphaThreshold = 0.25 * 255;

    let coordList = stringToCoordinates("Welcome", "Arial", fontSize, 0, -fontSize);
    coordList = coordList.concat(stringToCoordinates("to", "Arial", fontSize, 0, 0));
    coordList = coordList.concat(stringToCoordinates("particle.js !", "Arial", fontSize, 0, fontSize))

    console.log("coordList.length = " + coordList.length);

    coordList.forEach((value, idx) => {
        let center = new Vector3(r2 * value.x, r2 * (value.y + 2), 0.0);
        if (value.v > alphaThreshold) createNucleiFromList(simulation, nucleusList, cloudList, zNumber, 1, 1, 1, r0, r1, center, vel, cloudN);
    });

    shuffleArray(physics.particleList);

    graphics.showAxis(true, simulation.mode2D, 1e-15 * M, true, '1 fm');
}

function hexagonalCrystal(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.forceMap = [1.0, 2.0, 0.0, -2.0, 0.0, 0.5, 0.0, -1.0]

    physics.useBoxBoundary = true;
    //physics.enableColorCharge = true;
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
    let r1 = 1/3 * physics.nuclearForceRange;
    let r2 = 2/3 * physics.nuclearForceRange;
    let nq = 1;
    let nucleusList = [
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 1.0 },
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 2.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 3.0 },
        
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark up', colorCharge: 3.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 2.0 },
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: nq, name: 'quark down', colorCharge: 1.0 },
    ]

    let cloudList = [
        //{ m: (1e2) * 4.99145554865e-37 * KG, q: 0, nq: -1, name: 'neutrino' },
        { m: 9.1093837015e-31 * KG, q: -1 * 1.602176634e-19 * C, nq: -1, name: 'electron' },
    ]

    let zNumber = 6;
    let electrons = 8 * zNumber;
    let grid = calcGridSize(graphics, 4 * zNumber * (nucleusList.length + 8 * cloudList.length));
    nq = 1;
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

    simulation.actionList.push({
        cycle: Math.round(2000/60),
        callback: () => {
            core.updatePhysics('frictionConstant', 1e-4);
        }
    });
}

