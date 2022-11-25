import { Vector3 } from 'three';
import { Particle } from '../physics.js'
import { cubeGenerator, sphereGenerator, viewSize } from '../helpers'
import { ParticleType } from '../physics'

function log(msg) {
    console.log("FieldGPU: " + msg);
}

export class FieldGPU {
    constructor(graphics, physics) {
        log("constructor");

        this.graphics = graphics;
        this.physics = physics;
        this.particleList = physics.particleList;

        this.grid = undefined;
        this.size = undefined;
        this.mode = undefined;
        this.probeParam = { m: 1, q: 1, nq: 1 };
        this.firstProbeIdx = undefined;

        this.objectList = [];
    }

    setup(mode, gridPoints) {
        log("setup");
        log("mode = " + mode);

        if (mode == "2d") {
            let [w, _] = viewSize(this.graphics);
            this.size = w;
            this.grid = [
                gridPoints,
                Math.round(gridPoints / this.graphics.camera.aspect),
                1
            ];
        } else if (mode == "3d") {
            let [w, h] = viewSize(this.graphics);
            this.size = Math.min(w, h);
            this.grid = [
                gridPoints,
                gridPoints,
                gridPoints
            ];
        } else if (mode == "update") {
            //return this.update();
            return; // not suported
        }

        this.mode = mode;
        let center = this.graphics.controls.target.clone();
        this.#populateField(center);

        console.log("setup done");
    }

    probeConfig(m = 1, q = 1, nq = 1) {
        log("probeConfig");
        this.probeParam = {
            m: m,
            q: q,
            nq: nq
        }
    }

    update() {
        log("update");
    }

    cleanup() {
        log("cleanup");

        this.objectList.forEach(obj => {
            this.particleList.pop(obj.particle);
        })

        this.objectList = [];

        this.probeConfig();
    }

    probe(probeParticle) {
        //log("probe");
        // TODO
        return new Vector3();
    }

    elementSize() {
        let spacing = this.size / this.grid[0];
        let len = spacing / 2;
        if (this.grid[2] > 1) {
            len /= 2;
        }
        len *= 0.75;
        return len;
    }

    #populateField(center = new Vector3(), mode = "cube") {
        console.log("#populateField");

        let probeCount = this.grid[0] * this.grid[1] * this.grid[2];
        if (this.particleList.length + probeCount > this.graphics.maxParticles) {
            log("error: too many probes: " + probeCount);
            log("free: " + (this.graphics.maxParticles - this.particleList.length));
            return;
        }
        console.log("probeCount = " + probeCount);

        this.firstProbeIdx = this.particleList.length - 1;

        switch (mode) {
            case "sphere":
                sphereGenerator((x, y, z) => {
                    this.#createFieldElement(new Vector3(x, y, z).add(center));
                }, this.size, this.grid);
                break;

            case "cube":
            default:
                cubeGenerator((x, y, z) => {
                    this.#createFieldElement(new Vector3(x, y, z).add(center));
                }, this.size, this.grid);
                break;
        }
    }

    #createFieldElement(position) {
        let p = new Particle();
        p.type = ParticleType.probe;
        p.mass = this.probeParam.m;
        p.charge = this.probeParam.q;
        p.nearCharge = this.probeParam.nq;
        p.position = position;
        p.radius = this.elementSize();
        this.particleList.push(p);

        this.objectList.push({particle: p});
    }
}