import { Vector3 } from 'three';
import { setParticleRadius } from '../simulation'
import { Particle } from '../physics'
import { fieldProbeConfig, fieldSetup } from '../simulation'
import { bidimensionalMode } from './helpers';

export const fields = [
    nearField,
    chargeField,
    massField,
];

let particleList = undefined;

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

let grid = 50;

function defaultConfig(graphics, physics, distance = 50) {
    particleList = physics.particleList;

    graphics.cameraDistance = distance;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    graphics.cameraSetup();

    physics.forceConstant = 1;
    physics.massConstant = 1;
    physics.chargeConstant = 1;
    physics.nearChargeConstant = -1;
    physics.nearChargeRange = 16;

    bidimensionalMode(true);
    setParticleRadius(1, 0);
}

function nearField(graphics, physics) {
    defaultConfig(graphics, physics, 2.6e1)
    setParticleRadius(1, 0);

    fieldProbeConfig(0, 0, 1);
    fieldSetup("2d", grid);

    physics.forceConstant = 1;
    physics.massConstant = 0;
    physics.chargeConstant = 0;
    physics.nearChargeConstant = 5e2;
    physics.nearChargeRange = 16;

    let x = new Vector3(1.1 * physics.nearChargeRange, 0, 0);
    let v = new Vector3(0, 0, 0);
    let fixed = true;
    let q = 1;
    let m = 1;
    let nq = 1;

    createParticle2(m, q, nq, new Vector3().sub(x), new Vector3().add(v), fixed);
    createParticle2(m, -q, -nq, new Vector3().add(x), new Vector3().sub(v), fixed);
}

function chargeField(graphics, physics) {
    defaultConfig(graphics, physics);

    fieldProbeConfig(0, 1, 0);
    fieldSetup("2d", grid);

    physics.forceConstant = 1;
    physics.massConstant = 0;
    physics.chargeConstant = 2e4;
    physics.nearChargeConstant = 0;
    physics.nearChargeRange = 16;

    let x = new Vector3(10, 0, 0);
    let v = new Vector3(0, 1, 0);
    let fixed = true;
    let q = 1;
    let m = 1;
    let nq = 1;

    createParticle2(m, q, nq, new Vector3().sub(x), new Vector3().add(v), fixed);
    createParticle2(m, -q, nq, new Vector3().add(x), new Vector3().sub(v), fixed);
}

function massField(graphics, physics) {
    defaultConfig(graphics, physics)

    fieldProbeConfig(1, 0, 0);
    fieldSetup("2d", grid);

    physics.forceConstant = 1;
    physics.massConstant = 2e4;
    physics.chargeConstant = 0;
    physics.nearChargeConstant = 0;
    physics.nearChargeRange = 16;

    let x = new Vector3(10, 0, 0);
    let v = new Vector3(0, 1, 0);
    let fixed = true;
    let q = 1;
    let m = 1;
    let nq = 1;

    createParticle2(m, q, nq, new Vector3().sub(x), new Vector3().add(v), fixed);
    createParticle2(m, -q, nq, new Vector3().add(x), new Vector3().sub(v), fixed);
}