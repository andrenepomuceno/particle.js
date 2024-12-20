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
    Mesh,
    MeshBasicMaterial,
    RingGeometry,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
let CanvasCapture = null;
if (ENV?.record === true) {
    CanvasCapture = require('canvas-capture').CanvasCapture;
}

import { generateComputePosition, generateComputeVelocity } from './shaders/computeShader.glsl.js';
import { particleVertexShader, generateParticleShader } from './shaders/particleShader.glsl.js';
import { generateExportFilename, sphericalToCartesian, getCameraConstant, mouseToScreenCoord, mouseToWorldCoord } from './helpers.js';
import { ParticleType } from './particle.js';

function calcTextWidth(n) {
    return Math.max(Math.round(Math.ceil(Math.sqrt(n)) / 2) * 2, 2);
}

const textureWidth0 = calcTextWidth(ENV?.maxParticles);

function log(msg) {
    let timestamp = new Date().toISOString();
    console.log(timestamp + " | Graphics: " + msg);
}

export class GraphicsGPU {
    constructor() {
        log('constructor');

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
        //this.renderer.logarithmicDepthBuffer = true;

        this.scene = new Scene();
        this.camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1e9);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.zoomSpeed = 1.0;
        this.controls.zoomToCursor = false;
        this.controls.update();

        // this.raycaster = new Raycaster();

        this.fontLoader = new FontLoader();

