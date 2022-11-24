import { Vector3 } from 'three';
import { random, randomSpheric } from '../helpers.js'
import { Particle, ParticleType } from '../physics.js'

let particleList = undefined;

export const scenarios0 = [
    simulation0,
    simulation1,
    simulationAtom,
    simulationCross,
    simulationGrid2D,
    simulationGrid3D,
    simulationSpheres,
];

function randomVector(range) {
    return new Vector3(
        random(-range, range),
        random(-range, range),
        random(-range, range)
    );
}

function createParticle(mass = 1, charge = 0, position = new Vector3(), velocity = new Vector3(), fixed = false) {
    let p = new Particle();
    p.mass = mass;
    p.charge = charge;
    p.position.add(position);
    p.velocity.add(velocity);
    if (fixed) p.type = ParticleType.fixed;
    particleList.push(p);
}

function createParticles(particles, [m1, m2], [q1, q2], positionGenerator, center = new Vector3(), velocity = new Vector3()) {
    for (var i = 0; i < particles; ++i) {
        let [x, y, z] = positionGenerator();
        let position = new Vector3(x, y, z);
        position.add(center);
        createParticle(
            Math.round(random(m1, m2)),
            Math.round(random(q1, q2)),
            position,
            velocity
        );
    }
}

function createParticlesSphere(particles, r1, r2, massRange, chargeRange, center, velocity, mode = 0) {
    createParticles(particles, massRange, chargeRange, (x, y, z) => randomSpheric(r1, r2, mode), center, velocity);
}

function simulationDev(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

    graphics.cameraDistance = 1000;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 1;
    physics.chargeConstant = 1;

    let x, y, z;

    createParticle(1836, 1);

    let v0 = 16;
    let r0 = 1e3;
    let n = 1e3;
    for (let i = 0; i < n; ++i) {
        [x, y, z] = randomSpheric(0, r0);
        createParticle(
            1,
            -1,
            new Vector3(x, y, z),
            randomVector(v0)
        );
    }
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

    physics.forceConstant = 1;
    physics.massConstant = 1;
    physics.chargeConstant = 100;
    let massRange = [1, 1839];
    let chargeRange = [-1, 1];

    let r = 10;
    let vy = 6;
    let vx = 0;

    createParticles(1, [1839, 1839], [0, 0], () => {
        let pos = randomSpheric(0, r);
        //return [pos[0], pos[1], pos[2]];
        return [r, 0, 0];
    }, new Vector3(), new Vector3(-vx, vy, 0));

    createParticles(1, [1836, 1836], [1, 1], () => {
        let pos = randomSpheric(0, r);
        //return [pos[0], pos[1], pos[2]];
        return [-r, 0, 0];
    }, new Vector3(), new Vector3(vx, -vy, 0));

    let re = 1024;
    createParticles(512, [1, 1], [-1, -1], () => {
        let pos = randomSpheric(0, re);
        return [pos[0], pos[1], pos[2]];
        //return [r, 0, 0];
    }, new Vector3(), new Vector3());
}

function simulation0(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

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

    graphics.cameraDistance = 5000;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    physics.forceConstant = 5;
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
