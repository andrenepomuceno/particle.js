import {
    WebGLRenderer,
    Scene,
    PerspectiveCamera,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const textureWidth0 = Math.round(Math.sqrt(ENV?.maxParticles) / 16) * 16;

function log(msg) {
    console.log("Graphics (Mock): " + msg);
}

export class GraphicsMock {
    constructor() {
        log('constructor');

        this.cleanup();

        this.particle3d = true;
        this.arrow3d = true;
        this.particleShaderMode = 'spherow';

        this.textureWidth = textureWidth0;
        this.maxParticles = this.textureWidth * this.textureWidth;

        this.renderer = new WebGLRenderer();
        this.scene = new Scene();
        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1e9);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.axisObject = undefined;

        log('constructor done');
    }

    raycast(pointer) {

    }

    cameraDefault() {
        log('cameraDefault');
        this.cameraSetup(3000, 30, 45);
    }

    cameraSetup(distance, phi, theta) {
        log('cameraSetup');
        log("distance = " + distance + " phi = " + phi + " theta = " + theta);
    }

    showAxis(show, mode2D) {

    }

    drawParticles(particleList, physics) {
        log('drawParticles');
        log("textureWidth = " + this.textureWidth);

        this.particleList = (particleList || this.particleList);
        this.physics = (physics || this.physics);

        if (this.particleList.length > this.maxParticles) {
            let msg = "particleList.length {0} > maxParticles {1}".replace("{0}", this.particleList.length).replace("{1}", this.maxParticles);
            log(msg);
            alert("Error: too many particles!");

            this.particleList = undefined;
            this.physics = undefined;
            return;
        }

        this.initialized = true;
    }

    render() {

    }

    onWindowResize(window) {

    }

    cleanup() {
        log('cleanup');

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
        log('setMaxParticles');
        this.textureWidth = Math.round(Math.sqrt(n) / 16) * 16;
        this.maxParticles = this.textureWidth * this.textureWidth;
    }

    capture(name) {

    }

    /* GPGPU Stuff */

    fillPhysicsUniforms() {

    }

    fillPointColors() {
        log('fillPointColors');

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
        log('readbackParticleData');

        if (!this.initialized) {
            log('not initialized');
            return;
        }
    }

    updateFieldUniform(maxVelocity, avgVelocity) {
        
    }

    updateAvgVelocity(avgVelocity) {
        
    }
}