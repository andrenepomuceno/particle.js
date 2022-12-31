import { Vector3 } from 'three';
import { createNuclei, createNucleiFromList, parseElementRatioList, randomVector } from '../scenariosHelpers';
import { createParticles, hexagonGenerator, shuffleArray, cubeGenerator, random } from '../helpers';
import { NuclearPotentialType } from '../physics';
import { calcGridSize, calcAvgMass } from '../scenariosHelpers';

export const quarkModel = [
    fullScaleModel,
    water2,
    miniverse2,
    cosmological,
    //miniverse,
    essentialElements,
    //water,
    air,
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
}

function fullScaleModel(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAXv3;
    physics.useBoxBoundary = true;
    //physics.useDistance1 = true;
    //simulation.mode2D = false;

    const M = (1 / 3) * 1e15;
    const KG = (1 / 9.1093837015) * 1e30;
    const S = 1e27;
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
    physics.forceConstant = 1;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    let r0 = 0.7 * nuclearForceRange;

    let particles = [
        { m: 9.1093837015e-31 * KG, q: -1 * 1.602176634e-19 * C, nq: -1, name: "electron" },
        { m: 5.347988087839e-30 * KG, q: 2 / 3 * 1.602176634e-19 * C, nq: 1, name: "up quark" }, // 3 MeV
        { m: 1.069597617568e-29 * KG, q: -1 / 3 * 1.602176634e-19 * C, nq: 1, name: "down quark" }, // 6 MeV
        /*{ m: 9.1093837015e-31 * kg, q: 1 * 1.602176634e-19 * c, nq: 1, name: "anti electron" },
        { m: 5.347988087839e-30 * kg, q: -2/3 * 1.602176634e-19 * c, nq: -1, name: "anti up quark" },
        { m: 1.069597617568e-29 * kg, q: 1/3 * 1.602176634e-19 * c, nq: -1, name: "anti down quark" },*/
    ];

    let options = {
        //m: 1, q: 1, nq: 1,
        r0: 0, r1: r0,
        randomSequence: true,
        randomQSignal: false,
        randomNQSignal: false,
        v1: 1e-3,
    };
    createParticles(simulation, particles, -Math.round(80 * 80 * 9 / 16) + graphics.maxParticles, options);

    graphics.showAxis(true, simulation.mode2D, 1e-12 * M);
}

function water2(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAX;
    physics.useBoxBoundary = true;
    //physics.useDistance1 = true;
    simulation.mode2D = true;

    const m = 1e1 * 1e18;
    const kg = (1 / 9.1093837015) * 1e30; // kilogram, quantum mass
    const s = 1e-2 * 1e27; // second, quantum time
    const c = (1 / 1.602176634) * 1e18; // attocoulomb
    const nuclearForceRange = 1e-15 * m;

    const nq = 1.0;
    const v = 1e-3;

    physics.nuclearForceRange = 10 * nuclearForceRange;
    physics.boundaryDistance = 50 * physics.nuclearForceRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 5.0 * physics.nuclearForceRange;
    graphics.cameraSetup();
    simulation.particleRadius = 0.04 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.2 * simulation.particleRadius;

    physics.massConstant = 6.6743e-11 * kg ** -1 * m ** 3 * s ** -2;
    physics.chargeConstant = 8.988e9 * kg ** 1 * m ** 3 * s ** -2 * c ** -2;
    physics.nuclearForceConstant = 25e3 * kg * m * s ** -2;
    physics.forceConstant = 1 / 3;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    let r0 = 0.01 * physics.nuclearForceRange;
    let r1 = 0.5 * physics.nuclearForceRange;
    let r2 = 0.333 * physics.nuclearForceRange;

    let gridSize = calcGridSize(graphics, 7 * (8 + 2 * 1));

    let nucleusTypes = [
        { m: 5.347988087839e-30 * kg, q: 2 / 3 * 1.602176634e-19 * c, nq: 1, name: "quark up" }, // 3 MeV
        { m: 1.069597617568e-29 * kg, q: -1 / 3 * 1.602176634e-19 * c, nq: 1, name: "quark down" }, // 6 MeV
    ];
    let cloudTypes = [
        { m: 9.1093837015e-31 * kg, q: -1.602176634e-19 * c, nq: -1, name: "electron" },
    ];

    let index = 0;
    let offset = new Vector3(r2, 0, 0);
    cubeGenerator((x, y, z) => {
        let zNumber = 1;

        let snq = nq * ((random(0, 1) >= 0.1) ? (1) : (-1));
        //let snq = nq * (index % 2) ? (1) : (-1);
        let center = new Vector3(x, -y, z);

        zNumber = 8;
        createNucleiFromList(simulation, nucleusTypes, cloudTypes, 3 * zNumber, 1.0, 1.0, snq, r0, r1, center, v, zNumber);

        zNumber = 1;
        createNucleiFromList(simulation, nucleusTypes, cloudTypes, 3 * zNumber, 1.0, 1.0, -snq, r0, r1, center.clone().add(offset), v, zNumber);
        createNucleiFromList(simulation, nucleusTypes, cloudTypes, 3 * zNumber, 1.0, 1.0, -snq, r0, r1, center.clone().sub(offset), v, zNumber);

        index++;
    }, 8.0 * r2 * gridSize[0], gridSize);
    shuffleArray(physics.particleList);
}

