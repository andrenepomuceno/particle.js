import { Vector3 } from 'three';

function calcTextureWidth(n) {
    return Math.max(Math.round(Math.ceil(Math.sqrt(n)) / 2) * 2, 2);
}

class HeadlessScene {
    constructor() {
        this.children = [];
    }

    add(object) {
        this.children.push(object);
    }

    remove(object) {
        this.children = this.children.filter((child) => child !== object);
    }
}

class HeadlessControls {
    constructor(camera) {
        this.camera = camera;
        this.target = new Vector3();
        this.enableRotate = true;
        this.autoRotate = false;
    }

    update() {}

    saveState() {}

    addEventListener() {}

    getDistance() {
        return this.camera.position.distanceTo(this.target);
    }
}

class HeadlessCamera {
    constructor() {
        this.position = new Vector3();
        this.aspect = 1;
        this.fov = 50;
        this.zoom = 1;
    }

    updateProjectionMatrix() {}
}

export class GraphicsHeadless {
    constructor({ maxParticles = 10000, width = 1280, height = 720 } = {}) {
        this.width = width;
        this.height = height;
        this.scene = new HeadlessScene();
        this.camera = new HeadlessCamera();
        this.controls = new HeadlessControls(this.camera);
        this.renderer = {
            domElement: {},
            capabilities: { isWebGL2: true },
            setPixelRatio() {},
            setSize() {},
            render() {},
            readRenderTargetPixels() {},
        };

        this.metrics = this.createMetrics();
        this.setMaxParticles(maxParticles);
        this.cleanup();
    }

    createMetrics() {
        return {
            drawCalls: 0,
            shaderUpdates: 0,
            uniformUpdates: 0,
            computeCalls: 0,
            renderCalls: 0,
            readbacks: 0,
            captures: 0,
        };
    }

    cleanup() {
        this.initialized = false;
        this.scene.children = [];
        this.particleList = [];
        this.physics = undefined;
        this.renderTarget = 0;
        this.pointsGeometry = {
            setAttribute() {},
        };
        this.pointsUniforms = {};
        this.axisWidth = 1e3;
    }

    cameraDefault() {
        this.controls.enableRotate = true;
        this.cameraSetup(3000, 30, 45);
    }

    cameraSetup(distance, phi, theta) {
        this.cameraDistance = distance ?? this.cameraDistance ?? 3000;
        this.cameraPhi = phi ?? this.cameraPhi ?? 30;
        this.cameraTheta = theta ?? this.cameraTheta ?? 45;

        this.camera.position.set(0, 0, this.cameraDistance);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
        this.controls.saveState();
    }

    onWindowResize(windowLike) {
        this.width = windowLike.innerWidth;
        this.height = windowLike.innerHeight;
        this.camera.aspect = this.width / this.height;
    }

    setMaxParticles(n) {
        n = Math.max(n, 1);
        this.textureWidth = calcTextureWidth(n);
        this.maxParticles = this.textureWidth * this.textureWidth;
    }

    drawParticles(particleList, physics, shaderUpdate = false) {
        this.metrics.drawCalls++;
        if (shaderUpdate) this.metrics.shaderUpdates++;

        this.particleList = particleList || this.particleList || [];
        this.physics = physics || this.physics;

        if (this.particleList.length > this.maxParticles) {
            throw new Error('particleList.length ' + this.particleList.length + ' > maxParticles ' + this.maxParticles);
        }

        this.initialized = true;
    }

    compute() {
        if (!this.initialized) return;
        this.metrics.computeCalls++;
        this.renderTarget++;
    }

    render() {
        this.metrics.renderCalls++;
    }

    readbackParticleData() {
        this.metrics.readbacks++;
    }

    fillPointColors() {}

    fillPointRadius() {}

    fillPhysicsUniforms() {
        this.metrics.uniformUpdates++;
    }

    updateFieldUniform(maxVelocity, avgVelocity) {
        this.maxFieldVelocity = maxVelocity;
        this.avgFieldVelocity = avgVelocity;
    }

    updateAvgVelocity(avgVelocity) {
        this.avgVelocity = avgVelocity;
    }

    showAxis(show = true, mode2D = false, width) {
        this.axisVisible = show;
        this.axisMode2D = mode2D;
        if (width != undefined) this.axisWidth = width;
    }

    drawText(text, size, position, color) {
        const object = { text, size, position, color };
        this.scene.add(object);
        return object;
    }

    drawCaption(text, size, position, color) {
        this.captionMesh = this.drawText(text, size, position, color);
        return this.captionMesh;
    }

    drawCursor(show = true, radius = 100, thickness = 10) {
        if (!show) {
            this.cursorMesh = undefined;
            return undefined;
        }
        this.cursorMesh = { radius, thickness };
        this.scene.add(this.cursorMesh);
        return this.cursorMesh;
    }

    capture() {
        this.metrics.captures++;
    }

    raycast() {
        return undefined;
    }
}
