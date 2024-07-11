import { Vector3 } from 'three';
import { createNucleiFromList } from '../scenariosHelpers';
import { hexagonGenerator, caption, shuffleArray, stringToCoordinates } from '../helpers';
import { FrictionModel, NuclearPotentialType } from '../physics';
import { calcGridSize } from '../scenariosHelpers';
import { core } from '../core';

export const record = [
    planetoidFormation3,
    planetoidFormation2,
    planetoidFormation
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

function getCameraPosition(graphics) {
    let pos = graphics.camera.position;
    return {x: pos.x, y: pos.y, z: pos.z};
}

function cameraTransition(graphics, startCycle, duration, movement = {x: 0, y: 0, z: 0}, delta = 2) {
    let list = [];

    let steps = Math.round(duration/delta);

    let posDeltaX = movement.x/steps;
    let posDeltaY = movement.y/steps;
    let posDeltaZ = movement.z/steps;

    for (let i = 0; i < steps; i++) {
        let action = {
            cycle: startCycle + i * delta,
            callback: () => {
                let pos = getCameraPosition(graphics);
                graphics.camera.position.set(
                    pos.x + posDeltaX, 
                    pos.y + posDeltaY, 
                    pos.z + posDeltaZ);
            }
        };

        list.push(action);
    }
    //console.log(list);
    return list;
}

function planetoidFormation3(simulation) {
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

    graphics.cameraDistance = 1e5;
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
    let zNumber = 2;
    let cloudN = 2 * zNumber;

    let fontSize = 20;
    let alphaThreshold = 0.25 * 255;

    let coordList = stringToCoordinates("MICROSCALE", "Arial", fontSize, 0, -fontSize);
    coordList = coordList.concat(stringToCoordinates("PLANET", "Arial", fontSize, 0, 0));
    coordList = coordList.concat(stringToCoordinates("FORMATION 3", "Arial", fontSize, 0, fontSize))

    console.log("coordList.length = " + coordList.length);

    coordList.forEach((value, idx) => {
        let center = new Vector3(r2 * value.x, r2 * (value.y + 2), 0.0);
        if (value.v > alphaThreshold) createNucleiFromList(simulation, nucleusList, cloudList, zNumber, 1, 1, 1, r0, r1, center, vel, cloudN);
    });

    shuffleArray(physics.particleList);

    graphics.showAxis(true, simulation.mode2D, 1e-15 * M, true, '1 fm');

    const cyclesPerMs = (50/1000);
    simulation.addAction({
        cycle: 1 * 1e3 * cyclesPerMs,
        callback: () => {
            caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
            graphics.drawCursor(false);
        }
    });

    simulation.addAction({
        cycle: 5 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('frictionConstant', 1);
            core.updatePhysics('massConstant', 512);
            caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
        }
    });

    simulation.addActionArray(cameraTransition(graphics, 8 * 1e3 * cyclesPerMs, 5 * 1e3 * cyclesPerMs, {x: 0, y: 0, z: 1e5}));

    simulation.addAction({
        cycle: 13 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', physics.massConstant / 2);
            caption(graphics,"Gravity: " + physics.massConstant);
        }
    });

    simulation.addAction({
        cycle: 16 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', physics.massConstant / 2);
            caption(graphics,"Gravity: " + physics.massConstant);
        }
    });

    simulation.addAction({
        cycle: 19 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', physics.massConstant / 2);
            caption(graphics,"Gravity: " + physics.massConstant);
        }
    });

    simulation.addAction({
        cycle: 22 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', physics.massConstant / 2);
            caption(graphics,"Gravity: " + physics.massConstant);
        }
    });

    simulation.addAction({
        cycle: 25 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', physics.massConstant / 2);
            caption(graphics,"Gravity: " + physics.massConstant);
        }
    });

    simulation.addAction({
        cycle: 28 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', physics.massConstant / 2);
            caption(graphics,"Gravity: " + physics.massConstant);
        }
    });

    simulation.addAction({
        cycle: 31 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', physics.massConstant / 2);
            caption(graphics,"Gravity: " + physics.massConstant);
        }
    });

    simulation.addActionArray(cameraTransition(graphics, 34 * 1e3 * cyclesPerMs, 5 * 1e3 * cyclesPerMs, {x: 0, y: 0, z: -1e5}));

    simulation.addAction({
        cycle: 40 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', 0.5);
            caption(graphics,"Gravity: " + physics.massConstant);
        }
    });

    simulation.addAction({
        cycle: 43 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('frictionConstant', 1e-1);
            caption(graphics,"Friction: " + physics.frictionConstant);
        }
    });

    simulation.addAction({
        cycle: 48 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('frictionConstant', 1e-2);
            caption(graphics,"Friction: " + physics.frictionConstant);
        }
    });

    simulation.addAction({
        cycle: 53 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('frictionConstant', 1e-3);
            caption(graphics,"Friction: " + physics.frictionConstant);
        }
    });

    simulation.addActionArray(cameraTransition(graphics, 58 * 1e3 * cyclesPerMs, 5 * 1e3 * cyclesPerMs, {x: 0, y: 0, z: 9e5}));

    simulation.addAction({
        cycle: 65 * 1e3 * cyclesPerMs,
        callback: () => {
            caption(graphics,"The End!");
        }
    });

    simulation.addAction({
        cycle: 1.5 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            simulation.graphics.capture();
        }
    });
}


