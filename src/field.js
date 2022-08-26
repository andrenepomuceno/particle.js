import { ArrowHelper, Vector3 } from 'three';
import { Particle } from './physics.js'
import { particleList, physics } from './simulation.js'

let fieldVectorList = [];
let gridSize0 = 10;
let gridSpacing = 5;

export function fieldConfig(size = 10, spacing = 5) {
    gridSize0 = size;
    gridSpacing = spacing;
}

export function fieldAdd(graphics, gridSize = [gridSize0, gridSize0, gridSize0], center = new Vector3()) {
    for (let x = 0; x < gridSize[0]; x++) {
        let xPos = (x - gridSize[0] / 2 + 0.5) * gridSpacing;
        for (let y = 0; y < gridSize[1]; y++) {
            let yPos = (y - gridSize[1] / 2 + 0.5) * gridSpacing;
            for (let z = 0; z < gridSize[2]; z++) {
                let zPos = (z - gridSize[2] / 2 + 0.5) * gridSpacing;
                let pos = new Vector3(xPos, yPos, zPos).add(center);
                fieldVectorList.push(pos);
                pos.arrow = new ArrowHelper(
                    new Vector3(1, 0, 0),
                    pos,
                    0,
                    0xffffff
                );
                graphics.scene.add(pos.arrow);
            }
        }
    }
}

export function fieldSetup(graphics, gridSize = [gridSize0, gridSize0, gridSize0], center = new Vector3()) {
    fieldCleanup(graphics);
    fieldAdd(graphics, gridSize, center);
}

function fieldCleanup(graphics) {
    fieldVectorList.forEach((pos) => {
        graphics.scene.remove(pos.arrow);
    });
    fieldVectorList = [];

    gridSize0 = 10;
    gridSpacing = 5;
}

export function fieldUpdate(m, q, nq) {
    let probe = new Particle();
    probe.mass = m;
    probe.charge = q;
    probe.nearCharge = nq;
    fieldVectorList.forEach((pos) => {
        probe.position = pos;
        let dir = fieldProbe(probe);
        let len = dir.length();
        const minLen = 0.5;
        const maxLen = gridSpacing;
        if (len > maxLen) len = maxLen;
        else if (len < minLen) len = minLen;
        dir.normalize();
        pos.arrow.setDirection(dir);
        pos.arrow.setLength(len);
    });
}

export function fieldProbe(probe) {
    probe.force.setScalar(0);

    particleList.forEach((p, idx) => {
        physics.interact(probe, p, true);
        p.force.setScalar(0);
    });

    // let ret = probe.force.clone();
    // probe.force.setScalar(0);

    return probe.force;
}