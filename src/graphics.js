import {
    WebGLRenderer,
    Scene,
    PerspectiveCamera,
    SphereGeometry,
    Mesh,
    MeshBasicMaterial,
    ArrowHelper,
    Raycaster,

    ShaderMaterial,
    BufferGeometry,
    Color,
    Float32BufferAttribute,
    Points,
    MathUtils,
    Texture,
} from 'three';
import { Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { sphericalToCartesian } from './helpers';
import { computeVelocity, computePosition, particleFragmentShader } from './shaders/fragment';
import { particleVertexShader } from './shaders/vertex';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import { physics } from './simulation';

const axisLineWidth = 100;
const axis = [
    new ArrowHelper(new Vector3(1, 0, 0), new Vector3(), axisLineWidth, 0xff0000),
    new ArrowHelper(new Vector3(0, 1, 0), new Vector3(), axisLineWidth, 0x00ff00),
    new ArrowHelper(new Vector3(0, 0, 1), new Vector3(), axisLineWidth, 0x0000ff)
];

function getCameraConstant(camera) {
    return window.innerHeight / (Math.tan(MathUtils.DEG2RAD * 0.5 * camera.fov) / camera.zoom);
}

export class Graphics {
    constructor() {
        console.log("graphics init");

        this.renderer = new WebGLRenderer();
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById("container").appendChild(this.renderer.domElement);

        this.stats = new Stats();
        document.getElementById("container").appendChild(this.stats.dom);

        this.scene = new Scene();
        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000000);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        this.cameraDefault();

        this.showAxis();

        this.raycaster = new Raycaster();

        this.particleData = {
            properties: [],
            positions: [],
            velocities: [],
            colors: [],
            radius: [],
        }
        this.points = undefined;
        this.uniforms = undefined;
        this.geometry = undefined;

        console.log("graphics done");
    }

    cameraDefault() {
        console.log("cameraDefault");

        this.cameraDistance = 3000;
        this.cameraPhi = 30; // up/down [0,Pi]
        this.cameraTheta = 45; // rotation [0,2Pi]

        this.cameraSetup();
    }

    cameraSetup() {
        console.log("cameraSetup");

        let [x, y, z] = sphericalToCartesian(this.cameraDistance, this.cameraPhi * Math.PI / 180.0, this.cameraTheta * Math.PI / 180.0);
        this.camera.position.set(x, y, z);
        //this.camera.lookAt(0, 0, 0);

        this.controls.target.set(0, 0, 0);
        this.controls.update();
        this.controls.saveState();
    }

    cameraRefresh() {
        console.log("cameraRefresh");
        //this.controls.update();
        // console.log(this.controls.getDistance());
        // console.log(this.controls.getAzimuthalAngle() * 180/Math.PI);
        // console.log(this.controls.getPolarAngle()* 180/Math.PI);
        //let [x, y, z] = sphericalToCartesian(this.cameraDistance, this.cameraPhi * Math.PI / 180.0, this.cameraTheta * Math.PI / 180.0);
        //this.camera.position.set(x, y, z);
        //this.controls.update();
    }

    showAxis(show = true) {
        axis.forEach(key => {
            show ? this.scene.add(key) : this.scene.remove(key);
        });
    }

    addParticle(particle) {
        if (particle.fixed) {
            // TODO
            return;
        }

        //particle.positionIndex = this.particleData.positions.length;
        this.particleData.properties.push(particle.id, particle.mass, particle.charge, particle.nearCharge);
        this.particleData.positions.push(particle.position.x, particle.position.y, particle.position.z);
        this.particleData.velocities.push(particle.velocity.x, particle.velocity.y, particle.velocity.z);
        this.particleData.colors.push(particle.color.r, particle.color.g, particle.color.b);
        this.particleData.radius.push(particle.radius);
    }

    refreshPosition(particle) {
        /*let index = particle.positionIndex;
        let positions = this.geometry.attributes.position.array
        positions[index] = particle.position.x;
        positions[index + 1] = particle.position.y;
        positions[index + 2] = particle.position.z;*/
    }

    drawParticles() {
        console.log("graphics drawParticles");

        initComputeRenderer(this);

        this.uniforms = {
            'texturePosition': { value: gpuCompute.getCurrentRenderTarget(positionVariable).texture },
            'cameraConstant': { value: getCameraConstant(this.camera) },
        };

        const material = new ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: particleVertexShader,
            fragmentShader: particleFragmentShader,
        });
        material.extensions.drawBuffers = true;

        const PARTICLES = this.particleData.radius.length;
        const uvs = new Float32Array(PARTICLES * 2);
        let p = 0;
        for (let j = 0; j < WIDTH; j++) {
            for (let i = 0; i < WIDTH; i++) {
                uvs[p++] = i / (WIDTH - 1);
                uvs[p++] = j / (WIDTH - 1);
            }
        }

        this.geometry = new BufferGeometry();
        this.geometry.setAttribute('position', new Float32BufferAttribute(this.particleData.positions, 3));
        this.geometry.setAttribute('color', new Float32BufferAttribute(this.particleData.colors, 3));
        this.geometry.setAttribute('radius', new Float32BufferAttribute(this.particleData.radius, 1));
        this.geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));

        this.points = new Points(this.geometry, material);
        this.points.matrixAutoUpdate = false;
        this.points.updateMatrix();

        this.scene.add(this.points);
    }

    update() {
        this.controls.update();
        this.stats.update();

        this.renderer.render(this.scene, this.camera);
    }

    raycast(pointer) {
        this.raycaster.setFromCamera(pointer, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, false);
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

        this.uniforms.value = getCameraConstant(this.camera);
    }

    cleanup() {
        console.log("graphics cleanup");

        for (var i = this.scene.children.length - 1; i >= 0; i--) {
            let obj = this.scene.children[i];
            this.scene.remove(obj);
        }

        this.particleData = {
            properties: [],
            positions: [],
            velocities: [],
            colors: [],
            radius: [],
        }
        this.points = undefined;
        this.uniforms = undefined;
        this.geometry = undefined;
    }

    compute() {
        gpuCompute.compute();
		this.uniforms['texturePosition'].value = gpuCompute.getCurrentRenderTarget(positionVariable).texture;
        //this.uniforms['textureVelocity'].value = gpuCompute.getCurrentRenderTarget(velocityVariable).texture;
    }
}

