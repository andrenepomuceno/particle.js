import { Vector3 } from 'three';
import { createNucleiFromList } from '../scenariosHelpers';
import { hexagonGenerator, shuffleArray, stringToCoordinates } from '../helpers';
import { FrictionModel, NuclearPotentialType } from '../physics';
import { calcGridSize } from '../scenariosHelpers';
import { core } from '../core';

export const forceMap = [
    planetoidFormation,
    welcome,
    hexagonalCrystal,
];

function defaultParameters(simulation, cameraDistance = 1e4) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;

    graphics.cameraDistance = cameraDistance;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    graphics.cameraSetup();

    physics.forceConstant = 1.0;
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

function planetoidFormation(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    graphics.setMaxParticles(35e3);
    simulation.setParticleRadius(300, 100);

    physics.useBoxBoundary = true;
    //physics.enableColorCharge = true;
    physics.useDistance1 = true;
    //simulation.mode2D = false;

    const M = 1e18; // distance
    const KG = 1e30; // mass
    const S = (0.25) * 1e27; // time
    const C = (1 / 1.602176634) * 1e21; // charge
    const nuclearForceRange = 3e-15 * M;

    physics.frictionConstant = 1;
    physics.frictionModel = FrictionModel.default;

    physics.boundaryDistance = 1e5 * 1e-15 * M;
    physics.boundaryDamping = 0.9;

    graphics.cameraDistance = 30 * nuclearForceRange;
    graphics.cameraSetup();

    physics.nuclearForceRange = nuclearForceRange;
    /*simulation.particleRadius = 0.03 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.5 * simulation.particleRadius;*/

    physics.massConstant = 1e-1;//6.6743e-11 * KG ** -1 * M ** 3 * S ** -2;
    physics.chargeConstant = 1e-4;//8.988e9 * KG * M ** 3 * S ** -2 * C ** -2;
    physics.nuclearForceConstant = 3; //30e3 * KG * M * S ** -2;
    physics.forceConstant = 1;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

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

    let r0 = 0.05 * physics.nuclearForceRange;
    let r1 = 1/3 * physics.nuclearForceRange;
    let r2 = 2/3 * physics.nuclearForceRange;
    let vel = 0;
    let zNumber = 3;
    let cloudN = 2 * zNumber;

    let fontSize = 20;
    let alphaThreshold = 0.25 * 255;

    let coordList = stringToCoordinates("PLANETOID", "Arial", fontSize, 0, -fontSize/2);
    coordList = coordList.concat(stringToCoordinates("FORMATION", "Arial", fontSize, 0, fontSize/2));
    //coordList = coordList.concat(stringToCoordinates("SIMULATION", "Arial", fontSize, 0, fontSize))

    console.log("coordList.length = " + coordList.length);

    coordList.forEach((value, idx) => {
        let center = new Vector3(r2 * value.x, r2 * (value.y + 2), 0.0);
        if (value.v > alphaThreshold) createNucleiFromList(simulation, nucleusList, cloudList, zNumber, 1, 1, 1, r0, r1, center, vel, cloudN);
    });

    shuffleArray(physics.particleList);

    graphics.showAxis(true, simulation.mode2D, 1e-15 * M, true, '1 fm');

    function setCameraDistance(d) {
        simulation.graphics.camera.position.set(0, 0, d);
        simulation.graphics.controls.target.set(0, 0, 0);
        simulation.graphics.controls.update();
    }

    function cameraTransition(startTime, duration, initialPos = {x: 0, y: 0, z: 0}, finalPos = {x: 0, y: 0, z: 0}, delta = 1000/60) {
        let list = [];

        let steps = Math.round(duration/delta);

        let posDeltaX = (finalPos.x - initialPos.x)/steps;
        let posDeltaY = (finalPos.y - initialPos.y)/steps;
        let posDeltaZ = (finalPos.z - initialPos.z)/steps;

        for (let i = 0; i < steps; ++i) {
            let action = {
                time: startTime + i * delta,
                callback: () => {
                    simulation.graphics.camera.position.set(
                        initialPos.x + i * posDeltaX, 
                        initialPos.y + i * posDeltaY, 
                        initialPos.z + i * posDeltaZ);
                }
            };

            list.push(action);
        }

        return list;
    }

    simulation.addAction({
        time: 3 * 1e3,
        callback: () => {
            core.updatePhysics('frictionConstant', 1e-3);
        }
    });

    simulation.addAction({
        time: (1.5 * 60) * 1e3,
        callback: () => {
            core.updatePhysics('frictionConstant', 1e-2);
        }
    });

    simulation.addActionArray(cameraTransition(
        2.0 * 60 * 1e3, 
        3 * 1e3, 
        {x: 0, y: 0, z: 1e5}, 
        {x: 0, y: 0, z: 1.5e5}));

    simulation.addAction({
        time: 2.25 * 60 * 1e3,
        callback: () => {
            core.updatePhysics('massConstant', 2 * physics.massConstant);
        }
    });

    simulation.addAction({
        time: 2.5 * 60 * 1e3,
        callback: () => {
            core.updatePhysics('massConstant', 2 * physics.massConstant);
        }
    });

    simulation.addAction({
        time: 2.75 * 60 * 1e3,
        callback: () => {
            core.updatePhysics('massConstant', 2 * physics.massConstant);
        }
    });

    simulation.addActionArray(cameraTransition(
        2.75 * 60 * 1e3, 
        3 * 1e3, 
        {x: 0, y: 0, z: 1.5e5}, 
        {x: 0, y: 0, z: 1.0e5}));

    simulation.addAction({
        time: 3 * 60 * 1e3,
        callback: () => {
            core.updatePhysics('frictionConstant', 5e-2);
        }
    });

    simulation.addAction({
        time: 3.25 * 60 * 1e3,
        callback: () => {
            core.updatePhysics('frictionConstant', 1e-2);
        }
    });

    simulation.addAction({
        time: 3.5 * 60 * 1e3,
        callback: () => {
            core.updatePhysics('massConstant', physics.massConstant / 2);
        }
    });

    simulation.addAction({
        time: 3.75 * 60 * 1e3,
        callback: () => {
            core.updatePhysics('massConstant', physics.massConstant / 2);
        }
    });

    simulation.addAction({
        time: 4.0 * 60 * 1e3,
        callback: () => {
            core.updatePhysics('massConstant', physics.massConstant / 2);
        }
    });

    simulation.addAction({
        time: 4.25 * 60 * 1e3,
        callback: () => {
            core.updatePhysics('frictionConstant', 5e-2);
        }
    });

    simulation.addAction({
        time: 4.5 * 60 * 1e3,
        callback: () => {
            core.updatePhysics('frictionConstant', 1e-3);
        }
    });    
}

