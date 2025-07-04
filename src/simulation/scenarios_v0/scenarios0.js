import { Vector3 } from 'three';
import { random, randomSpheric } from '../helpers.js'
import { Particle, ParticleType } from '../particle';

let particleList = undefined;

export const scenarios0 = [
    {
        name: 'Simulation 0',
        callback: simulation0
    },
    {
        name: 'Simulation 1',
        callback: simulation1
    },
    {
        name: 'Grid 3D',
        callback: simulationGrid3D
    },
    {
        name: 'Spheres',
        callback: simulationSpheres
    }
];

function createParticle__(mass = 1, charge = 0, position = new Vector3(), velocity = new Vector3(), fixed = false) {
    let p = new Particle();
    p.mass = mass;
    p.charge = charge;
    p.position.add(position);
    p.velocity.add(velocity);
    if (fixed) p.type = ParticleType.fixed;
    particleList.push(p);
}

function createParticles__(particles, [m1, m2], [q1, q2], positionGenerator, center = new Vector3(), velocity = new Vector3()) {
    for (var i = 0; i < particles; ++i) {
        let [x, y, z] = positionGenerator();
        let position = new Vector3(x, y, z);
        position.add(center);
        createParticle__(
            Math.round(random(m1, m2)),
            Math.round(random(q1, q2)),
            position,
            velocity
        );
    }
}

function createParticlesSphere(particles, r1, r2, massRange, chargeRange, center, velocity, mode = 0) {
    createParticles__(particles, massRange, chargeRange, (x, y, z) => randomSpheric(r1, r2, mode), center, velocity);
}

function simulationAtom(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

    graphics.cameraDistance = 500;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    /*const eMass = 9.1093837015e-31;
    const pMass = 1.67262192369e-27;
    const nMass = 1.67492749804e-27;*/

    physics.timeStep = 1;
    physics.massConstant =5e-2;
    physics.chargeConstant = 100;
    let massRange = [1, 1839];
    let chargeRange = [-1, 1];

    let r = 10;
    let vy = 6;
    let vx = 0;

    createParticles__(1, [1839, 1839], [0, 0], () => {
        let pos = randomSpheric(0, r);
        //return [pos[0], pos[1], pos[2]];
        return [r, 0, 0];
    }, new Vector3(), new Vector3(-vx, vy, 0));

    createParticles__(1, [1836, 1836], [1, 1], () => {
        let pos = randomSpheric(0, r);
        //return [pos[0], pos[1], pos[2]];
        return [-r, 0, 0];
    }, new Vector3(), new Vector3(vx, -vy, 0));

    let re = 1024;
    createParticles__(512, [1, 1], [-1, -1], () => {
        let pos = randomSpheric(0, re);
        return [pos[0], pos[1], pos[2]];
        //return [r, 0, 0];
    }, new Vector3(), new Vector3());
}

function simulation0(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

    physics.useDistance1 = true;

    graphics.cameraDistance = 5000;

    physics.massConstant = 1;
    physics.chargeConstant = 1;
    let massRange = [1, 2];
    let chargeRange = [-1, 1];

    const initialParticles = 1024;
    const radiusRange = 512;

    createParticlesSphere(initialParticles, 0, radiusRange, massRange, chargeRange, new Vector3(), new Vector3());
}

function simulation1(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

    physics.useDistance1 = true;

    graphics.cameraDistance = 4000;
    physics.massConstant = 1;
    physics.chargeConstant = 1;
    let massRange = [1, 1];
    let chargeRange = [-1, 1];

    const initialParticles = Math.round(1024 / 2);
    const radiusRange = 32;
    const x = 500;
    const y = x;
    const v = 16;

    createParticlesSphere(initialParticles, 0, radiusRange, massRange, chargeRange, new Vector3(x, y, 0), new Vector3(-v, 0, 0));
    createParticlesSphere(initialParticles, 0, radiusRange, massRange, chargeRange, new Vector3(-x, -y, 0), new Vector3(v, 0, 0));
}