let gpuCompute;
let positionVariable;
let velocityVariable;
const WIDTH = 128;
function initComputeRenderer(graphics) {
    console.log("initComputeRender");

    let renderer = graphics.renderer;

    gpuCompute = new GPUComputationRenderer(WIDTH, WIDTH, renderer);

    if (renderer.capabilities.isWebGL2 === false) {
        gpuCompute.setDataType(THREE.HalfFloatType);
    }

    const dtProperties = gpuCompute.createTexture();
    const dtPosition = gpuCompute.createTexture();
    const dtVelocity = gpuCompute.createTexture();

    fillTextures(graphics, dtProperties, dtPosition, dtVelocity);

    velocityVariable = gpuCompute.addVariable('textureVelocity', computeVelocity, dtVelocity);
    positionVariable = gpuCompute.addVariable('texturePosition', computePosition, dtPosition);

    gpuCompute.setVariableDependencies(velocityVariable, [ positionVariable, velocityVariable ]);
    gpuCompute.setVariableDependencies(positionVariable, [ positionVariable, velocityVariable ]);

    let physicsUniforms = velocityVariable.material.uniforms;
    physicsUniforms['minDistance'] = { value: physics.minDistance };
    physicsUniforms['massConstant'] = { value: physics.massConstant };
    physicsUniforms['chargeConstant'] = { value: physics.chargeConstant };
    physicsUniforms['nearChargeConstant'] = { value: physics.nearChargeConstant };
    physicsUniforms['nearChargeRange'] = { value: physics.nearChargeRange };
    physicsUniforms['forceConstant'] = { value: physics.forceConstant };
    physicsUniforms['textureProperties'] = { value: dtProperties };

    const error = gpuCompute.init();
    if (error !== null) {
        console.error(error);
    }
}

function fillTextures(graphics, textureProperties, texturePosition, textureVelocity) {
    console.log("fillTextures");

    const data = graphics.particleData;
    const propsArray = textureProperties.image.data;
    const posArray = texturePosition.image.data;
    const velocityArray = textureVelocity.image.data;

    let particles = data.radius.length;
    let maxParticles = propsArray.length / 4;

    console.log(particles);
    console.log(maxParticles);

    if (particles > maxParticles) {
        console.log("too many particles!");
        return;
    }

    for (let k = 0; k < particles; k++) {
        let offset4 = 4 * k;
        let offset3 = 3 * k;

        propsArray[offset4 + 0] = data.properties[offset4 + 0];
        propsArray[offset4 + 1] = data.properties[offset4 + 1];
        propsArray[offset4 + 2] = data.properties[offset4 + 2];
        propsArray[offset4 + 3] = data.properties[offset4 + 3];

        posArray[offset4 + 0] = data.positions[offset3 + 0];
        posArray[offset4 + 1] = data.positions[offset3 + 1];
        posArray[offset4 + 2] = data.positions[offset3 + 2];
        posArray[offset4 + 3] = 0;

        velocityArray[offset4 + 0] = data.velocities[offset3 + 0];
        velocityArray[offset4 + 1] = data.velocities[offset3 + 1];
        velocityArray[offset4 + 2] = data.velocities[offset3 + 2];
        velocityArray[offset4 + 3] = 0;
    }

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