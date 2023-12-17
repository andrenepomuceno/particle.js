import { Vector3 } from 'three';
import { createNuclei, createNucleiFromList, createParticle, createParticlesList, parseElementRatioList, randomVector } from '../scenariosHelpers';
import { createParticles, hexagonGenerator, shuffleArray, cubeGenerator, random } from '../helpers';
import { FrictionModel, NuclearPotentialType } from '../physics';
import { calcGridSize, calcAvgMass } from '../scenariosHelpers';
import { core } from '../core';

export const forceMap = [
    //welcome,
    hexagonalCrystal,
];

function stringToCoordinates(text, font = "Arial", fontSize = 16, x0 = 0, y0 = 0, center = true) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    ctx.font = `${fontSize}px ${font}`;
    const width = ctx.measureText(text).width;
    canvas.width = width;
    canvas.height = 1.25 * fontSize;

    ctx.font = `${fontSize}px ${font}`;
    ctx.fillText(text, 0, fontSize);

    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const coordinates = [];
    const data = img.data;

    let xOffset = 0;
    let yOffset = 0;
    if (center) {
        xOffset = Math.round(img.width/2);
        yOffset = Math.round(img.height/2);
    }

    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            const pixelIndex = (y * img.width + x) * 4;
            let alpha = data[pixelIndex + 3];
            if (alpha > 0) {
                coordinates.push({ x: x + x0 - xOffset, y: -(y + y0 - yOffset), v: alpha });
            }
        }
    }

    return coordinates;
}

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

    /*let center = new Vector3(0,0,0);
    createNucleiFromList(simulation, nucleusList, cloudList, zNumber, 1, 1, 1, r0, r1, center, vel, cloudN);*/

    shuffleArray(physics.particleList);

    graphics.showAxis(true, simulation.mode2D, 1e-15 * M, true, '1 fm');

    /*let futureAction = new Promise(resolve => setTimeout(resolve, 2000)).then(() => {
        core.deleteAll();

        let coordList = stringToCoordinates("Press", "Arial", fontSize, 0, -fontSize);
        coordList = coordList.concat(stringToCoordinates("Page Down", "Arial", fontSize, 0, 0));
        coordList = coordList.concat(stringToCoordinates("Page Up", "Arial", fontSize, 0, fontSize))

        console.log("coordList.length = " + coordList.length);

        coordList.forEach((value, idx) => {
            let center = new Vector3(r2 * value.x, r2 * (value.y + 2), 0.0);
            if (value.v > alphaThreshold) createNucleiFromList(simulation, nucleusList, cloudList, zNumber, 1, 1, 1, r0, r1, center, vel, cloudN);    
        });

        simulation.particleList = simulation.physics.particleList;
        simulation.drawParticles();

        //console.log(simulation); 
    });*/
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

