import { Vector3 } from 'three';
import { particleList, physics } from './simulation.js'
import { random, randomSpheric } from './helpers.js'
import { Particle } from './particle.js'

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
    p.fixed = fixed;
    particleList.push(p);
}

function createParticlesRV(particles, [m1, m2], [q1, q2], positionGenerator, center = new Vector3(), velocity = new Vector3()) {
    for (var i = 0; i < particles; ++i) {
        let [x, y, z] = positionGenerator();
        let position = new Vector3(x, y, z);
        position.add(center);
        createParticle(
            Math.round(random(m1, m2)),
            Math.round(random(q1, q2)),
            position,
            randomVector(1)
        );
    }
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

function createParticlesCube(particles, size, mass, charge, center, velocity) {
    createParticles(particles, massRange, chargeRange, (x, y, z) => {
        return [
            random(-size, size),
            random(-size, size),
            random(-size, size)
        ];
    }, center, velocity);
}

export function simulationAtom(graphics) {
    graphics.cameraDistance = 500;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    /*const eMass = 9.1093837015e-31;
    const pMass = 1.67262192369e-27;
    const nMass = 1.67492749804e-27;*/

    physics.forceConstant = 1;
    physics.massConstant = 1;
    physics.chargeConstant = 100;
    physics.massRange = [1, 1839];
    physics.chargeRange = [-1, 1];

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
    createParticlesRV(512, [1, 1], [-1, -1], () => {
        let pos = randomSpheric(0, re);
        return [pos[0], pos[1], pos[2]];
        //return [r, 0, 0];
    }, new Vector3(), new Vector3());

    // let p = new Particle();
    // p.mass = 1e3;
    // p.charge = 8;
    // p.position.set(0, 0, 0);
    // p.fixed = true;
    // particleList.push(p);
}

export function simulation0(graphics) {
    graphics.cameraDistance = 5000;

    physics.massConstant = 1;
    physics.chargeConstant = 1;
    physics.massRange = [1, 2];
    physics.chargeRange = [-1, 1];

    const initialParticles = 1024;
    const radiusRange = 512;

    createParticlesSphere(initialParticles, 0, radiusRange, physics.massRange, physics.chargeRange, new Vector3(), new Vector3());
}

export function simulation1(graphics) {
    graphics.cameraDistance = 4000;
    physics.massConstant = 1;
    physics.chargeConstant = 1;
    physics.massRange = [1, 1];
    physics.chargeRange = [-1, 1];

    const initialParticles = Math.round(1024 / 2);
    const radiusRange = 32;
    const x = 500;
    const y = x;
    const v = 16;

    createParticlesSphere(initialParticles, 0, radiusRange, physics.massRange, physics.chargeRange, new Vector3(x, y, 0), new Vector3(-v, 0, 0));
    createParticlesSphere(initialParticles, 0, radiusRange, physics.massRange, physics.chargeRange, new Vector3(-x, -y, 0), new Vector3(v, 0, 0));
}

export function simulationGrid2D(graphics) {
    graphics.cameraDistance = 5000
    graphics.cameraPhi = 0; graphics.cameraTheta = 0;
    physics.massConstant = 1 / 100;
    physics.chargeConstant = 1;
    physics.massRange = [1, 5];
    physics.chargeRange = [-1, 1];

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
            createParticlesSphere(initialParticles, 0, radiusRange, physics.massRange, physics.chargeRange, new Vector3(cx, cy, 0), new Vector3());
        }
    }
}

export function simulationGrid3D(graphics) {
    graphics.cameraDistance = 3000;
    graphics.cameraPhi = 30; graphics.cameraTheta = 45;
    physics.massConstant = 1 / 10;
    physics.chargeConstant = 1;
    physics.massRange = [1, 8];
    physics.chargeRange = [-8, 8];

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
                createParticlesSphere(initialParticles, 0, radiusRange, physics.massRange, physics.chargeRange, new Vector3(cx, cy, cz), new Vector3());
            }
        }
    }
}

