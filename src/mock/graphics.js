import {
    Vector3,
    WebGLRenderer,
    Scene,
    PerspectiveCamera,
    ArrowHelper,
    Raycaster,
    ShaderMaterial,
    BufferGeometry,
    Float32BufferAttribute,
    Points,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
let CanvasCapture = null;
if (ENV?.record === true) {
    CanvasCapture = require('canvas-capture').CanvasCapture;
}

import { computePosition, generateComputeVelocity } from './shaders/computeShader.glsl.js';
import { particleVertexShader, generateParticleShader } from './shaders/particleShader.glsl.js';
import { exportFilename, sphericalToCartesian, getCameraConstant } from '../helpers';
import { ParticleType } from '../particle.js';

const textureWidth0 = Math.round(Math.sqrt(ENV?.maxParticles) / 16) * 16;

function log(msg) {
    console.log("Graphics (Mock): " + msg);
}

export class GraphicsGPU {
    constructor() {
        log("constructor");

        this.cleanup();

        this.particle3d = true;
        this.arrow3d = true;
        this.particleShaderMode = 'spherow';

        this.textureWidth = textureWidth0;
        this.maxParticles = this.textureWidth * this.textureWidth;

        this.axisObject = undefined;
        this.showAxis();

        log("constructor done");
    }

    raycast(pointer) {

    }

    cameraDefault() {
        log("cameraDefault");
        this.cameraSetup(3000, 30, 45);
    }

    cameraSetup(distance, phi, theta) {
        log("cameraSetup");
        log("distance = " + distance + " phi = " + phi + " theta = " + theta);
    }

    showAxis(show = true, axisLineWidth = 1e3, headLen = 0.2 * axisLineWidth) {

    }

    drawParticles(particleList, physics) {
        log("drawParticles");
        log("textureWidth = " + this.textureWidth);

        this.particleList = (particleList || this.particleList);
        this.physics = (physics || this.physics);

        if (this.particleList.length > this.maxParticles) {
            let msg = "particleList.length {0} > maxParticles {1}".replace("{0}", this.particleList.length).replace("{1}", this.maxParticles);
            log(msg);
            alert("ERROR: too many particles!");

            this.particleList = undefined;
            this.physics = undefined;
            return;
        }

        this.initialized = true;
    }

    update() {

    }

    onWindowResize(window) {

    }

    cleanup() {
        log("cleanup");

        this.initialized = false;

        this.physics = undefined;
        this.particleList = undefined;

        this.gpuCompute = undefined;
        this.positionVariable = undefined;
        this.velocityVariable = undefined;
        this.renderTarget = 0;

        this.pointsObject = undefined;
        this.pointsUniforms = undefined;
        this.pointsGeometry = undefined;
    }

    setMaxParticles(n) {
        log("setMaxParticles");
        this.textureWidth = Math.round(Math.sqrt(n) / 16) * 16;
        this.maxParticles = this.textureWidth * this.textureWidth;
    }

    capture(name) {
        if (ENV?.record != true) return;

        if (CanvasCapture.isRecording()) {
            CanvasCapture.stopRecord();
            return;
        }

        let element = this.renderer.domElement;//document.getElementById('container');
        CanvasCapture.init(
            element,
            {
                showRecDot: true,
                verbose: true
            },
        );

        CanvasCapture.beginVideoRecord({
            format: CanvasCapture.WEBM,
            fps: 60,
            name: exportFilename(name),
        });
    }

    /* GPGPU Stuff */

    fillPhysicsUniforms() {

    }

    fillPointColors() {
        log("fillPointColors");

        if (!this.particleList) {
            log("particle list not loaded!");
            return;
        }
    }

    fillPointRadius() {
        log("#fillPointRadius");

        if (!this.particleList) {
            log("particle list not loaded!");
            return;
        }
    }

    compute() {

    }

    readbackParticleData() {
        log("readbackParticleData");

        if (!this.initialized) {
            log("not initialized");
            return;
        }
    }
}