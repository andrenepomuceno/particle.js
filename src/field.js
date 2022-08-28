import { ArrowHelper, Vector3, Color } from 'three';
import { Particle } from './physics.js'
import { particleList, physics } from './simulation.js'
import { cubeGenerator } from './helpers'

let fieldVectorList = [];
let globalSpacing = 0;

let updateProbe = {
    m: 0,
    q: 0,
    nq: 0
}
export function fieldProbeConfig(m = 0, q = 0, nq = 0) {
    updateProbe.m = m;
    updateProbe.q = q;
    updateProbe.nq = nq;
}

export function fieldMove(direction, scale = 1.0) {
    //TODO
    fieldVectorList.forEach((pos) => {
        pos.add(direction);
        pos.arrow.position.add(direction);
        pos.multiplyScalar(scale);
    });
}

export function fieldSetup(graphics, spacing = 10, gridSize = [10, 10, 10], center = new Vector3()) {
    fieldCleanup(graphics);
    globalSpacing = spacing;
    cubeGenerator((x, y, z) => {
        let pos = new Vector3(x, y, z).add(center);
        fieldVectorList.push(pos);
        pos.arrow = new ArrowHelper(
            new Vector3(1, 0, 0),
            pos,
            0,
            0xffffff
        );
        graphics.scene.add(pos.arrow);
    }, spacing, gridSize, center);
}

export function fieldCleanup(graphics) {
    fieldVectorList.forEach((pos) => {
        graphics.scene.remove(pos.arrow);
    });
    fieldVectorList = [];
}

export function fieldUpdate() {
    const forceMin = 0;
    const forceMax = 1e3;

    let probe = new Particle();
    probe.mass = updateProbe.m;
    probe.charge = updateProbe.q;
    probe.nearCharge = updateProbe.nq;
    fieldVectorList.forEach((pos) => {
        probe.position = pos;
        let force = fieldProbe(probe);

        let forceLen = force.length();
        if (forceLen > forceMax) forceLen = forceMax;
        else if (forceLen < forceMin) forceLen = forceMin;
        let forceLenRel = (forceLen - forceMin) / (forceMax - forceMin);

        if (forceLenRel < 1e-3)
            pos.arrow.setColor(new Color('hsl(0, 100%, ' + Math.round(50e3 * forceLenRel) + '%)'));
        else if (forceLenRel < 0.99)
            pos.arrow.setColor(new Color('hsl(' + 360 * forceLenRel + ', 100%, 50%)'));
        else
            pos.arrow.setColor(new Color(0xffffff));

        force.normalize();
        pos.arrow.setDirection(force);

        forceLenRel = globalSpacing / 2;
        let headh = forceLenRel / 2;
        let headw = headh / 2
        pos.arrow.setLength(forceLenRel, headh, headw);
    });
}

export function fieldProbe(probe) {
    probe.force.setScalar(0);

    particleList.forEach((p, idx) => {
        //if (p.position.clone().sub(probe.position).length() > 5e3) return;
        physics.interact(probe, p, true);
        p.force.setScalar(0);
    });

    // let ret = probe.force.clone();
    // probe.force.setScalar(0);

    return probe.force;
}