function simulationGrid2D(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

    physics.useDistance1 = true;

    graphics.cameraDistance = 5000
    graphics.cameraPhi = 0; graphics.cameraTheta = 0;
    physics.massConstant = 1 / 100;
    physics.chargeConstant = 1;
    let massRange = [1, 5];
    let chargeRange = [-1, 1];

    const gridSize = 16;
    const spacing = 128;
    const initialParticles = Math.round(1024 / gridSize / gridSize);
    const radiusRange = 8;

    for (let i = 0; i < gridSize; ++i) {
        let cx = i - gridSize / 2 + 0.5;
        cx *= spacing;
        for (let j = 0; j < gridSize; ++j) {
            let cy = j - gridSize / 2 + 0.5;
            cy *= spacing;
            createParticlesSphere(initialParticles, 0, radiusRange, massRange, chargeRange, new Vector3(cx, cy, 0), new Vector3());
        }
    }
}

function simulationGrid3D(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

    physics.useDistance1 = true;

    graphics.cameraDistance = 3000;
    graphics.cameraPhi = 30; graphics.cameraTheta = 45;
    physics.massConstant = 1 / 10;
    physics.chargeConstant = 1;
    let massRange = [1, 8];
    let chargeRange = [-8, 8];

    const gridSize = 4;
    const spacing = 400;
    const initialParticles = Math.round(1024 / gridSize / gridSize / gridSize);
    const radiusRange = 32;

    for (let i = 0; i < gridSize; ++i) {
        let cx = i - gridSize / 2 + 0.5;
        cx *= spacing;
        for (let j = 0; j < gridSize; ++j) {
            let cy = j - gridSize / 2 + 0.5;
            cy *= spacing;
            for (let k = 0; k < gridSize; ++k) {
                let cz = k - gridSize / 2 + 0.5;
                cz *= spacing;
                createParticlesSphere(initialParticles, 0, radiusRange, massRange, chargeRange, new Vector3(cx, cy, cz), new Vector3());
            }
        }
    }
}

function simulationCross(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

    physics.useDistance1 = true;

    graphics.cameraDistance = 5000;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    physics.timeStep = 5;
    physics.massConstant = 1;
    physics.chargeConstant = 1;
    let massRange = [1, 9];
    let chargeRange = [-3, 3];

    const initialParticles = Math.round(1024 / 6);
    const radiusRange = 128;
    const space = 700;
    const v = 2;

    createParticlesSphere(initialParticles, 0, radiusRange, massRange, chargeRange, new Vector3(), new Vector3());
    createParticlesSphere(initialParticles, 0, radiusRange, massRange, chargeRange, new Vector3(space, 0, 0), new Vector3(0, -v, 0));
    createParticlesSphere(initialParticles, 0, radiusRange, massRange, chargeRange, new Vector3(0, space, 0), new Vector3(v, 0, 0));
    createParticlesSphere(initialParticles, 0, radiusRange, massRange, chargeRange, new Vector3(-space, 0, 0), new Vector3(0, v, 0));
    createParticlesSphere(initialParticles, 0, radiusRange, massRange, chargeRange, new Vector3(0, -space, 0), new Vector3(-v, 0, 0));
    createParticlesSphere(initialParticles, 0, 10000, massRange, chargeRange, new Vector3(), new Vector3());
}

function simulationSpheres(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

    physics.useDistance1 = true;

    graphics.cameraDistance = 3000;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    physics.massConstant = 5e-3;
    physics.chargeConstant = 1e3;
    let massRange = [1, 3];
    massRange.forEach((v,i) => {
        massRange[i] *= 1e2;
    })
    let chargeRange = [-3, 3];

    const spheres = 10;
    const initialParticles = Math.round(1024 / spheres);
    const radiusRange = 32;

    const r1 = 0;
    const r2 = 1000;

    for (var i = 0; i < spheres; ++i) {
        let [x, y, z] = randomSpheric(r1, r2);
        createParticlesSphere(initialParticles, 0, radiusRange, massRange, chargeRange, new Vector3(x, y, z), new Vector3());
    }
}
