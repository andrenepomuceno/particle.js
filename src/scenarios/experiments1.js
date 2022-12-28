import { Vector3 } from 'three';
import { createNuclei } from './helpers';
import { createParticles, hexagonGenerator, shuffleArray, cubeGenerator, random } from '../helpers';
import { NuclearPotentialType } from '../physics';

export const experiments1 = [
    air,
    realScaledConstants0,
    randomElements,
    periodicTable,
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

function air(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAX;
    physics.useBoxBoundary = true;
    physics.useDistance1 = true;
    simulation.mode2D = true;

    const m = 1 * 1e18; // meters
    const kg = 1.0 * (1 / 9.1093837015) * 1e30; // kilogram
    const s = 1e27; // second
    const c = 100.0 * (1 / 1.602176634) * 1e18; // coulomb
    const nuclearForceRange = 1e-15 * m;
    const nq = 20.0;
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
    physics.forceConstant = 1 / 3;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    let r0 = 0.05 * physics.nuclearForceRange;
    let r1 = 0.5 * physics.nuclearForceRange;
    let r2 = 0.493 * physics.nuclearForceRange;

    let gridSize = [11, 11, 1];
    if (!ENV?.production) gridSize = [41, 31, 1];

    simulation.field.probeConfig(0, 1e3, 0);
    //if (!ENV?.production) simulation.field.setup("2d", 50);

    let nucleusTypes = [
        { m: 1.67262192e-27 * kg, q: 1.602176634e-19 * c, nq: 1 },
        { m: 1.67492749e-27 * kg, q: 0, nq: 1 },
    ];
    let cloudTypes = [
        { m: 9.1093837015e-31 * kg, q: -1.602176634e-19 * c, nq: -1 / 60 },
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

    let ratios = [
        { r: 2 * 78.084, n: 7, name: "N2"}, // N2
        { r: 2 * 20.946, n: 8, name: "O2" }, // O2
        { r: 0.9340, n: 33, name: "Ar" }, // Ar
        // CO2
        { r: 0.0417, n: 6, name: "CO2 C" }, // C
        { r: 2 * 0.0417, n: 8, name: "CO2 O2" }, // O2
        { r: 0.001818, n: 10, name: "Ne" }, // Ne
        { r: 0.000524, n: 2, name: "He" }, // He
        // CH4
        { r: 0.0417, n: 6, name: "CH4 C" }, // C
        { r: 4 * 0.0417, n: 1, name: "CH4 H4" }, // H4
        { r: 0.000114, n: 36, name: "Kr" }, // Kr
    ].sort((a, b) => {
        return a.r > b.r;
    });
    let ratioMax = 0.0;
    ratios.forEach(v => {
        if (v.r > ratioMax) ratioMax = v.r;
    })
    ratios.forEach((v, i) => {
        ratios[i].r /= ratioMax;
    })
    console.log(ratios);

    let histogram = new Map();
    let index = 0;
    cubeGenerator((x, y, z) => {
        //let snq = nq * ((random(0, 1) >= 0.5) ? (1) : (-1));
        let snq = nq * (index % 2) ? (1) : (-1);
        let center = new Vector3(x, -y, z);
        let rRatio = random(0, 1);
        let n;
        for (let i = 0; i < ratios.length; ++i) {
            if (rRatio < ratios[i].r) {
                let element = ratios[i];
                n = element.n;

                if (histogram.has(element.name)) {
                    histogram.get(element.name).count++;
                } else {
                    histogram.set(element.name, {
                        count: 1
                    });
                }

                //console.log(ratios[i].name);
                break;
            }
        }

        createNucleiFromList(simulation, nucleusTypes, cloudTypes, n, 1.0, 1.0, snq, r0, r1, center, v);
        index++;
    }, 1.0 * r2 * gridSize[0], gridSize);
    shuffleArray(physics.particleList);
    console.log(histogram);
}

function realScaledConstants0(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAX;
    physics.useBoxBoundary = true;
    physics.useDistance1 = true;
    simulation.mode2D = true;

    const m = 1 * 1e18; // meter
    const kg = 1.0 * (1 / 9.1093837015) * 1e30; // kilogram
    const s = 1e27; // second
    const c = 100.0 * (1 / 1.602176634) * 1e18; // coulomb
    const nuclearForceRange = 1e-15 * m;
    const nq = 20.0;
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
    physics.forceConstant = 1 / 3;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    let r0 = 0.05 * physics.nuclearForceRange;
    let r1 = 0.5 * physics.nuclearForceRange;
    let r2 = 0.493 * physics.nuclearForceRange;

    let gridSize = [11, 11, 1];
    if (!ENV?.production) gridSize = [21, 21, 1];

    simulation.field.probeConfig(0, 1e3, 0);
    //if (!ENV?.production) simulation.field.setup("2d", 50);

    let nucleusTypes = [
        { m: 1.67262192e-27 * kg, q: 1.602176634e-19 * c, nq: 1 },
        { m: 1.67492749e-27 * kg, q: 0, nq: 1 },
    ];
    let cloudTypes = [
        { m: 9.1093837015e-31 * kg, q: -1.602176634e-19 * c, nq: -1 / 60 },
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
    }, 1.0 * r2 * gridSize[0], gridSize);
    shuffleArray(physics.particleList);
}

function randomElements(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAX;
    physics.useBoxBoundary = true;
    physics.useDistance1 = true;
    simulation.mode2D = true;

    physics.nuclearForceRange = 1e4;
    physics.boundaryDistance = 25 * physics.nuclearForceRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 20.0 * physics.nuclearForceRange;
    graphics.cameraSetup();
    simulation.particleRadius = 0.04 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.2 * simulation.particleRadius;

    physics.forceConstant = 1;
    physics.massConstant = 1e-6;
    physics.chargeConstant = 1;
    physics.nuclearForceConstant = 1;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    simulation.field.probeConfig(0, 1e3, 0);
    //if (!ENV?.production) simulation.field.setup("2d", 50);

    let nucleusTypes = [
        { m: 1.007276466583, q: 1, nq: 1 },
        { m: 1.00866491588, q: 0, nq: 1 },
    ];
    let cloudTypes = [
        { m: 5.48579909065e-4, q: -1, nq: -1 / 137 },
    ];

    const m = 1e-2 / cloudTypes[0].m;
    const q = 1;
    const nq = 1;
    const v = 1.0;

    let r0 = 0.01 * physics.nuclearForceRange;
    let r1 = 0.5 * physics.nuclearForceRange;
    let r2 = 0.493 * physics.nuclearForceRange;

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

    let gridSize = [7, 7, 1];
    if (!ENV?.production) gridSize = [15, 10, 1];

    cubeGenerator((x, y, z) => {
        let snq = nq * ((random(0, 1) >= 0.5) ? (1) : (-1));
        let center = new Vector3(x, y, z);
        let n = random(1, 64, true);
        createNucleiFromList(simulation, nucleusTypes, cloudTypes, n, m, q, snq, r0, r1, center, v);
        n++;
    }, 4 * r2 * gridSize[0], gridSize);
    shuffleArray(physics.particleList);
}

function periodicTable(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAX;
    physics.useBoxBoundary = true;
    //physics.useDistance1 = true;
    simulation.mode2D = true;

    physics.nuclearForceRange = 1e4;
    physics.boundaryDistance = 50 * physics.nuclearForceRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 20.0 * physics.nuclearForceRange;
    graphics.cameraSetup();
    simulation.particleRadius = 0.04 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.2 * simulation.particleRadius;

    physics.forceConstant = 1;
    physics.massConstant = 1e-9;
    physics.chargeConstant = 1e-2;
    physics.nuclearForceConstant = 1;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    simulation.field.probeConfig(0, 1e3, 0);
    //if (!ENV?.production) simulation.field.setup("2d", 50);

    let nucleusTypes = [
        { m: 1.007276466583, q: 1, nq: 1 },
        { m: 1.00866491588, q: 0, nq: 1 },
    ];
    let cloudTypes = [
        { m: 5.48579909065e-4, q: -1, nq: -1 / 137 },
    ];

    let n = 1;
    const m = 1e-3 / cloudTypes[0].m;
    const q = 1;
    const nq = 1;
    const v = 1.0;

    let r0 = 0.01 * physics.nuclearForceRange;
    let r1 = 0.5 * physics.nuclearForceRange;
    let r2 = 0.493 * physics.nuclearForceRange;
    let size = Math.round(Math.sqrt(graphics.maxParticles / (10 * n)));
    if (size % 2 == 0) size -= 1;
    console.log("size = " + size);

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

    let gridSize = [7, 7, 1];
    if (!ENV?.production) gridSize = [12, 10, 1];

    cubeGenerator((x, y, z) => {
        //let s = ((n % 2 == 0) ? (1) : (-1));
        let s = ((random(0, 1) >= 0.5) ? (1) : (-1));
        let center = new Vector3(x, -y, z);
        createNucleiFromList(simulation, nucleusTypes, cloudTypes, n, m, q, s * nq, r0, r1, center, v);
        n++;
    }, 6 * r2 * gridSize[0], gridSize);
    shuffleArray(physics.particleList);
}

function electronProtonNeutron(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAX;
    physics.useBoxBoundary = true;
    physics.useDistance1 = true;
    simulation.mode2D = true;

    physics.nuclearForceRange = 1e3;
    physics.boundaryDistance = 50 * physics.nuclearForceRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 10.0 * physics.nuclearForceRange;
    graphics.cameraSetup();
    simulation.particleRadius = 0.04 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.2 * simulation.particleRadius;

    physics.forceConstant = 1;
    physics.massConstant = 1e-9;
    physics.chargeConstant = 1;
    physics.nuclearForceConstant = 1;
    physics.minDistance2 = Math.pow(2 * 0.001 * physics.nuclearForceRange, 2);

    simulation.field.probeConfig(0, 1e3, 0);
    //if (!ENV?.production) simulation.field.setup("2d", 50);

    let nucleusTypes = [
        { m: 1.007276466583, q: 1, nq: 1 },
        { m: 1.00866491588, q: 0, nq: 1 },
    ];
    let cloudTypes = [
        { m: 5.48579909065e-4, q: -1, nq: -1 / 137 },
    ];

    const n = 6;
    const m = 1e-2 / cloudTypes[0].m;
    const q = 1;
    const nq = 1;
    const v = 1.0;

    let r0 = 0.1 * physics.nuclearForceRange;
    let r1 = 0.5 * physics.nuclearForceRange;
    let r2 = 0.493 * physics.nuclearForceRange;
    let size = Math.round(Math.sqrt(graphics.maxParticles / (10 * n)));
    if (size % 2 == 0) size -= 1;
    console.log("size = " + size);

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

    const gridSize = [1.3 * size, 0.7 * size];
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

    physics.nuclearForceRange = 1e6;
    physics.boundaryDistance = 50 * physics.nuclearForceRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 0.6 * physics.nuclearForceRange;
    simulation.particleRadius = 0.001 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.25 * simulation.particleRadius;

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-6;
    physics.chargeConstant = 1e-2;
    physics.nuclearForceConstant = 1;
    physics.minDistance2 = Math.pow(1 / 10, 2);

    let particleTypes = [
        { m: 256, q: 16, nq: 1 }
    ]
    createParticles(simulation, particleTypes, graphics.maxParticles, {
        r1: 1.0,//2.0 * physics.nuclearForceRange
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

    physics.nuclearForceRange = 1e3;
    physics.boundaryDistance = 50 * physics.nuclearForceRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 10 * physics.nuclearForceRange;
    simulation.particleRadius = 0.05 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.49 * simulation.particleRadius;

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1;
    physics.nuclearForceConstant = 1;

    const n = 2;
    const m = 1;
    const q = 1;
    const nq = 1;
    const v = 0;

    let r0 = 0.05 * physics.nuclearForceRange;
    let r1 = 0.5 * physics.nuclearForceRange;
    let r2 = 0.493 * physics.nuclearForceRange;

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

    physics.nuclearForceRange = 1e3;
    physics.boundaryDistance = 50 * physics.nuclearForceRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 10 * physics.nuclearForceRange;
    simulation.particleRadius = 0.05 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.49 * simulation.particleRadius;

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1;
    physics.nuclearForceConstant = 1;

    const n = 2;
    const m = 1;
    const q = 1;
    const nq = 1;
    const v = 0;

    const r0 = physics.nuclearForceRange * 0.01;
    const r1 = physics.nuclearForceRange * 0.50;

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

    physics.nuclearForceRange = 1e4;
    physics.boundaryDistance = 25 * physics.nuclearForceRange;
    physics.boundaryDamping = 0.9;
    graphics.cameraDistance = 10 * physics.nuclearForceRange;
    simulation.particleRadius = 0.01 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.5 * simulation.particleRadius;

    physics.forceConstant = 1.0;
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

function standardModel2(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    physics.nuclearPotential = NuclearPotentialType.potential_powAX;
    simulation.mode2D = true;

    physics.boundaryDistance = 1e8;

    physics.nuclearForceRange = 1e6;
    graphics.cameraDistance = 3 * physics.nuclearForceRange;
    simulation.particleRadius = 0.01 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.5 * simulation.particleRadius;

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1;
    physics.nuclearForceConstant = 1;

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

    physics.nuclearForceRange = 1e6;
    graphics.cameraDistance = 5 * physics.nuclearForceRange;
    simulation.particleRadius = 0.01 * physics.nuclearForceRange;
    simulation.particleRadiusRange = 0.5 * simulation.particleRadius;

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1;
    physics.nuclearForceConstant = 1;

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

    physics.nuclearForceRange = 1e4;
    simulation.particleRadius = 0.01 * physics.nuclearForceRange;

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1 / 60;
    physics.nuclearForceConstant = 1;

    let particleTypes = [
        { m: 0.5, q: -1, nq: 1 },
        { m: 3, q: 2 / 3, nq: 1 },
        { m: 6, q: -1 / 3, nq: 1 },
    ]
    createParticles(simulation, particleTypes, graphics.maxParticles);
    //drawGrid(simulation);
}