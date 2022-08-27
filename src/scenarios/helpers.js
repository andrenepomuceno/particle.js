import { random, randomSpheric, randomDisc } from "../helpers";
import { Particle } from "../physics"
import { particleList } from "../simulation";
import { Vector3 } from 'three';

export let bidimensionalMode = true;

export function randomVector(range, round = false) {
    let v = new Vector3(
        random(-range, range, round),
        random(-range, range, round),
        random(-range, range, round)
    );
    if (bidimensionalMode) v.z = 0;
    return v;
}

export function randomSphericVector(r1, r2) {
    let x, y, z;
    if (bidimensionalMode) [x, y, z] = randomDisc(r1, r2);
    else [x, y, z] = randomSpheric(r1, r2);
    return new Vector3(x, y, z);
}

export function createParticle(mass = 1, charge = 0, nearCharge = 0, position = new Vector3(), velocity = new Vector3(), fixed = false) {
    let p = new Particle();
    p.mass = mass;
    p.charge = charge;
    p.nearCharge = nearCharge;
    p.position.add(position);
    p.velocity.add(velocity);
    p.fixed = fixed;
    particleList.push(p);
}

export function createParticles(n, massFunc, chargeFunc, nearChargeFunc, positionFunc, velocityFunc) {
    for (let i = 0; i < n; ++i) {
        createParticle(massFunc(i, n), chargeFunc(i, n), nearChargeFunc(i, n), positionFunc(i, n), velocityFunc(i, n));
    }
}

export function createNuclei0(n = 1, m = 1, q = 1, nq = 1, r = 128, v = 0, center = new Vector3()) {
    createParticles(
        n,
        () => { return 1836 * m; },
        () => { return q; },
        () => { return nq; },
        () => {
            return randomSphericVector(0, r).add(center);
        },
        () => {
            return randomVector(v);
        },
    );

    createParticles(
        n,
        () => { return 1839 * m; },
        () => { return 0; },
        () => { return nq; },
        () => {
            return randomSphericVector(0, r).add(center);
        },
        () => {
            return randomVector(v);
        },
    );
}

export function createCloud0(n, m, q, nq, r0, r1, v, center = new Vector3()) {
    createParticles(n,
        () => { return m; },
        () => { return q; },
        () => { return nq; },
        () => {
            return randomSphericVector(r0, r1).add(center);
        },
        () => {
            return randomVector(v);
        }
    )
}

export function atom0(n1 = 1, n2 = 10, m = 1, q = 1, nq = 1, r0 = 100, r1 = r0, r2 = 4 * r1, v = 0, center = new Vector3()) {
    createNuclei0(n1, m, q, nq, r0, 0);
    createCloud0(n2, m, -q, 0, r1, r2, v);
}