export function simulationCross(graphics) {
    graphics.cameraDistance = 4000;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    physics.massConstant = 1 / 17;
    physics.chargeConstant = 1;
    physics.massRange = [1, 16];
    physics.chargeRange = [-3, 3];

    const initialParticles = Math.round(1024 / 7);
    const radiusRange = 128;
    const space = 1000;
    const v = 10;

    createParticlesSphere(2 * initialParticles, 0, radiusRange, physics.massRange, physics.chargeRange, new Vector3(), new Vector3());
    createParticlesSphere(initialParticles, 0, radiusRange, physics.massRange, physics.chargeRange, new Vector3(space, 0, 0), new Vector3(0, -v, 0));
    createParticlesSphere(initialParticles, 0, radiusRange, physics.massRange, physics.chargeRange, new Vector3(0, space, 0), new Vector3(v, 0, 0));
    createParticlesSphere(initialParticles, 0, radiusRange, physics.massRange, physics.chargeRange, new Vector3(-space, 0, 0), new Vector3(0, v, 0));
    createParticlesSphere(initialParticles, 0, radiusRange, physics.massRange, physics.chargeRange, new Vector3(0, -space, 0), new Vector3(-v, 0, 0));
    createParticlesSphere(initialParticles, 0, 10000, physics.massRange, physics.chargeRange, new Vector3(), new Vector3());
}

export function simulationSpheres(graphics) {
    graphics.cameraDistance = 3000;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    physics.massConstant = 1 / 13;
    physics.chargeConstant = 1;
    physics.massRange = [1, 8];
    physics.chargeRange = [-3, 3];

    const spheres = 10;
    const initialParticles = Math.round(1024 / spheres);
    const radiusRange = 32;

    const r1 = 0;
    const r2 = 1000;

    for (var i = 0; i < spheres; ++i) {
        let [x, y, z] = randomSpheric(r1, r2);
        createParticlesSphere(initialParticles, 0, radiusRange, physics.massRange, physics.chargeRange, new Vector3(x, y, z), new Vector3());
    }
}

export function colisionTest(graphics) {
    graphics.cameraDistance = 500;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.massConstant = 0;
    physics.chargeConstant = 0;
    physics.massRange = [1, 50];
    physics.chargeRange = [-1, 1];

    /*let i = -250;
    createParticles(10, [1, 1], physics.chargeRange, (x, y, z) => {
        i += 50;
        return [i, 0, 0];
    })
    particleList.at(-1).velocity.set(-1, 0, 0);
    particleList.push(new Particle());
    particleList.at(-1).mass = 50;
    particleList.at(-1).charge = 1;
    particleList.at(-1).position.set(-400, 0, 0);
    particleList.push(new Particle());
    particleList.at(-1).mass = 50;
    particleList.at(-1).charge = 1;
    particleList.at(-1).position.set(400, 0, 0);*/

    particleList.push(new Particle());
    particleList.at(-1).mass = 1;
    particleList.at(-1).charge = 1;
    particleList.at(-1).position.set(-50, 50, 0);
    particleList.at(-1).velocity.set(1, -1, 0);
    particleList.push(new Particle());
    particleList.at(-1).mass = 1;
    particleList.at(-1).charge = 1;
    particleList.at(-1).position.set(50, 50, 0);
    particleList.at(-1).velocity.set(-1, -1, 0);
    particleList.push(new Particle());
    particleList.at(-1).mass = 100;
    particleList.at(-1).charge = 1;
    particleList.at(-1).position.set(-50, -50, 0);
    particleList.push(new Particle());
    particleList.at(-1).mass = 100;
    particleList.at(-1).charge = 1;
    particleList.at(-1).position.set(50, -50, 0);
    particleList.push(new Particle());
    particleList.at(-1).mass = 100;
    particleList.at(-1).charge = 1;
    particleList.at(-1).position.set(-60, 60, 0);
    particleList.push(new Particle());
    particleList.at(-1).mass = 100;
    particleList.at(-1).charge = 1;
    particleList.at(-1).position.set(60, 60, 0);
}