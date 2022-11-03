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
    MathUtils,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import { computeVelocity, computePosition, particleFragmentShader } from './shaders/fragment';
import { particleVertexShader } from './shaders/vertex';
import { sphericalToCartesian } from './helpers';

const axisLineWidth = 100;
const axisObject = [
    new ArrowHelper(new Vector3(1, 0, 0), new Vector3(), axisLineWidth, 0xff0000),
    new ArrowHelper(new Vector3(0, 1, 0), new Vector3(), axisLineWidth, 0x00ff00),
    new ArrowHelper(new Vector3(0, 0, 1), new Vector3(), axisLineWidth, 0x0000ff)
];

const TEXTURE_WIDTH = 128;

function getCameraConstant(camera) {
    return window.innerHeight / (Math.tan(MathUtils.DEG2RAD * 0.5 * camera.fov) / camera.zoom);
}

function log(msg) {
    console.log("Graphics (GPU): " + msg)
}

export class GraphicsGPU {
    constructor() {
        log("constructor");

        this.cleanup();

        this.renderer = new WebGLRenderer();
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById("container").appendChild(this.renderer.domElement);

        this.stats = new Stats();
        document.getElementById("container").appendChild(this.stats.dom);

        this.scene = new Scene();
        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1e9);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        this.raycaster = new Raycaster();

        this.cameraDefault();

        this.drawAxis();