function miniverse2(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAXv3;
    //physics.useBoxBoundary = true;
    //physics.useDistance1 = true;
    simulation.mode2D = false;

    const m = 1 * 1e19;
    const kg = 1.0 * (1 / 9.1093837015) * 1e30; // kilogram, quantum mass
    const s = 1e26;
    const c = 100.0 * (1 / 1.602176634) * 1e19; // attocoulomb
    const nuclearForceRange = 1e-15 * m;

    physics.nuclearForceRange = nuclearForceRange;
    physics.boundaryDistance = 1e5 * physics.nuclearForceRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 1e2 * physics.nuclearForceRange;
    graphics.cameraSetup();
    simulation.particleRadius = 0.25 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.2 * simulation.particleRadius;

    physics.massConstant = 1e39 * 6.6743e-11 * kg ** -1 * m ** 3 * s ** -2;
    physics.chargeConstant = 8.988e9 * kg ** 1 * m ** 3 * s ** -2 * c ** -2;
    physics.nuclearForceConstant = 25e3 * kg * m * s ** -2; // fine structure
    physics.forceConstant = 1 / 3;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    let r0 = 1e0 * nuclearForceRange;

    let particles = [
        { m: 5.347988087839e-30 * kg, q: 2 / 3 * 1.602176634e-19 * c, nq: 1, name: "quark up" }, // 3 MeV
        { m: 1.069597617568e-29 * kg, q: -1 / 3 * 1.602176634e-19 * c, nq: 1, name: "quark down" }, // 6 MeV
        { m: 9.1093837015e-31 * kg, q: -1.602176634e-19 * c, nq: -1, name: "electron" },
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

    physics.nuclearPotential = NuclearPotentialType.potential_powAXv3;
    //physics.useBoxBoundary = true;
    physics.useDistance1 = true;
    //simulation.mode2D = false;

    const m = 1e-15;
    const kg = 1e-36;
    const s = 1e-9;
    const c = 1e-27;

    physics.nuclearForceRange = 1e3;
    physics.boundaryDistance = 1e5 * physics.nuclearForceRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 1e2 * physics.nuclearForceRange;
    graphics.cameraSetup();
    simulation.particleRadius = 0.25 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.2 * simulation.particleRadius;

    physics.massConstant = 6.6743e-11 * kg ** -1 * m ** 3 * s ** -2;
    physics.chargeConstant = 8.988e9 * kg ** 1 * m ** 3 * s ** -2 * c ** -2;
    physics.nuclearForceConstant = 1;//25e3 * kg * m * s**-2;
    physics.forceConstant = 1 / 3;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    let r0 = 1;

    let particles = [
        { m: 1, q: 1, nq: 1 },
    ];

    let options = {
        m: 1, q: 1, nq: 1,
        r0: 0, r1: r0,
        //randomSequence: true,
        randomM: true,
        //randomMSignal: true,
        randomQ: true,
        randomQSignal: true,
        randomNQ: true,
        randomNQSignal: true,
        v1: 1e-6,
    };
    createParticles(simulation, particles, graphics.maxParticles, options);
}

function miniverse(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAXv3;
    //physics.useBoxBoundary = true;
    physics.useDistance1 = true;
    simulation.mode2D = false;

    const m = 1 * 1e18;
    const kg = 1.0 * (1 / 9.1093837015) * 1e30; // kilogram, quantum mass
    const s = 1e27;
    const c = 100.0 * (1 / 1.602176634) * 1e18; // attocoulomb
    const nuclearForceRange = 1e-15 * m;

    physics.nuclearForceRange = nuclearForceRange;
    physics.boundaryDistance = 1e5 * physics.nuclearForceRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 1e2 * physics.nuclearForceRange;
    graphics.cameraSetup();
    simulation.particleRadius = 0.25 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.2 * simulation.particleRadius;

    physics.massConstant = 1e39 * 6.6743e-11 * kg ** -1 * m ** 3 * s ** -2;
    physics.chargeConstant = 8.988e9 * kg ** 1 * m ** 3 * s ** -2 * c ** -2;
    physics.nuclearForceConstant = 1e2 * 25e3 * kg * m * s ** -2; // fine structure
    physics.forceConstant = 1 / 3;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    let r0 = 1;

    let particles = [
        { m: 5.347988087839e-30 * kg, q: 2 / 3 * 1.602176634e-19 * c, nq: 1, name: "quark up" }, // 3 MeV
        { m: 1.069597617568e-29 * kg, q: -1 / 3 * 1.602176634e-19 * c, nq: 1, name: "quark down" }, // 6 MeV
        { m: 9.1093837015e-31 * kg, q: -1.602176634e-19 * c, nq: -1, name: "electron" },
    ];

    let options = {
        m: 1, q: 1, nq: 1,
        r0: 0, r1: r0,
        randomSequence: true,
        randomQSignal: true,
        randomNQSignal: true,
        v1: 1e-6,
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

    const m = 1 * 1e18; // attometer
    const kg = 1.0 * (1 / 9.1093837015) * 1e30; // kilogram, quantum mass
    const s = 1e27; // second, quantum time
    const c = 100.0 * (1 / 1.602176634) * 1e18; // attocoulomb
    const nuclearForceRange = 1e-15 * m;

    const nq = 1.0;
    const v = 1.0;

    physics.nuclearForceRange = nuclearForceRange;
    physics.boundaryDistance = 16 * physics.nuclearForceRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 15.0 * physics.nuclearForceRange;
    graphics.cameraSetup();
    simulation.particleRadius = 0.04 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.2 * simulation.particleRadius;

    physics.massConstant = 6.6743e-11 * kg ** -1 * m ** 3 * s ** -2;
    physics.chargeConstant = 8.988e9 * kg ** 1 * m ** 3 * s ** -2 * c ** -2;
    physics.nuclearForceConstant = (1 / 7); // fine structure
    physics.forceConstant = 1;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    let r0 = 0.05 * physics.nuclearForceRange;
    let r1 = 0.5 * physics.nuclearForceRange;
    let r2 = 0.493 * physics.nuclearForceRange;

    let nucleusTypes = [
        { m: 5.347988087839e-30 * kg, q: 2 / 3 * 1.602176634e-19 * c, nq: 1, name: "quark up" }, // 3 MeV
        { m: 1.069597617568e-29 * kg, q: -1 / 3 * 1.602176634e-19 * c, nq: 1, name: "quark down" }, // 6 MeV
    ];
    let cloudTypes = [
        { m: 9.1093837015e-31 * kg, q: -1.602176634e-19 * c, nq: -1, name: "electron" },
    ];
    let elementsRatios = [
        { r: 100, n: 1, name: "H" },
        { r: 30, n: 6, name: "C" },
        { r: 30, n: 7, name: "N" },
        { r: 10, n: 8, name: "O" },
        { r: 1, n: 12, name: "Mg" },
        { r: 1, n: 15, name: "P" },
        { r: 1, n: 16, name: "S" },
        { r: 1, n: 26, name: "Fe" },
        { r: 1, n: 29, name: "Cu" },
        { r: 1, n: 30, name: "Zn" },
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
}

function water(simulation) {
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
    physics.boundaryDistance = 20 * physics.nuclearForceRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 15.0 * physics.nuclearForceRange;
    graphics.cameraSetup();
    simulation.particleRadius = 0.04 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.2 * simulation.particleRadius;

    physics.massConstant = 6.6743e-11 * kg ** -1 * m ** 3 * s ** -2;
    physics.chargeConstant = 8.988e9 * kg ** 1 * m ** 3 * s ** -2 * c ** -2;
    physics.nuclearForceConstant = 1.0;
    physics.forceConstant = 1 / 3;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    let r0 = 0.01 * physics.nuclearForceRange;
    let r1 = 0.5 * physics.nuclearForceRange;
    let r2 = 0.493 * physics.nuclearForceRange;

    let gridSize = calcGridSize(graphics, 7 * 5);

    let nucleusTypes = [
        { m: 5.347988087839e-30 * kg, q: 2 / 3 * 1.602176634e-19 * c, nq: 1, name: "quark up" }, // 3 MeV
        { m: 1.069597617568e-29 * kg, q: -1 / 3 * 1.602176634e-19 * c, nq: 1, name: "quark down" }, // 6 MeV
    ];
    let cloudTypes = [
        { m: 9.1093837015e-31 * kg, q: -1.602176634e-19 * c, nq: -1, name: "electron" },
    ];

    let elementsRatios = [
        { r: 3, n: 1, name: "H" },
        { r: 1, n: 8, name: "O" },
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
    }, 2.5 * r2 * gridSize[0], gridSize);
    shuffleArray(physics.particleList);

    console.log(eleHistogram);
    let total = 0;
    eleHistogram.forEach(v => {
        total += v.count;
    });
    console.log(total);
}

function air(simulation) {
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
    physics.boundaryDistance = 20 * physics.nuclearForceRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 15.0 * physics.nuclearForceRange;
    graphics.cameraSetup();
    simulation.particleRadius = 0.04 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.2 * simulation.particleRadius;

    physics.massConstant = 6.6743e-11 * kg ** -1 * m ** 3 * s ** -2;
    physics.chargeConstant = 8.988e9 * kg ** 1 * m ** 3 * s ** -2 * c ** -2;
    physics.nuclearForceConstant = 1.0;
    physics.forceConstant = 1 / 3;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    let r0 = 0.05 * physics.nuclearForceRange;
    let r1 = 0.5 * physics.nuclearForceRange;
    let r2 = 0.493 * physics.nuclearForceRange;

    let gridSize = calcGridSize(graphics, 7 * 8);

    let nucleusTypes = [
        { m: 5.347988087839e-30 * kg, q: 2 / 3 * 1.602176634e-19 * c, nq: 1, name: "quark up" }, // 3 MeV
        { m: 1.069597617568e-29 * kg, q: -1 / 3 * 1.602176634e-19 * c, nq: 1, name: "quark down" }, // 6 MeV
    ];
    let cloudTypes = [
        { m: 9.1093837015e-31 * kg, q: -1.602176634e-19 * c, nq: -1, name: "electron" },
    ];

    let elementsRatios = [
        { r: 2 * 78.084, n: 7, name: "N2" }, // N2
        { r: 2 * 20.946, n: 8, name: "O2" }, // O2
        { r: 0.9340, n: 33, name: "Ar" }, // Ar
        // CO2
        { r: 0.0417, n: 6, name: "C (CO2)" }, // C
        { r: 2 * 0.0417, n: 8, name: "O2 (CO2)" }, // O2
        { r: 0.001818, n: 10, name: "Ne" }, // Ne
        { r: 0.000524, n: 2, name: "He" }, // He
        // CH4
        { r: 0.0417, n: 6, name: "C (CH4)" }, // C
        { r: 4 * 0.0417, n: 1, name: "H4 (CH4)" }, // H4
        { r: 0.000114, n: 36, name: "Kr" }, // Kr
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
    }, 3 * r2 * gridSize[0], gridSize);
    shuffleArray(physics.particleList);

    console.log(eleHistogram);
    let total = 0;
    eleHistogram.forEach(v => {
        total += v.count;
    });
    console.log(total);
}
