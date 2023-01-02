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

import { generateComputePosition, generateComputeVelocity } from './shaders/computeShader.glsl.js';
import { particleVertexShader, generateParticleShader } from './shaders/particleShader.glsl.js';
import { exportFilename, sphericalToCartesian, getCameraConstant, mouseToScreenCoord, mouseToWorldCoord } from '../helpers';
import { ParticleType } from '../particle.js';

const textureWidth0 = Math.round(Math.sqrt(ENV?.maxParticles) / 16) * 16;

function log(msg) {
    console.log("Graphics (GPU): " + msg);
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

        this.renderer = new WebGLRenderer();
        this.renderer.powerPreference = 'high-performance';
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById("container").appendChild(this.renderer.domElement);

        this.scene = new Scene();
        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1e-3, 1e12);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.raycaster = new Raycaster();
        this.raycaster.params.Points.threshold = 1;

        this.axisObject = undefined;

        log("constructor done");
    }

    raycast(core, pointer) {
        log('raycast');
        
        if (core.simulation.mode2D == false) return; //3d not supported for now
        
        const coord = mouseToWorldCoord(pointer, this.camera);
        this.readbackParticleData();

        let particle = undefined;
        let dMin = 0;
        this.particleList.forEach(p => {
            let dp = coord.clone().sub(p.position);
            let d = dp.length() - 0.75 * p.radius;
            if (d <= 0) {
                if (d < dMin) {
                    dMin = d;
                    particle = p;
                }
            }
        });
        
        return particle;
    }

    cameraDefault() {
        log("cameraDefault");
        this.controls.enableRotate = true;
        this.cameraSetup(3000, 30, 45);
    }

    cameraSetup(distance, phi, theta) {
        log("cameraSetup");
        log("distance = " + distance + " phi = " + phi + " theta = " + theta);

        this.cameraDistance = (distance || this.cameraDistance);
        this.cameraPhi = (phi || this.cameraPhi);
        this.cameraTheta = (theta || this.cameraTheta);

        let [x, y, z] = sphericalToCartesian(this.cameraDistance, this.cameraPhi * Math.PI / 180.0, this.cameraTheta * Math.PI / 180.0);
        this.camera.position.set(x, y, z);
        //this.camera.lookAt(0, 0, 0);

        this.controls.target.set(0, 0, 0);
        this.controls.update();
        this.controls.saveState();
    }

    showAxis(show = true, mode2D = false, axisLineWidth = 1e3) {
        log('showAxis ' + show + ' mode2D ' + mode2D + ' width ' + axisLineWidth);

        let headLen = 0.2 * axisLineWidth;

        if (show) {
            if (this.axisObject != undefined) {
                this.showAxis(false);
            }
            
            this.axisObject = !mode2D ? [
                new ArrowHelper(new Vector3(1, 0, 0), new Vector3(), axisLineWidth, 0xff0000, headLen),
                new ArrowHelper(new Vector3(0, 1, 0), new Vector3(), axisLineWidth, 0x00ff00, headLen),
                new ArrowHelper(new Vector3(0, 0, 1), new Vector3(), axisLineWidth, 0x0000ff, headLen)
            ] : [
                new ArrowHelper(new Vector3(1, 0, 0), new Vector3(), axisLineWidth, 0xff0000, headLen),
                new ArrowHelper(new Vector3(0, 1, 0), new Vector3(), axisLineWidth, 0x00ff00, headLen)
            ]; 

            this.axisObject.forEach(arrow => {
                this.scene.add(arrow);
            });
        } else {
            this.axisObject.forEach(arrow => {
                this.scene.remove(arrow);
                arrow.dispose();
            });
            this.axisObject = undefined;
        }
    }

    drawParticles(particleList, physics) {
        log("drawParticles");
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

        this.particlePosition = new Float32Array(4 * this.textureWidth * this.textureWidth);
        this.particleVelocity = new Float32Array(4 * this.textureWidth * this.textureWidth);

        this.#initComputeRenderer();
        this.#initPointsObject();

        this.initialized = true;
    }

    render() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        if (ENV?.record && CanvasCapture.isRecording()) CanvasCapture.recordFrame();
    }

    onWindowResize(window) {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        if (this.initialized == true) {
            this.pointsUniforms['uCameraConstant'].value = getCameraConstant(this.camera);
        }
    }

    cleanup() {
        log("cleanup");

        this.initialized = false;

        if (this.scene) {
            for (let i = this.scene.children.length - 1; i >= 0; i--) {
                let obj = this.scene.children[i];
                this.scene.remove(obj);
            }
        }

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

    #initComputeRenderer() {
        log("#initComputeRenderer");

        this.gpuCompute = new GPUComputationRenderer(this.textureWidth, this.textureWidth, this.renderer);
        let gpuCompute = this.gpuCompute;

        if (this.renderer.capabilities.isWebGL2 === false) {
            gpuCompute.setDataType(THREE.HalfFloatType);
        }

        this.dtProperties = gpuCompute.createTexture();
        this.dtPosition = gpuCompute.createTexture();
        this.dtVelocity = gpuCompute.createTexture();

        this.#fillTextures();

        if (this.physics.velocityShader == undefined) {
            this.physics.velocityShader = generateComputeVelocity(
                this.physics.nuclearPotential,
                this.physics.useDistance1,
                this.physics.useBoxBoundary,
                this.physics.enableBoundary);
            this.physics.positionShader = generateComputePosition(this.physics.enableBoundary, this.physics.useBoxBoundary);
        }

        this.velocityVariable = gpuCompute.addVariable('textureVelocity', this.physics.velocityShader, this.dtVelocity);
        this.positionVariable = gpuCompute.addVariable('texturePosition', this.physics.positionShader, this.dtPosition);

        gpuCompute.setVariableDependencies(this.velocityVariable, [this.velocityVariable, this.positionVariable]);
        gpuCompute.setVariableDependencies(this.positionVariable, [this.velocityVariable, this.positionVariable]);

        this.fillPhysicsUniforms();
        this.velocityVariable.material.uniforms['textureProperties'] = { value: this.dtProperties };

        const error = gpuCompute.init();
        if (error !== null) {
            console.error(error);
        }
    }

    fillPhysicsUniforms() {
        let physics = this.physics;
        let uniforms = this.velocityVariable.material.uniforms;
        uniforms['minDistance2'] = { value: physics.minDistance2 };
        uniforms['massConstant'] = { value: physics.massConstant };
        uniforms['chargeConstant'] = { value: physics.chargeConstant };
        uniforms['nuclearForceConstant'] = { value: physics.nuclearForceConstant };
        uniforms['nuclearForceRange'] = { value: physics.nuclearForceRange };
        uniforms['nuclearForceRange2'] = { value: Math.pow(physics.nuclearForceRange, 2) };
        uniforms['forceConstant'] = { value: physics.forceConstant };
        uniforms['boundaryDistance'] = { value: physics.boundaryDistance };
        uniforms['boundaryDamping'] = { value: physics.boundaryDamping };

        uniforms = this.positionVariable.material.uniforms;
        uniforms['boundaryDistance'] = { value: physics.boundaryDistance };
    }

    #fillTextures() {
        log("#fillTextures");

        const propsArray = this.dtProperties.image.data;
        const posArray = this.dtPosition.image.data;
        const velocityArray = this.dtVelocity.image.data;

        let particles = this.particleList.length;
        let maxParticles = propsArray.length / 4;

        if (particles > maxParticles) {
            alert("Error: Too many particles! " + particles + " > " + maxParticles);
            return;
        }

        this.particleList.forEach((p, i) => {
            let offset4 = 4 * i;
            propsArray[offset4 + 0] = p.id;
            propsArray[offset4 + 1] = p.mass;
            propsArray[offset4 + 2] = p.charge;
            propsArray[offset4 + 3] = p.nuclearCharge;

            posArray[offset4 + 0] = p.position.x;
            posArray[offset4 + 1] = p.position.y;
            posArray[offset4 + 2] = p.position.z;
            posArray[offset4 + 3] = p.type;

            velocityArray[offset4 + 0] = p.velocity.x;
            velocityArray[offset4 + 1] = p.velocity.y;
            velocityArray[offset4 + 2] = p.velocity.z;
            velocityArray[offset4 + 3] = p.collisions;
        });

        for (let k = particles; k < maxParticles; k++) {
            let offset4 = 4 * k;

            propsArray[offset4 + 0] = 0;
            propsArray[offset4 + 1] = 0;
            propsArray[offset4 + 2] = 0;
            propsArray[offset4 + 3] = 0;

            posArray[offset4 + 0] = 0;
            posArray[offset4 + 1] = 0;
            posArray[offset4 + 2] = 0;
            posArray[offset4 + 3] = ParticleType.undefined;

            velocityArray[offset4 + 0] = 0;
            velocityArray[offset4 + 1] = 0;
            velocityArray[offset4 + 2] = 0;
            velocityArray[offset4 + 3] = 0;
        }
    }

    #initPointsObject() {
        log("#initPointsObject");

        let current = this.renderTarget % 2;
        this.pointsUniforms = {
            'texturePosition': { value: this.positionVariable.renderTargets[current].texture },
            'textureVelocity': { value: this.velocityVariable.renderTargets[current].texture },
            'uCameraConstant': { value: getCameraConstant(this.camera) },
            'uAvgVelocity': { value: this.physics.avgVelocity },
            'uMaxFieldVel': { value: 0.0 },
            'uAvgFieldVel': { value: 0.0 },
        };

        const pointsMaterial = new ShaderMaterial({
            uniforms: this.pointsUniforms,
            vertexShader: particleVertexShader,
            fragmentShader: generateParticleShader(this.particle3d, this.arrow3d, this.particleShaderMode),
        });
        pointsMaterial.extensions.drawBuffers = true;

        this.pointsGeometry = new BufferGeometry();
        this.fillPointColors();
        this.#fillPointPositions();
        this.fillPointRadius();
        this.#fillPointUVs();

        if (this.pointsObject) {
            this.scene.remove(this.pointsObject);
        }
        this.pointsObject = new Points(this.pointsGeometry, pointsMaterial);
        this.pointsObject.frustumCulled = false;
        this.pointsObject.matrixAutoUpdate = false;
        this.pointsObject.updateMatrix();

        this.scene.add(this.pointsObject);
    }

    fillPointColors() {
        log("fillPointColors");

        if (!this.particleList) {
            log("particle list not loaded!");
            return;
        }

        let colors = [];
        this.particleList.forEach((p, i) => {
            colors.push(p.color.r, p.color.g, p.color.b);
        });

        this.pointsGeometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    }

    #fillPointPositions() {
        log("#fillPointPositions");

        if (!this.particleList)
            return;

        let positions = [];
        this.particleList.forEach((p, i) => {
            positions.push(p.position.x, p.position.y, p.position.z);
        });

        this.pointsGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    }

    fillPointRadius() {
        log("#fillPointRadius");

        if (!this.particleList) {
            log("particle list not loaded!");
            return;
        }

        let radius = [];
        this.particleList.forEach((p, i) => {
            radius.push(p.radius);
        });

        this.pointsGeometry.setAttribute('radius', new Float32BufferAttribute(radius, 1));
    }

    #fillPointUVs() {
        log("#fillPointUVs");

        const uvs = new Float32Array(2 * this.maxParticles);
        let particles = this.particleList.length;
        let p = 0;
        for (let j = 0; j < this.textureWidth; j++) {
            for (let i = 0; i < this.textureWidth; i++) {
                let offset = 2 * p;
                let u = i / (this.textureWidth - 1);
                let v = j / (this.textureWidth - 1);
                uvs[offset + 0] = u;
                uvs[offset + 1] = v;
                /*uvs[p++] = u;
                uvs[p++] = v;*/

                if (p < particles) {
                    this.particleList[p].uv = [u, v];
                }

                p++;
            }
        }
        this.pointsGeometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    }

    compute() {
        if (!this.initialized) return;

        let current = (this.renderTarget % 2);
        let target = (this.renderTarget + 1) % 2;
        ++this.renderTarget;

        let velocityVariable = this.velocityVariable;
        let positionVariable = this.positionVariable;
        let gpuCompute = this.gpuCompute;

        velocityVariable.material.uniforms['textureVelocity'].value = velocityVariable.renderTargets[current].texture;
        velocityVariable.material.uniforms['texturePosition'].value = positionVariable.renderTargets[current].texture;
        gpuCompute.doRenderTarget(velocityVariable.material, velocityVariable.renderTargets[target]);

        positionVariable.material.uniforms['textureVelocity'].value = velocityVariable.renderTargets[target].texture;
        positionVariable.material.uniforms['texturePosition'].value = positionVariable.renderTargets[current].texture;
        gpuCompute.doRenderTarget(positionVariable.material, positionVariable.renderTargets[target]);

        this.pointsUniforms['texturePosition'].value = positionVariable.renderTargets[target].texture;
        this.pointsUniforms['textureVelocity'].value = velocityVariable.renderTargets[target].texture;
    }

    readbackParticleData() {
        log("readbackParticleData");

        if (!this.initialized) {
            log("not initialized");
            return;
        }

        let particlePosition = this.particlePosition;
        let particleVelocity = this.particleVelocity;

        let current = (this.renderTarget + 0) % 2;

        let texture = this.positionVariable.renderTargets[current];
        this.renderer.readRenderTargetPixels(texture, 0, 0, this.textureWidth, this.textureWidth, particlePosition);

        texture = this.velocityVariable.renderTargets[current];
        this.renderer.readRenderTargetPixels(texture, 0, 0, this.textureWidth, this.textureWidth, particleVelocity);

        let positions = [];
        let i = 0;
        this.particleList.forEach((p) => {
            let offset = 4 * i++;

            p.position.set(particlePosition[offset + 0], particlePosition[offset + 1], particlePosition[offset + 2])
            positions.push(p.position.x, p.position.y, p.position.z);

            p.velocity.set(particleVelocity[offset + 0], particleVelocity[offset + 1], particleVelocity[offset + 2])
            p.collisions = particleVelocity[offset + 3];
        });

        this.pointsGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    }

    updateFieldUniform(maxVelocity, avgVelocity) {
        this.pointsUniforms['uMaxFieldVel'].value = maxVelocity;
        this.pointsUniforms['uAvgFieldVel'].value = avgVelocity;
    }

    updateAvgVelocity(avgVelocity) {
        this.pointsUniforms['uAvgVelocity'].value = avgVelocity;
    }
}