function planetoidFormation2(simulation) {
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

    graphics.cameraDistance = 1e5;
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
    let zNumber = 2;
    let cloudN = 2 * zNumber;

    let fontSize = 20;
    let alphaThreshold = 0.25 * 255;

    let coordList = stringToCoordinates("MICROSCALE", "Arial", fontSize, 0, -fontSize);
    coordList = coordList.concat(stringToCoordinates("PLANET", "Arial", fontSize, 0, 0));
    coordList = coordList.concat(stringToCoordinates("FORMATION 2", "Arial", fontSize, 0, fontSize))

    console.log("coordList.length = " + coordList.length);

    coordList.forEach((value, idx) => {
        let center = new Vector3(r2 * value.x, r2 * (value.y + 2), 0.0);
        if (value.v > alphaThreshold) createNucleiFromList(simulation, nucleusList, cloudList, zNumber, 1, 1, 1, r0, r1, center, vel, cloudN);
    });

    shuffleArray(physics.particleList);

    graphics.showAxis(true, simulation.mode2D, 1e-15 * M, true, '1 fm');

    const cyclesPerMs = (50/1000);
    simulation.addAction({
        cycle: 3 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('frictionConstant', 1e-3);
            caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
        }
    });

    simulation.addAction({
        cycle: 30 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('frictionConstant', 1e-2);
            caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
        }
    });

    simulation.addAction({
        cycle: 40 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('frictionConstant', 1e-1);
            caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
        }
    });

    simulation.addAction({
        cycle: 50 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('frictionConstant', 1e0);
            caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
        }
    });

    simulation.addAction({
        cycle: 1.0 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', 2 * physics.massConstant);
            caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
        }
    });

    simulation.addAction({
        cycle: 1.1 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', 2 * physics.massConstant);
            caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
        }
    });

    simulation.addAction({
        cycle: 1.2 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', 2 * physics.massConstant);
            caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
        }
    });

    simulation.addAction({
        cycle: 1.3 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', 2 * physics.massConstant);
            caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
        }
    });

    simulation.addAction({
        cycle: 1.4 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', 2 * physics.massConstant);
            caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
        }
    });

    simulation.addAction({
        cycle: 1.5 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', 2 * physics.massConstant);
            caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
        }
    });

    simulation.addAction({
        cycle: 1.6 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', 2 * physics.massConstant);
            caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
        }
    });

    simulation.addAction({
        cycle: 1.7 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', 2 * physics.massConstant);
            caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
        }
    });

    simulation.addAction({
        cycle: 1.8 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', 2 * physics.massConstant);
            caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
        }
    });

    simulation.addAction({
        cycle: 1.9 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', physics.massConstant / 2);
            caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
        }
    });

    simulation.addAction({
        cycle: 2.0 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', physics.massConstant / 2);
            caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
        }
    });

    simulation.addAction({
        cycle: 2.1 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', physics.massConstant / 2);
            caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
        }
    });

    simulation.addAction({
        cycle: 2.2 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', physics.massConstant / 32);
            caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
        }
    });

    simulation.addAction({
        cycle: 2.3 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('frictionConstant', 1e-1);
            caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
        }
    });

    simulation.addAction({
        cycle: 2.4 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('frictionConstant', 1e-2);
            caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
        }
    });

    simulation.addAction({
        cycle: 2.5 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('frictionConstant', 1e-3);
            caption(graphics,"Gravity: " + physics.massConstant + "\nFriction: " + physics.frictionConstant);
        }
    });

    simulation.addActionArray(cameraTransition(graphics, 3.0 * 60 * 1e3 * cyclesPerMs, 5 * 1e3 * cyclesPerMs, {x: 0, y: 0, z: 5e6}));

    simulation.addAction({
        cycle: 3.2 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            simulation.graphics.capture();
            caption(graphics, "Cut!");
        }
    });
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

    graphics.cameraDistance = 1e5;
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
    let zNumber = 2;
    let cloudN = 2 * zNumber;

    let fontSize = 20;
    let alphaThreshold = 0.25 * 255;

    let coordList = stringToCoordinates("MICROSCALE", "Arial", fontSize, 0, -fontSize);
    coordList = coordList.concat(stringToCoordinates("PLANET", "Arial", fontSize, 0, 0));
    coordList = coordList.concat(stringToCoordinates("FORMATION", "Arial", fontSize, 0, fontSize))

    console.log("coordList.length = " + coordList.length);

    coordList.forEach((value, idx) => {
        let center = new Vector3(r2 * value.x, r2 * (value.y + 2), 0.0);
        if (value.v > alphaThreshold) createNucleiFromList(simulation, nucleusList, cloudList, zNumber, 1, 1, 1, r0, r1, center, vel, cloudN);
    });

    shuffleArray(physics.particleList);

    graphics.showAxis(true, simulation.mode2D, 1e-15 * M, true, '1 fm');

    const cyclesPerMs = (60/1000);
    simulation.addAction({
        cycle: 3 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('frictionConstant', 1e-3);
        }
    });

    simulation.addAction({
        cycle: 1.2 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('frictionConstant', 1e-2);
        }
    });

    simulation.addAction({
        cycle: 1.4 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('frictionConstant', 1e-1);
        }
    });

    simulation.addAction({
        cycle: 1.5 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', 2 * physics.massConstant);
        }
    });

    simulation.addAction({
        cycle: 1.6 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', 2 * physics.massConstant);
        }
    });

    simulation.addAction({
        cycle: 1.8 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', 2 * physics.massConstant);
        }
    });

    simulation.addAction({
        cycle: 1.9 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', 2 * physics.massConstant);
        }
    });

    simulation.addAction({
        cycle: 2.1 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', physics.massConstant / 2);
        }
    });

    simulation.addAction({
        cycle: 2.2 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', physics.massConstant / 2);
        }
    });

    simulation.addAction({
        cycle: 2.3 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', physics.massConstant / 2);
        }
    });

    simulation.addAction({
        cycle: 2.4 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('massConstant', physics.massConstant / 2);
        }
    });

    simulation.addAction({
        cycle: 2.5 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            core.updatePhysics('frictionConstant', 1e-3);
        }
    });

    simulation.addActionArray(cameraTransition(graphics, 2.5 * 60 * 1e3 * cyclesPerMs, 5 * 1e3 * cyclesPerMs, {x: 0, y: 0, z: 1e5}));

    simulation.addAction({
        cycle: 3.0 * 60 * 1e3 * cyclesPerMs,
        callback: () => {
            simulation.graphics.capture();
        }
    });
}