        log('constructor done');
    }

    cleanup() {
        log('cleanup');

        this.initialized = false;

        if (this.scene) {
            for (let i = this.scene.children.length - 1; i >= 0; i--) {
                let obj = this.scene.children[i];
                this.scene.remove(obj);
                //obj.dispose();
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

        this.axisWidth = 1e3;
        this.axisObject = undefined;
        this.labelMesh = undefined;
        this.labelText = this.axisWidth.toFixed(1) + 'u';

        this.cursorMesh = undefined;
        this.captionMesh = undefined;
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
        log('cameraDefault');
        this.controls.enableRotate = true;
        this.cameraSetup(3000, 30, 45);
    }

    cameraSetup(distance, phi, theta) {
        log('cameraSetup');
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

    showAxis(show = true, mode2D = false, width, label = true, labelText) {
        log('showAxis ' + show + ' mode2D ' + mode2D + ' width ' + width + ' label ' + label + ' labelText "' + labelText + '"');

        if (width == undefined) width = this.axisWidth;
        else this.axisWidth = width;
        let headLen = 0.25 * width;

        if (show) {
            if (this.axisObject != undefined) {
                this.showAxis(false);
            }

            this.axisObject = !mode2D ? [
                new ArrowHelper(new Vector3(1, 0, 0), new Vector3(), width, 0xff0000, headLen),
                new ArrowHelper(new Vector3(0, 1, 0), new Vector3(), width, 0x00ff00, headLen),
                new ArrowHelper(new Vector3(0, 0, 1), new Vector3(), width, 0x0000ff, headLen)
            ] : [
                new ArrowHelper(new Vector3(1, 0, 0), new Vector3(), width, 0xff0000, headLen),
                new ArrowHelper(new Vector3(0, 1, 0), new Vector3(), width, 0x00ff00, headLen),
            ];

            this.axisObject.forEach(arrow => {
                this.scene.add(arrow);
            });

            if (label == true) {
                if (labelText == undefined) labelText = this.labelText;
                else this.labelText = labelText;

                if (this.font == undefined) {
                    this.fontLoader.load('fonts/default.typeface.json', (font) => {
                        this.font = font;
                        this.drawAxisLabel(mode2D, width, labelText);
                    });
                } else {
                    this.drawAxisLabel(mode2D, width, labelText);
                }
            }
        } else {
            if (this.axisObject != undefined) {
                this.axisObject.forEach(arrow => {
                    this.scene.remove(arrow);
                    arrow.dispose();
                });
                this.axisObject = undefined;
            }

            if (this.labelMesh != undefined) {
                this.labelMesh.forEach(label => {
                    this.scene.remove(label);
                });
                this.labelMesh = undefined;
            }
        }
    }

    drawParticles(particleList, physics, shaderUpdate = false) {
        log('drawParticles');
        log("textureWidth = " + this.textureWidth);
        log("physics = " + physics);
        log("shaderUpdate = " + shaderUpdate);

        if (shaderUpdate) {
            physics.velocityShader = generateComputeVelocity(physics);
            physics.positionShader = generateComputePosition(physics);
            this.readbackParticleData();
        }

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

    setMaxParticles(n) {
        log('setMaxParticles');
        n = Math.max(n, 1e3);
        n = Math.min(n, 1e5);
        this.textureWidth = calcTextWidth(n);
        this.maxParticles = this.textureWidth * this.textureWidth;
    }

    capture(name) {
        if (ENV?.record != true) return;

        if (CanvasCapture.isRecording()) {
            CanvasCapture.stopRecord();
            return;
        }

        let element = this.renderer.domElement;
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
            name: generateExportFilename(name),
        });
    }

    drawText(text, size, position, color) {
        const height = 1;

        const textMesh = new Mesh(
            new TextGeometry(text, {
                font: this.font,
                size: size,
                depth: height
            }),
            new MeshBasicMaterial({
                color: color,
            })
        );

        textMesh.translateX(position.x);
        textMesh.translateY(position.y);
        textMesh.translateZ(position.z);

        this.scene.add(textMesh);

        return textMesh;
    }

    drawCaption(text, size, position, color) {
        if (this.captionMesh != undefined) {
            this.scene.remove(this.captionMesh);
        }

        this.captionMesh = this.drawText(text, size, position, color);

        return this.captionMesh;
    }

    drawCursor(show = true, radius = 100, thickness = 10) {
        if (this.cursorMesh != undefined && !show) {
            this.scene.remove(this.cursorMesh);
            this.cursorMesh = undefined;
            return;
        }

        this.cursorMesh = new Mesh(
            new RingGeometry(radius - thickness / 2, radius + thickness / 2, 32),
            new MeshBasicMaterial({ color: 0xfffffff })
        );
        this.scene.add(this.cursorMesh);

        return this.cursorMesh;
    }

    drawAxisLabel(mode2D, width, labelText) {
        if (this.labelMesh != undefined) this.labelMesh.forEach(label => {
            this.scene.remove(label);
        });

        const spacing = 0.02 * width;
        this.labelMesh = [
            this.drawText('X (' + labelText + ')', width * 0.05, new Vector3(spacing + width, 0, 0), 0xff0000),
            this.drawText('Y', width * 0.05, new Vector3(0, spacing + width, 0), 0x00ff00)
        ];

        if (mode2D == false) {
            this.labelMesh.push(
                this.drawText('Z', width * 0.05, new Vector3(0, 0, spacing + width), 0x0000ff)
            );
            this.labelMesh.push(
                this.drawText('(0,0,0)', width * 0.05, new Vector3(spacing, spacing, 0), 0xffffff)
            );
        } else {
            this.labelMesh.push(
                this.drawText('(0,0)', width * 0.05, new Vector3(spacing, spacing, 0), 0xffffff)
            );
        }
    }

    /* GPGPU Stuff */

    #initComputeRenderer() {
        log("#initComputeRenderer");

        this.gpuCompute = new GPUComputationRenderer(this.textureWidth, this.textureWidth, this.renderer);
        let gpuCompute = this.gpuCompute;

        if (this.renderer.capabilities.isWebGL2 === false) {
            gpuCompute.setDataType(THREE.HalfFloatType);
        }

        this.dtPosition = gpuCompute.createTexture();
        this.dtVelocity = gpuCompute.createTexture();

        this.dtProperties = gpuCompute.createTexture();
        this.dtProperties2 = gpuCompute.createTexture();

        this.#fillTextures();

        if (this.physics.velocityShader == undefined || this.physics.positionShader == undefined) {
            this.physics.velocityShader = generateComputeVelocity(this.physics);
            this.physics.positionShader = generateComputePosition(this.physics);
        }

        this.velocityVariable = gpuCompute.addVariable('textureVelocity', this.physics.velocityShader, this.dtVelocity);
        this.positionVariable = gpuCompute.addVariable('texturePosition', this.physics.positionShader, this.dtPosition);

        gpuCompute.setVariableDependencies(this.velocityVariable, [this.velocityVariable, this.positionVariable]);
        gpuCompute.setVariableDependencies(this.positionVariable, [this.velocityVariable, this.positionVariable]);

        this.fillPhysicsUniforms();
        this.velocityVariable.material.uniforms['textureProperties'] = { value: this.dtProperties };
        this.velocityVariable.material.uniforms['textureProperties2'] = { value: this.dtProperties2 };

        const error = gpuCompute.init();
        if (error !== null) {
            console.error(error);
        }
    }

    fillPhysicsUniforms() {
        const physics = this.physics;
        const velocityUniforms = this.velocityVariable.material.uniforms;

        velocityUniforms['uTime'] = { value: 0.0 };
        velocityUniforms['timeStep'] = { value: physics.timeStep };
        velocityUniforms['minDistance2'] = { value: physics.minDistance2 };
        velocityUniforms['massConstant'] = { value: physics.massConstant };
        velocityUniforms['chargeConstant'] = { value: physics.chargeConstant };
        velocityUniforms['nuclearForceConstant'] = { value: physics.nuclearForceConstant };
        velocityUniforms['nuclearForceRange'] = { value: physics.nuclearForceRange };
        velocityUniforms['nuclearForceRange2'] = { value: Math.pow(physics.nuclearForceRange, 2) };
        velocityUniforms['boundaryDistance'] = { value: physics.boundaryDistance };
        velocityUniforms['boundaryDamping'] = { value: physics.boundaryDamping };
        velocityUniforms['frictionConstant'] = { value: physics.frictionConstant };
        velocityUniforms['forceConstants'] = {
            value: [
                physics.massConstant,
                -physics.chargeConstant,
                physics.nuclearForceConstant,
                physics.colorChargeConstant,
            ]
        };
        velocityUniforms['maxVel'] = { value: physics.maxVel };
        velocityUniforms['maxVel2'] = { value: Math.pow(physics.maxVel, 2) };
        velocityUniforms['fineStructureConstant'] = { value: physics.fineStructureConstant };
        velocityUniforms['colorChargeConstant'] = { value: physics.colorChargeConstant };
        velocityUniforms['randomNoiseConstant'] = { value: physics.randomNoiseConstant };

        velocityUniforms['forceMap'] = { value: physics.forceMap };
        velocityUniforms['forceMapLen'] = { value: physics.forceMap.length };

        const positionUniforms = this.positionVariable.material.uniforms;

        positionUniforms['boundaryDistance'] = { value: physics.boundaryDistance };
        positionUniforms['timeStep'] = { value: physics.timeStep };
    }

    #fillTextures() {
        log("#fillTextures");

        const posArray = this.dtPosition.image.data;
        const velocityArray = this.dtVelocity.image.data;

        const propsArray = this.dtProperties.image.data;
        const props2Array = this.dtProperties2.image.data;

        let particles = this.particleList.length;
        let maxParticles = propsArray.length / 4;

        if (particles > maxParticles) {
            alert("Error: Too many particles! " + particles + " > " + maxParticles);
            return;
        }

        this.particleList.forEach((p, i) => {
            let offset4 = 4 * i;

            posArray[offset4 + 0] = p.position.x;
            posArray[offset4 + 1] = p.position.y;
            posArray[offset4 + 2] = p.position.z;
            posArray[offset4 + 3] = p.type;

            velocityArray[offset4 + 0] = p.velocity.x;
            velocityArray[offset4 + 1] = p.velocity.y;
            if (this.physics.mode2D) {
                velocityArray[offset4 + 2] = p.outOfBoundary;
            } else {
                velocityArray[offset4 + 2] = p.velocity.z;
            }
            velocityArray[offset4 + 3] = p.collisions;

            propsArray[offset4 + 0] = p.mass;
            propsArray[offset4 + 1] = p.charge;
            propsArray[offset4 + 2] = p.nuclearCharge;
            propsArray[offset4 + 3] = p.colorCharge;

            props2Array[offset4 + 0] = p.type;
            props2Array[offset4 + 1] = p.radius;
            props2Array[offset4 + 2] = 0;
            props2Array[offset4 + 3] = 0;
        });

        for (let k = particles; k < maxParticles; k++) {
            let offset4 = 4 * k;

            posArray[offset4 + 0] = 0;
            posArray[offset4 + 1] = 0;
            posArray[offset4 + 2] = 0;
            posArray[offset4 + 3] = ParticleType.undefined;

            velocityArray[offset4 + 0] = 0;
            velocityArray[offset4 + 1] = 0;
            velocityArray[offset4 + 2] = 0;
            velocityArray[offset4 + 3] = 0;

            propsArray[offset4 + 0] = 0;
            propsArray[offset4 + 1] = 0;
            propsArray[offset4 + 2] = 0;
            propsArray[offset4 + 3] = 0;

            props2Array[offset4 + 0] = ParticleType.undefined;
            props2Array[offset4 + 1] = 0;
            props2Array[offset4 + 2] = 0;
            props2Array[offset4 + 3] = 0;
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
        log('fillPointColors');

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

    compute(dt, time) {
        if (!this.initialized) return;

        let current = (this.renderTarget % 2);
        let target = (this.renderTarget + 1) % 2;
        ++this.renderTarget;

        let velocityVariable = this.velocityVariable;
        let positionVariable = this.positionVariable;
        let gpuCompute = this.gpuCompute;

        velocityVariable.material.uniforms['uTime'].value = time;

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
        // log('readbackParticleData');

        if (!this.initialized) {
            log('not initialized');
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

            if (this.physics.mode2D) {
                p.velocity.set(particleVelocity[offset + 0], particleVelocity[offset + 1], 0.0);
                p.outOfBoundary = particleVelocity[offset + 2];
            } else {
                p.velocity.set(particleVelocity[offset + 0], particleVelocity[offset + 1], particleVelocity[offset + 2]);
            }

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