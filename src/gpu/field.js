import { Vector3 } from 'three';
import { cubeGenerator, sphereGenerator, viewSize } from '../helpers'
import { Particle, ParticleType } from '../particle.js';

function log(msg) {
    console.log("FieldGPU: " + msg);
}

export class FieldGPU {
    constructor(simulation) {
        log("constructor");

        this.simulation = simulation;
        this.graphics = simulation.graphics;
        this.physics = simulation.physics;
        this.particleList = this.physics.particleList;

        this.grid = [50, 50, 1];
        this.size = undefined;
        this.mode = '2d';
        this.populateMode = undefined;
        this.probeParam = { m: 1, q: 1, nq: 1 };
        this.firstProbeIdx = undefined;

        this.objectList = [];

        this.enabled = false;
    }

    setup(mode, gridPoints, center) {
        log("setup");
        log("mode = " + mode);
        log("gridPoints = " + gridPoints);

        center.z -= 1.0;

        switch (mode) {
            default:
            case '2d':
                {
                    let [w, _] = viewSize(this.graphics);
                    this.size = w;
                    this.grid = [
                        gridPoints,
                        Math.round(gridPoints / this.graphics.camera.aspect),
                        1
                    ];
                }
                break;

            case '3d':
                {
                    let [w, h] = viewSize(this.graphics);
                    this.size = Math.min(w, h);
                    this.grid = [
                        gridPoints,
                        gridPoints,
                        gridPoints
                    ];
                }
                break;
        }

        this.mode = mode;
        if (!this.#populateField(center)) {
            console.log("setup failed");
            return false;
        }

        this.enabled = true;

        console.log("setup done");
        return true;
    }

    probeConfig(m = 1, q = 1, nq = 1) {
        log("probeConfig");
        this.probeParam = {
            m: m,
            q: q,
            nq: nq
        }
    }

    cleanup() {
        log("cleanup");
        this.objectList = [];
        this.enabled = false;
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
            alert("Too many particles!\n" + 
            "Free space needed: " + probeCount);
            return false;
        }
        console.log("probeCount = " + probeCount);

        this.firstProbeIdx = this.particleList.length - 1;
        this.populateMode = mode;

        switch (this.populateMode) {
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

        return true;
    }

    #createFieldElement(position) {
        let p = new Particle();
        p.type = ParticleType.probe;
        p.mass = this.probeParam.m;
        p.charge = this.probeParam.q;
        p.nuclearCharge = this.probeParam.nq;
        p.position = position;

        p.radius = this.elementSize();
        this.particleList.push(p);
        this.objectList.push(p);
    }

    #updateFieldElement(idx, x, y, z, center = new Vector3()) {
        let particle = this.objectList[idx++];
        particle.mass = this.probeParam.m;
        particle.charge = this.probeParam.q;
        particle.nuclearCharge = this.probeParam.nq;
        particle.position.set(x, y, z).add(center);

        particle.radius = this.elementSize();
    }

    resize(center) {
        log("resize");
        log("center: ", center);

        if (this.objectList.length == 0) return;

        center.z -= 1.0;

        switch (this.mode) {
            case '2d':
                {
                    let [w, _] = viewSize(this.graphics);
                    this.size = w;
                }
                break;

            case '3d':
                {
                    let [w, h] = viewSize(this.graphics);
                    this.size = Math.min(w, h);
                }
                break;

            default:
                return;
        }

        let idx = 0;
        switch (this.populateMode) {
            case "sphere":
                sphereGenerator((x, y, z) => {
                    this.#updateFieldElement(idx++, x, y, z, center);
                }, this.size, this.grid);
                break;

            case "cube":
            default:
                cubeGenerator((x, y, z) => {
                    this.#updateFieldElement(idx++, x, y, z, center);
                }, this.size, this.grid);
                break;
        }

        this.simulation.drawParticles();
    }
}