        log("constructor done");
    }

    cameraDefault() {
        log("cameraDefault");

        this.cameraDistance = 3000;
        this.cameraPhi = 30; // up/down [0,Pi]
        this.cameraTheta = 45; // rotation [0,2Pi]

        this.cameraSetup();
    }

    cameraSetup() {
        log("cameraSetup");

        let [x, y, z] = sphericalToCartesian(this.cameraDistance, this.cameraPhi * Math.PI / 180.0, this.cameraTheta * Math.PI / 180.0);
        this.camera.position.set(x, y, z);
        //this.camera.lookAt(0, 0, 0);

        this.controls.target.set(0, 0, 0);
        this.controls.update();
        this.controls.saveState();
    }

    drawAxis(show = true) {
        axisObject.forEach(key => {
            show ? this.scene.add(key) : this.scene.remove(key);
        });
    }

    drawParticles(particleList, physics) {
        log("drawParticles");

        this.particleList = particleList;
        this.physics = physics;

        this.#initComputeRenderer();
        this.#initPointObjects();
    }

    update() {
        this.controls.update();
        this.stats.update();

        this.renderer.render(this.scene, this.camera);
    }

    raycast(pointer) {
        this.raycaster.setFromCamera(pointer, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, false);
        console.log(intersects);
        for (let i = 0; i < intersects.length; i++) {
            let obj = intersects[i].object;
            let particle = obj.particle;
            return particle;
        }
    }

    onWindowResize(window) {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.pointsUniforms.value = getCameraConstant(this.camera);
    }

    cleanup() {
        log("cleanup");

        if (this.scene) {
            for (var i = this.scene.children.length - 1; i >= 0; i--) {
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

    compute() {
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

        //this.uniforms['textureVelocity'].value = velocityVariable.renderTargets[target].texture;
        this.pointsUniforms['texturePosition'].value = positionVariable.renderTargets[target].texture;

        /*gpuCompute.compute();
        this.uniforms['textureVelocity'].value = gpuCompute.getCurrentRenderTarget(velocityVariable).texture;
        this.uniforms['texturePosition'].value = gpuCompute.getCurrentRenderTarget(positionVariable).texture;*/
    }

    #initComputeRenderer() {
        log("initComputeRenderer");

        this.gpuCompute = new GPUComputationRenderer(TEXTURE_WIDTH, TEXTURE_WIDTH, this.renderer);
        let gpuCompute = this.gpuCompute;

        if (this.renderer.capabilities.isWebGL2 === false) {
            gpuCompute.setDataType(THREE.HalfFloatType);
        }

        const dtProperties = gpuCompute.createTexture();
        const dtPosition = gpuCompute.createTexture();
        const dtVelocity = gpuCompute.createTexture();

        this.#fillTextures(dtProperties, dtPosition, dtVelocity);

        this.velocityVariable = gpuCompute.addVariable('textureVelocity', computeVelocity, dtVelocity);
        this.positionVariable = gpuCompute.addVariable('texturePosition', computePosition, dtPosition);

        gpuCompute.setVariableDependencies(this.velocityVariable, [this.velocityVariable, this.positionVariable]);
        gpuCompute.setVariableDependencies(this.positionVariable, [this.velocityVariable, this.positionVariable]);

        let physics = this.physics;
        let physicsUniforms = this.velocityVariable.material.uniforms;
        physicsUniforms['minDistance'] = { value: physics.minDistance };
        physicsUniforms['massConstant'] = { value: physics.massConstant };
        physicsUniforms['chargeConstant'] = { value: physics.chargeConstant };
        physicsUniforms['nearChargeConstant'] = { value: physics.nearChargeConstant };
        physicsUniforms['nearChargeRange'] = { value: physics.nearChargeRange };
        physicsUniforms['nearChargeRange2'] = { value: Math.pow(physics.nearChargeRange, 2) };
        physicsUniforms['forceConstant'] = { value: physics.forceConstant };
        physicsUniforms['boundaryDistance'] = { value: physics.boundaryDistance };
        physicsUniforms['textureProperties'] = { value: dtProperties };

        const error = gpuCompute.init();
        if (error !== null) {
            console.error(error);
        }
    }

    #fillTextures(textureProperties, texturePosition, textureVelocity) {
        log("fillTextures");

        const propsArray = textureProperties.image.data;
        const posArray = texturePosition.image.data;
        const velocityArray = textureVelocity.image.data;

        let particles = this.particleList.length;
        let maxParticles = propsArray.length / 4;

        console.log(particles);
        console.log(maxParticles);

        if (particles > maxParticles) {
            alert("Error: Too many particles! " + particles + " > " + maxParticles);
            return;
        }

        this.particleList.forEach((p, i) => {
            let offset4 = 4 * i;
            propsArray[offset4 + 0] = p.id;
            propsArray[offset4 + 1] = p.mass;
            propsArray[offset4 + 2] = p.charge;
            propsArray[offset4 + 3] = p.nearCharge;

            posArray[offset4 + 0] = p.position.x;
            posArray[offset4 + 1] = p.position.y;
            posArray[offset4 + 2] = p.position.z;
            posArray[offset4 + 3] = 0;

            velocityArray[offset4 + 0] = p.velocity.x;
            velocityArray[offset4 + 1] = p.velocity.y;
            velocityArray[offset4 + 2] = p.velocity.z;
            velocityArray[offset4 + 3] = 0;
        })

        for (let k = particles; k < maxParticles; k++) {
            let offset4 = 4 * k;

            propsArray[offset4 + 0] = 0;
            propsArray[offset4 + 1] = 0;
            propsArray[offset4 + 2] = 0;
            propsArray[offset4 + 3] = 0;

            posArray[offset4 + 0] = 0;
            posArray[offset4 + 1] = 0;
            posArray[offset4 + 2] = 0;
            posArray[offset4 + 3] = 0;

            velocityArray[offset4 + 0] = 0;
            velocityArray[offset4 + 1] = 0;
            velocityArray[offset4 + 2] = 0;
            velocityArray[offset4 + 3] = 0;
        }
    }

    refreshPointColors() {
        log("refreshPointColors");

        if (!this.particleList)
            return;

        let colors = [];
        this.particleList.forEach((p, i) => {
            colors.push(p.color.r, p.color.g, p.color.b);
        });

        this.pointsGeometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    }

    refreshPointPositions() {
        log("refreshPointPositions");

        if (!this.particleList)
            return;

        let positions = [];
        this.particleList.forEach((p, i) => {
            positions.push(p.position.x, p.position.y, p.position.z);
        });
        
        this.pointsGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    }

    refreshPointRadius() {
        log("refreshPointRadius");

        if (!this.particleList)
            return;

        let radius = [];
        this.particleList.forEach((p, i) => {
            radius.push(p.radius);
        });

        this.pointsGeometry.setAttribute('radius', new Float32BufferAttribute(radius, 1));
    }

    #initPointObjects() {
        let gpuCompute = this.gpuCompute;

        this.pointsUniforms = {
            'texturePosition': { value: gpuCompute.getCurrentRenderTarget(this.positionVariable).texture },
            'textureVelocity': { value: gpuCompute.getCurrentRenderTarget(this.velocityVariable).texture },
            'cameraConstant': { value: getCameraConstant(this.camera) },
        };

        /*const read = new Float32Array( 4 );
        let rtTexture = gpuCompute.getCurrentRenderTarget(this.positionVariable);
        this.renderer.readRenderTargetPixels( rtTexture, 0, 0, 1, 1, read );
        console.log(read);*/

        const pointsMaterial = new ShaderMaterial({
            uniforms: this.pointsUniforms,
            vertexShader: particleVertexShader,
            fragmentShader: particleFragmentShader,
        });
        pointsMaterial.extensions.drawBuffers = true;

        this.pointsGeometry = new BufferGeometry();
        this.refreshPointColors();
        this.refreshPointPositions();
        this.refreshPointRadius();
        
        const particles = this.particleList.length;
        const uvs = new Float32Array(particles * 2);
        let p = 0;
        for (let j = 0; j < TEXTURE_WIDTH; j++) {
            for (let i = 0; i < TEXTURE_WIDTH; i++) {
                uvs[p++] = i / (TEXTURE_WIDTH - 1);
                uvs[p++] = j / (TEXTURE_WIDTH - 1);
            }
        }
        this.pointsGeometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));

        this.pointsObject = new Points(this.pointsGeometry, pointsMaterial);
        this.pointsObject.frustumCulled = false;
        this.pointsObject.matrixAutoUpdate = false;
        this.pointsObject.updateMatrix();

        this.scene.add(this.pointsObject);
    }
}