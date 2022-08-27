import { ArrowHelper, Vector3, Color } from 'three';
import { Particle } from './physics.js'
import { particleList, physics } from './simulation.js'

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
    fieldVectorList.forEach((pos) => {
        pos.add(direction);
        pos.multiplyScaler(scale);
    });
}

export function fieldSetup(graphics, spacing = 10, gridSize = [10, 10, 10], center = new Vector3()) {
    globalSpacing = spacing;
    for (let x = 0; x < gridSize[0]; x++) {
        let xPos = (x - gridSize[0] / 2 + 0.5) * spacing;
        for (let y = 0; y < gridSize[1]; y++) {
            let yPos = (y - gridSize[1] / 2 + 0.5) * spacing;
            for (let z = 0; z < gridSize[2]; z++) {
                let zPos = (z - gridSize[2] / 2 + 0.5) * spacing;
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

export function fieldCleanup(graphics) {
    fieldVectorList.forEach((pos) => {
        graphics.scene.remove(pos.arrow);
    });
    fieldVectorList = [];
}

export function fieldUpdate() {
    const forceMin = 0;
    const forceMax = globalSpacing;

    let probe = new Particle();
    probe.mass = updateProbe.m;
    probe.charge = updateProbe.q;
    probe.nearCharge = updateProbe.nq;
    fieldVectorList.forEach((pos) => {
        probe.position = pos;
        let force = fieldProbe(probe);

        let forceAmplitude = force.length();
        if (forceAmplitude > forceMax) forceAmplitude = forceMax;
        else if (forceAmplitude < forceMin) forceAmplitude = forceMin;
        let amplitude = (forceAmplitude - forceMin) / (forceMax - forceMin);

        if (amplitude < 1e-3)
            pos.arrow.setColor(new Color('hsl(0, 100%, ' + Math.round(50e3*amplitude) + '%)'));
        else if (amplitude < 0.99)
            pos.arrow.setColor(new Color('hsl(' + 360 * amplitude + ', 100%, 50%)'));
        else
            pos.arrow.setColor(new Color(0xffffff));

        force.normalize();
        pos.arrow.setDirection(force);

        amplitude = globalSpacing / 4;
        pos.arrow.setLength(amplitude, amplitude / 3, amplitude / 10);
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