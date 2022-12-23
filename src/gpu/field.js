import { Vector3 } from 'three';
import { cubeGenerator, sphereGenerator, viewSize } from '../helpers'
import { Particle, ParticleType } from '../particle.js';

function log(msg) {
    console.log("FieldGPU: " + msg);
}

const arrowMaxLen = 1e3;
const arrowPadding = 0.75;

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

    calcGridSize(width) {
        let size = 0;
        let grid = undefined;

        log("width = " + width);

        switch (this.mode) {
            default:
            case '2d':
                {
                    let [w, _] = viewSize(this.graphics);
                    size = w;
                    grid = [
                        width,
                        Math.round(width / this.graphics.camera.aspect),
                        1
                    ];
                }
                break;

            case '3d':
                {
                    let [w, h] = viewSize(this.graphics);
                    size = Math.min(w, h);
                    grid = [
                        width,
                        width,
                        width
                    ];
                }
                break;
        }
        return {
            size,
            grid
        }
    }

    probeConfig(m = 1, q = 1, nq = 1) {
        log("probeConfig");
        this.probeParam = {
            m: m,
            q: q,
            nq: nq
        }
    }

    setup(mode, grid, center = new Vector3()) {
        log("setup");
        log("mode = " + mode);
        log("gridPoints = " + grid);

        this.mode = mode;

        let ret = this.calcGridSize(grid);
        this.size = ret.size;
        this.grid = ret.grid;

        if (!this.#populateField(center)) {
            log("setup failed");
            return false;
        }

        this.enabled = true;

        return true;
    }

    resize(center) {
        log("resize");
        log("center: ", center);

        if (this.objectList.length == 0) return;

        let ret = this.calcGridSize(this.grid[0]);
        this.size = ret.size;

        let idx = 0;
        switch (this.populateMode) {
            case "sphere":
                sphereGenerator((x, y, z) => {
                    this.#updateFieldElement(this.objectList[idx++], x, y, z, center);
                }, this.size, this.grid);
                break;

            case "cube":
            default:
                cubeGenerator((x, y, z) => {
                    this.#updateFieldElement(this.objectList[idx++], x, y, z, center);
                }, this.size, this.grid);
                break;
        }

        this.simulation.drawParticles();
    }

    cleanup() {
        log("cleanup");
        this.objectList = [];
        this.enabled = false;
    }

    checkGridSize(width) {
        log('checkGridSize');
        log('width = ' + width);
        let ret = this.calcGridSize(width);
        let probeCount = ret.grid[0] * ret.grid[1] * ret.grid[2];
        log("probeCount = " + probeCount);
        let total = this.particleList.length - this.objectList.length + probeCount;
        log("total = " + total);
        if (total > this.graphics.maxParticles) {
            return false;
        }
        return true;
    }

    #populateField(center = new Vector3(), mode = "cube") {
        log("#populateField");

        if (!this.checkGridSize(this.grid[0])) {
            let probeCount = this.grid[0] * this.grid[1] * this.grid[2];
            log("error: field is to big " + probeCount);
            alert('Field is too big! ' + probeCount);
            return false;
        }        

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

    elementSize() {
        let spacing = this.size / this.grid[0];
        let radius = spacing / 2;
        if (this.grid[2] > 1) {
            radius /= 2;
        }
        radius *= arrowPadding;
        radius = Math.min(radius, arrowMaxLen);
        return radius;
    }

    #createFieldElement(position) {
        let p = new Particle();
        p.type = ParticleType.probe;

        this.#updateFieldElement(p, position.x, position.y, position.z);
        p.radius = this.elementSize();

        this.particleList.push(p);
        this.objectList.push(p);
    }

    #updateFieldElement(particle, x, y, z, center = new Vector3()) {
        particle.mass = this.probeParam.m;
        particle.charge = this.probeParam.q;
        particle.nuclearCharge = this.probeParam.nq;
        particle.position.set(x, y, z)
            .add(center)
            .sub(new Vector3(0, 0, 2 * this.simulation.particleRadius));
        particle.radius = this.elementSize();
    }
}