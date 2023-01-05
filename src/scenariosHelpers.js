import { random } from "./helpers";
import { Vector3 } from 'three';
import { GridHelper } from 'three';
import { Particle, ParticleType } from './particle';
import { randomSphericVector } from "./helpers";
import { createParticles } from "./helpers";

export function randomVector(range, mode2D = true, round = false) {
    let v = new Vector3(
        random(-range, range, round),
        random(-range, range, round),
        random(-range, range, round)
    );
    if (mode2D) v.z = 0;
    return v;
}

export function createParticle(list, mass = 1, charge = 0, nuclearCharge = 0, position = new Vector3(), velocity = new Vector3(), fixed = false) {
    let p = new Particle();
    p.mass = mass;
    p.charge = charge;
    p.nuclearCharge = nuclearCharge;
    p.position.add(position);
    p.velocity.add(velocity);
    if (fixed) p.type = ParticleType.fixed;
    list.push(p);
    return p;
}

export function createParticlesList(list, n, massCallback, chargeCallback, nuclearChargeCallback, positionCallback, velocityCallback, fixed = false) {
    for (let i = 0; i < n; ++i) {
        let m = massCallback(i, n);
        let x = positionCallback(i, n);
        let p = createParticle(list, m, chargeCallback(i, n), nuclearChargeCallback(i, n), x, velocityCallback(i, n, x), fixed);
    }
}

export function createNuclei0(particleList, n = 1, m = 1, q = 1, nq = 1, r = 128, v = 0, center = new Vector3()) {
    createParticlesList(particleList,
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

    createParticlesList(particleList,
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

export function createCloud3(particleList, n, m, q, nq, r0, r1, v, center = new Vector3()) {
    createParticlesList(particleList, n,
        () => { return m; },
        () => { return q; },
        () => { return nq; },
        () => {
            //console.log([r0, r1]);
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

export function atom0(particleList, n1 = 1, n2 = 10, m = 1, q = 1, nq = 1, r0 = 100, r1 = r0, r2 = 4 * r1, v = 0, center = new Vector3()) {
    createNuclei0(particleList, n1, m, q, nq, r0, 0, center);
    createCloud3(particleList, n2, m, -q, 0, r1, r2, v, center);
}

export function createNuclei(particleList, n, m, q, nq, r0, r1, v, center, electrons = 0, neutrons = 0, v2 = new Vector3()) {
    let typeList = [
        { m: 0.511, q: -1, nq: -1 },
        { m: 3, q: 2 / 3, nq: 1 },
        { m: 6, q: -1 / 3, nq: 1 },
    ];

    createParticlesList(particleList, 2 * n,
        (i) => {
            return m * typeList[1].m;
        },
        (i) => {
            return q * typeList[1].q;
        },
        (i) => {
            return nq * typeList[1].nq;
        },
        (i) => {
            return randomSphericVector(0, r0).add(center);
        },
        (i) => {
            return v2;
        }
    );
    createParticlesList(particleList, 1 * n,
        (i) => {
            return m * typeList[2].m;
        },
        (i) => {
            return q * typeList[2].q;
        },
        (i) => {
            return nq * typeList[2].nq;
        },
        (i) => {
            return randomSphericVector(0, r0).add(center);
        },
        (i) => {
            return v2;
        }
    );

    createParticlesList(particleList, electrons,
        (i) => {
            return m * typeList[0].m;
        },
        (i) => {
            return q * typeList[0].q;
        },
        (i) => {
            return nq * typeList[0].nq;
        },
        (i) => {
            return randomSphericVector(r0, r1).add(center);
        },
        (i) => {
            return randomVector(v).add(v2);
        }
    );

    createParticlesList(particleList, 1 * neutrons,
        (i) => {
            return m * typeList[1].m;
        },
        (i) => {
            return q * typeList[1].q;
        },
        (i) => {
            return nq * typeList[1].nq;
        },
        (i) => {
            return randomSphericVector(0, r0).add(center);
        },
        (i) => {
            return v2;
        }
    );

    createParticlesList(particleList, 2 * neutrons,
        (i) => {
            return m * typeList[2].m;
        },
        (i) => {
            return q * typeList[2].q;
        },
        (i) => {
            return nq * typeList[2].nq;
        },
        (i) => {
            return randomSphericVector(0, r0).add(center);
        },
        (i) => {
            return v2;
        }
    );
}

export function drawGrid(simulation, divisions = 10) {
    let size = 2 * simulation.physics.boundaryDistance;
    let gridHelper = new GridHelper(size, divisions);
    let z = -1;
    gridHelper.geometry.rotateX(Math.PI / 2);
    gridHelper.geometry.translate(0, 0, z);
    simulation.graphics.scene.add(gridHelper);
}

export function createNucleiFromList(simulation, nucleusList, cloudList, zNumber, m, q, nq, r0, r1, center, velocity, electrons = zNumber, neutrons = zNumber) {
    let options = {
        m, q, nq,
        r0: 0, r1: r0,
        randomSequence: false,
        randomNQSignal: false,
        v1: velocity,
        center
    };
    createParticles(simulation, nucleusList, zNumber * nucleusList.length, options);
    options = { ...options, r0, r1 };
    createParticles(simulation, cloudList, electrons * cloudList.length, options);
}

export function parseElementRatioList(list) {
    list.sort((a, b) => {
        return a.r > b.r;
    });
    let ratioMax = 0.0;
    list.forEach(v => {
        if (v.r > ratioMax) ratioMax = v.r;
    });
    list.forEach((v, i) => {
        list[i].r /= ratioMax;
    });
}

export function calcAvgMass(elementsRatios) {
    let totalr = 0;
    let totals = 0;
    elementsRatios.forEach(v => {
        totalr += v.r;
        totals += v.r * v.n;
    });
    let meanMass = totals / totalr;
    console.log(meanMass);
    return meanMass;
}

export function calcGridSize(graphics, m) {
    let counter = 0;
    let grid = [5, 5, 1];
    while (counter++ < 1e3) {
        let next = (grid[0] + 1) * (grid[1] + 1) * grid[2];
        if (m * next > graphics.maxParticles) break;
        grid[0] += 1;
        grid[1] += 1;
    }
    return grid;
}