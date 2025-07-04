import { Vector3 } from 'three';
import { Particle, ParticleType } from '../particle';

export const fields = [
    {
        name: 'Nuclear Field',
        callback: nuclearField
    },
    {
        name: 'Electromagnetic Field',
        callback: electromagneticField
    },
    {
        name: 'Gravity Field',
        callback: gravityField
    }
];

let particleList = undefined;

function createParticle2(mass = 1, charge = 0, nuclearCharge = 0, position = new Vector3(), velocity = new Vector3(), fixed = false) {
    let p = new Particle();
    p.mass = mass;
    p.charge = charge;
    p.nuclearCharge = nuclearCharge;
    p.position.add(position);
    p.velocity.add(velocity);
    if (fixed) p.type = ParticleType.fixed;
    particleList.push(p);
}

let grid = 50;

function defaultConfig(simulation, distance = 4.0e2) {
    particleList = simulation.particleList;

    let graphics = simulation.graphics;
    let physics = simulation.physics;

    graphics.cameraDistance = distance;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    graphics.cameraSetup();

    physics.timeStep = 1;
    physics.massConstant = 1;
    physics.chargeConstant = 1;
    physics.nuclearForceConstant = 1;
    physics.nuclearForceRange = 2e2;

    simulation.bidimensionalMode(true);
    simulation.setParticleRadius(10, 0);
}

function nuclearField(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultConfig(simulation);

    simulation.field.probeConfig(0, 0, 1e2);
    simulation.field.setup('2d', grid);

    let x = new Vector3(1.1 * physics.nuclearForceRange, 0, 0);
    let v = new Vector3(1, 0, 0);
    let fixed = true;
    let q = 1;
    let m = 1;
    let nq = 1;

    createParticle2(m, q, nq, new Vector3().sub(x), new Vector3().add(v), fixed);
    createParticle2(m, -q, -nq, new Vector3().add(x), new Vector3().sub(v), fixed);
}

function electromagneticField(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultConfig(simulation);

    simulation.field.probeConfig(0, 1e5, 0);
    simulation.field.setup('2d', grid);

    let x = new Vector3(2e2, 0, 0);
    let v = new Vector3(1, 0, 0);
    let fixed = true;
    let q = 10;
    let m = 1;
    let nq = 1;

    createParticle2(m, q, nq, new Vector3().sub(x), new Vector3().add(v), fixed);
    createParticle2(m, -q, nq, new Vector3().add(x), new Vector3().sub(v), fixed);
}

function gravityField(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultConfig(simulation);
    simulation.setParticleRadius(20, 10);

    simulation.field.probeConfig(1e4, 0, 0);
    simulation.field.setup('2d', grid);

    let x = new Vector3(2e2, 0, 0);
    let v = new Vector3(0, 1, 0);
    let fixed = true;
    let q = 0;
    let m1 = 10;
    let m2 = 50;
    let nq = 1;

    createParticle2(m1, q, nq, new Vector3().sub(x), new Vector3().add(v), fixed);
    createParticle2(m2, -q, -nq, new Vector3().add(x), new Vector3().sub(v), fixed);
}