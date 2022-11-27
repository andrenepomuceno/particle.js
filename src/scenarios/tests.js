import { CircleGeometry, LineBasicMaterial, Mesh, MeshBasicMaterial, RingGeometry, Vector3 } from 'three';
import { createParticleList, randomSphericVector, randomVector, createNuclei } from './helpers';
import { random, hexagonGenerator, shuffleArray } from '../helpers';
import { Particle } from '../physics';

export const tests = [
    boundaryTest,
    colisionTest,
];

function defaultParameters(simulation, cameraDistance = 5000) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    simulation.fieldCleanup();

    graphics.cameraDistance = cameraDistance;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    graphics.cameraSetup();

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1.0 / 137;
    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 1e3;

    simulation.setParticleRadius(20, 10);
    physics.boundaryDistance = 1e6;
    simulation.bidimensionalMode(true);
}

function boundaryTest(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.6e3);

    physics.boundaryDistance = 1e3;
    physics.boundaryDamping = 1;
    physics.minDistance2 = 0;

    physics.massConstant = 0;
    physics.chargeConstant = 0;
    physics.nearChargeConstant = 0;

    let n = 100;
    let m = 10;
    let q = 1;
    let nq = 1;
    let v = 10;
    let r0 = 1e3;
    ;
    for (let i = 0; i <= 90; i += 15) {
        createParticleList(physics.particleList,
            m, q * random(-5, 5, true), nq * random(-1, 1, true),
            new Vector3(r0, 0, 0).applyAxisAngle(
                new Vector3(0, 0, 1),
                i * Math.PI / 180
            ),
            new Vector3(0, -v, 0)
        );
    }

    simulation.graphics.scene.add(
        new Mesh(
            new RingGeometry(physics.boundaryDistance, physics.boundaryDistance + 10, 128),
            new MeshBasicMaterial({ color: 0xff0000 })
        )
    );
}

function colisionTest(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    let particleList = physics.particleList;

    graphics.cameraDistance = 500;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.massConstant = 0;
    physics.chargeConstant = 0;
    physics.nearChargeConstant = 0;

    let r = 10;
    physics.minDistance2 = Math.pow(2 * r, 2);
    simulation.setParticleRadius(r, 0);

    let v = 1;
    let m1 = 1;
    let p1 = 50;
    let m2 = 1e9;
    let p2 = 100;

    //test1
    particleList.push(new Particle());
    particleList.at(-1).mass = m1;
    particleList.at(-1).charge = 1;
    particleList.at(-1).position.set(-r, 0, 0); //left
    particleList.at(-1).velocity.set(v, -v, 0);
    particleList.push(new Particle());
    particleList.at(-1).mass = m1;
    particleList.at(-1).charge = -1;
    particleList.at(-1).position.set(r, 0, 0); //right
    particleList.at(-1).velocity.set(-v, -v, 0);
    // barrier top
    particleList.push(new Particle());
    particleList.at(-1).mass = m2;
    particleList.at(-1).charge = 0;
    particleList.at(-1).position.set(-p2 - r, p2, 0); //left
    particleList.push(new Particle());
    particleList.at(-1).mass = m2;
    particleList.at(-1).charge = 0;
    particleList.at(-1).position.set(p2 + r, p2, 0); //right
    // barrier bottom
    particleList.push(new Particle());
    particleList.at(-1).mass = m2;
    particleList.at(-1).charge = 0;
    particleList.at(-1).position.set(-p2 - r, -p2, 0);
    particleList.push(new Particle());
    particleList.at(-1).mass = m2;
    particleList.at(-1).charge = 0;
    particleList.at(-1).position.set(p2 + r, -p2, 0);

    // test3
    m1 = 10;
    p1 = 60;
    v = 1;
    particleList.push(new Particle());
    particleList.at(-1).mass = m1;
    particleList.at(-1).charge = 1;
    particleList.at(-1).position.set(0, 2 * p2, 0);
    particleList.at(-1).velocity.set(0, 0, 0);
    particleList.push(new Particle());
    particleList.at(-1).mass = m1;
    particleList.at(-1).charge = -1;
    particleList.at(-1).position.set(p1, r + 2 * p2, 0);
    particleList.at(-1).velocity.set(-v, 0, 0);

    // test4
    particleList.push(new Particle());
    particleList.at(-1).mass = m1;
    particleList.at(-1).charge = 1;
    particleList.at(-1).position.set(0, 3 * p2, 0);
    particleList.at(-1).velocity.set(0, 0, 0);
    particleList.push(new Particle());
    particleList.at(-1).mass = m1;
    particleList.at(-1).charge = -1;
    particleList.at(-1).position.set(p1, -1.9 * r + 3 * p2, 0);
    particleList.at(-1).velocity.set(-v, 0, 0);

    // test2
    v = 5;
    particleList.push(new Particle());
    particleList.at(-1).mass = m1;
    particleList.at(-1).charge = 1;
    particleList.at(-1).position.set(-2 * p1, -2 * p2, 0);
    particleList.at(-1).velocity.set(v, 0, 0);
    particleList.push(new Particle());
    particleList.at(-1).mass = m1;
    particleList.at(-1).charge = -1;
    particleList.at(-1).position.set(2 * p1, -2 * p2, 0);
    particleList.at(-1).velocity.set(-v, 0, 0);
    //barrier
    particleList.push(new Particle());
    particleList.at(-1).mass = m2;
    particleList.at(-1).charge = 0;
    //particleList.at(-1).nearCharge = -1;
    particleList.at(-1).position.set(-3 * p1, -2 * p2, 0);
    particleList.at(-1).velocity.set(0, 0, 0);
    particleList.push(new Particle());
    particleList.at(-1).mass = m2;
    particleList.at(-1).charge = 0;
    particleList.at(-1).position.set(3 * p1, -2 * p2, 0);
    particleList.at(-1).velocity.set(0, 0, 0);

    // test2.1
    v = 5;
    p2 += 50;
    particleList.push(new Particle());
    particleList.at(-1).mass = m1;
    particleList.at(-1).charge = 1;
    particleList.at(-1).position.set(-2 * p1, -2 * p2, 0);
    particleList.at(-1).velocity.set(v, 0, 0);
    particleList.push(new Particle());
    particleList.at(-1).mass = m1;
    particleList.at(-1).charge = -1;
    particleList.at(-1).position.set(2 * p1, -2 * p2, 0);
    particleList.at(-1).velocity.set(-v, 0, 0);
    for (let i = 0; i <= 500; i += 2*r+1) {
        particleList.push(new Particle());
        particleList.at(-1).mass = 10 * m1;
        particleList.at(-1).charge = 0;
        particleList.at(-1).nearCharge = -1;
        particleList.at(-1).position.set(-3 * p1 - i, -2 * p2, 0);
        particleList.at(-1).velocity.set(0, 0, 0);
    }
    particleList.push(new Particle());
    particleList.at(-1).mass = m2;
    particleList.at(-1).charge = 0;
    particleList.at(-1).position.set(3 * p1, -2 * p2, 0);
    particleList.at(-1).velocity.set(0, 0, 0);

    
}