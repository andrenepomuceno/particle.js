import { Vector3 } from 'three';
import { particleList, setParticleRadius } from '../simulation.js'
import { random, randomSpheric } from '../helpers.js'
import { Particle } from '../physics.js'
import { fieldProbeConfig, fieldRefresh, fieldSetup } from '../field.js'

export const fields = [
    nearField,
    chargeField,
    massField,
];

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

function defaultConfig(graphics, physics) {
    graphics.cameraDistance = 100;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    setParticleRadius(1, 0);
    let grid = 50;
    fieldRefresh(graphics, grid);
}

function nearField(graphics, physics) {
    defaultConfig(graphics, physics)
    fieldProbeConfig(0, 0, 1e2);

    physics.forceConstant = 1;
    physics.massConstant = 0;
    physics.chargeConstant = 0;
    physics.nearChargeConstant = -4;
    physics.nearChargeRange = 10;

    let x = new Vector3(physics.nearChargeRange, 0, 0);
    let v = new Vector3(0, 0, 0);
    let fixed = true;
    let q = 0;
    let m = 10;
    let nq = 1;

    createParticle2(m, q, nq, new Vector3().sub(x), new Vector3().add(v), fixed);
    createParticle2(m, -q, -nq, new Vector3().add(x), new Vector3().sub(v), fixed);
}

function chargeField(graphics, physics) {
    defaultConfig(graphics, physics)
    fieldProbeConfig(0, 10 , 0);

    physics.forceConstant = 1;
    physics.massConstant = 1;
    physics.chargeConstant = 1;
    physics.nearChargeConstant = -1;
    physics.nearChargeRange = 10;

    let x = new Vector3(10, 0, 0);
    let v = new Vector3(0, 1, 0);
    let fixed = true;
    let q = 1e2;
    let m = 1;
    let nq = 0;

    createParticle2(m, q, nq, new Vector3().sub(x), new Vector3().add(v), fixed);
    createParticle2(m, -q, nq, new Vector3().add(x), new Vector3().sub(v), fixed);
}

function massField(graphics, physics) {
    defaultConfig(graphics, physics)
    fieldProbeConfig(10, 0, 0);

    physics.forceConstant = 1;
    physics.massConstant = 1;
    physics.chargeConstant = 1;
    physics.nearChargeConstant = -1;
    physics.nearChargeRange = 10;

    let x = new Vector3(10, 0, 0);
    let v = new Vector3(0, 1, 0);
    let fixed = true;
    let q = 1;
    let m = 1e2;
    let nq = 0;

    createParticle2(m, q, nq, new Vector3().sub(x), new Vector3().add(v), fixed);
    createParticle2(m, -q, nq, new Vector3().add(x), new Vector3().sub(v), fixed);
}