function welcome(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    simulation.setParticleRadius(300, 100);

    physics.useBoxBoundary = true;
    //physics.enableColorCharge = true;
    //physics.useDistance1 = true;
    //simulation.mode2D = false;

    const M = 1e18; // distance
    const KG = 1e30; // mass
    const S = (0.25) * 1e27; // time
    const C = (1 / 1.602176634) * 1e21; // charge
    const nuclearForceRange = 3e-15 * M;

    physics.frictionConstant = 1e-3;

    physics.boundaryDistance = 1000 * 1e-15 * M;
    physics.boundaryDamping = 0.9;

    graphics.cameraDistance = 0.09 * physics.boundaryDistance;
    graphics.cameraSetup();

    physics.nuclearForceRange = nuclearForceRange;
    /*simulation.particleRadius = 0.03 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.5 * simulation.particleRadius;*/

    physics.massConstant = 6.6743e-11 * KG ** -1 * M ** 3 * S ** -2;
    physics.chargeConstant = 8.988e9 * KG * M ** 3 * S ** -2 * C ** -2;
    physics.nuclearForceConstant = 30e3 * KG * M * S ** -2;
    physics.forceConstant = 1;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

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

    let r0 = 0.05 * physics.nuclearForceRange;
    let r1 = 1/3 * physics.nuclearForceRange;
    let r2 = 2/3 * physics.nuclearForceRange;
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
    physics.forceConstant = 1;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    let r0 = 0.05 * physics.nuclearForceRange;
    let r1 = 1/3 * physics.nuclearForceRange;
    let r2 = 2/3 * physics.nuclearForceRange;

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
    let electrons = 8 * zNumber;
    let grid = calcGridSize(graphics, 4 * zNumber * (nucleusList.length + 8 * cloudList.length));
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

    simulation.actionList.push({
        cycle: Math.round(2000/60),
        callback: () => {
            core.updatePhysics('frictionConstant', 1e-4);
        }
    });
}

