import { random, randomSpheric, randomDisc } from "../helpers";
import { Particle } from "../physics"
import { particleList } from "../simulation";
import { DynamicCopyUsage, Vector3 } from 'three';

let bidimensionalModeEnable = false;

export function bidimensionalMode(enable = true) {
    bidimensionalModeEnable = enable;
}

export function randomVector(range, round = false) {
    let v = new Vector3(
        random(-range, range, round),
        random(-range, range, round),
        random(-range, range, round)
    );
    if (bidimensionalModeEnable) v.z = 0;
    return v;
}

export function randomSphericVector(r1, r2) {
    let x, y, z;
    if (bidimensionalModeEnable) [x, y, z] = randomDisc(r1, r2);
    else[x, y, z] = randomSpheric(r1, r2);
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
    return p;
}

export function createParticles(n, massFunc, chargeFunc, nearChargeFunc, positionFunc, velocityFunc) {
    for (let i = 0; i < n; ++i) {
        let x = positionFunc(i, n);
        let p = createParticle(massFunc(i, n), chargeFunc(i, n), nearChargeFunc(i, n), x, velocityFunc(i, n, x));
    }
}

export function createNuclei0(n = 1, m = 1, q = 1, nq = 1, r = 128, v = 0, center = new Vector3()) {
    createParticles(
        n,
        () => { return 1836 * m; },
        () => { return q; },
        () => {
            //return (random(0, 1, true)) ? (-nq) : (nq);
            //return nq * random(1, 3, true);
            return nq;
        },
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
        () => {
            //return (random(0, 1, true)) ? (-nq) : (nq);
            //return -nq * random(1, 3, true);
            //return -nq;
            return nq;
        },
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
        (i, n) => {
            return randomSphericVector(r0, r1).add(center);
        },
        (i, n, x) => {
            return randomVector(v);
        }
    )
}

export function createCloud1(n, m, q, nq, r0, r1, v, center = new Vector3()) {
    let gap = (r1 - r0) / n;
    for (let idx = 0; idx < n; ++idx) {
        createParticles(2,
            () => { return m; },
            () => { return q; },
            () => { return nq; },
            (i, n) => {
                return randomSphericVector(r0 + gap * idx, r0 + gap * (idx + 1)).add(center);
            },
            (i, n, x) => {
                let dc = center.clone().sub(x);
                dc.normalize();
                dc.applyAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI / 2);
                dc.multiplyScalar(random(-v, v));
                return dc;
            }
        )
    }
}

export function createCloud2(n, m, q, nq, r0, r1, v, center = new Vector3()) {
    let gap = (r1 - r0) / n;
    for (let idx = 0; idx < n; ++idx) {
        let r2 = r0 + gap * idx;
        createParticles(1,
            () => { return m; },
            () => { return q; },
            () => { return nq; },
            () => {
                return randomSphericVector(r2, r2).add(center);
            },
            (i_, n_, x) => {
                let dc = center.clone().sub(x);
                dc.normalize();
                dc.applyAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI / 2);
                let v2 = v * Math.sqrt(Math.abs(n * q) / r2);
                dc.multiplyScalar(v2);
                return dc;
            }
        )
    }
}

export function createCloud3(n, m, q, nq, r0, r1, v, center = new Vector3()) {
    createParticles(n,
        () => { return m; },
        () => { return q; },
        () => { return nq; },
        () => {
            return randomSphericVector(r0, r1).add(center);
        },
        (i_, n_, x) => {
            let dc = center.clone().sub(x);
            let r = dc.length();
            dc.normalize();
            dc.applyAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI / 2);
            let v2 = v * Math.sqrt(Math.abs(n * q) / r);
            v2 = random(0, 1, true) ? (v) : (-v);
            dc.multiplyScalar(v2);
            return dc;
        }
    )
}

export function atom0(n1 = 1, n2 = 10, m = 1, q = 1, nq = 1, r0 = 100, r1 = r0, r2 = 4 * r1, v = 0, center = new Vector3()) {
    createNuclei0(n1, m, q, nq, r0, 0, center);
    createCloud3(n2, m, -q, 0, r1, r2, v, center);
}