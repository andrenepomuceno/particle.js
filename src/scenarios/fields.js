import { Vector3 } from 'three';
import { fieldConfig, particleList, setParticleRadius } from '../simulation.js'
import { random, randomSpheric } from '../helpers.js'
import { Particle } from '../physics.js'

export const fields = [
    simulation2,
    simulation1,
];

function randomVector(range, round = false) {
    return new Vector3(
        random(-range, range, round),
        random(-range, range, round),
        random(-range, range, round)
    );
}

function randomSphericVector(r1, r2) {
    let [x, y, z] = randomSpheric(r1, r2);
    return new Vector3(x, y, z);
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

function createParticles(n, massFunc, chargeFunc, positionFunc, velocityFunc) {
    for (let i = 0; i < n; ++i) {
        createParticle(massFunc(i, n), chargeFunc(i, n), positionFunc(i, n), velocityFunc(i, n));
    }
}

function createParticle2(mass = 1, charge = 0, nearCharge = 0, position = new Vector3(), velocity = new Vector3(), fixed = false) {
    let p = new Particle();
    p.mass = mass;
    p.charge = charge;
    p.nearCharge = nearCharge;
    p.position.add(position);
    p.velocity.add(velocity);
    p.fixed = fixed;
    particleList.push(p);
}

function createParticles2(n, massFunc, chargeFunc, nearChargeFunc, positionFunc, velocityFunc) {
    for (let i = 0; i < n; ++i) {
        createParticle2(massFunc(i, n), chargeFunc(i, n), nearChargeFunc(i, n), positionFunc(i, n), velocityFunc(i, n));
    }
}

function simulation2(graphics, physics) {
    graphics.cameraDistance = 50;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    setParticleRadius(1, 0);

    fieldConfig(11, 5);

    physics.forceConstant = 1;
    physics.massConstant = 1;
    physics.chargeConstant = 1;
    physics.nearChargeConstant = -1;
    physics.nearChargeRange = 10;

    let x = new Vector3(5,0,0);
    let v = new Vector3(0,0.3,0);
    let fixed = false;
    let q = 1;
    let m = 1;
    let nq = 0;

    createParticle2(m, q, nq, new Vector3().sub(x), new Vector3().add(v), fixed);
    createParticle2(m, -q, nq, new Vector3().add(x), new Vector3().sub(v), fixed);
}

function simulation1(graphics, physics) {
    graphics.cameraDistance = 100;
    //graphics.cameraPhi = graphics.cameraTheta = 0;
    setParticleRadius(1, 0);

    physics.forceConstant = 1;
    physics.massConstant = 1;
    physics.chargeConstant = 1;
    physics.nearChargeConstant = -1;
    physics.nearChargeRange = 10;

    let x = 0;
    let q = 1e2;
    let m = 1e2;
    let nq = 1;

    createParticle2(m, q, nq, new Vector3(-x,0,0), new Vector3(), true);
}