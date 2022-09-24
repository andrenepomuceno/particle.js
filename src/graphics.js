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
} from 'three';
import { Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { sphericalToCartesian } from './helpers';

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
            positions: [],
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
        particle.positionIndex = this.particleData.positions.length;
        this.particleData.positions.push(particle.position.x, particle.position.y, particle.position.z);
        this.particleData.colors.push(particle.color.r, particle.color.g, particle.color.b);
        this.particleData.radius.push(particle.radius);
    }

    updateParticle(particle) {
        let index = particle.positionIndex;
        let positions = this.geometry.attributes.position.array
        positions[index] = particle.position.x;
        positions[index + 1] = particle.position.y;
        positions[index + 2] = particle.position.z;
    }

    fillGeometryBuffer() {
        console.log("graphics fillGeometryBuffer");

        this.uniforms = {
            cameraConstant: { value: getCameraConstant(this.camera) },
        };

        const material = new ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: document.getElementById('vertexshader').textContent,
            fragmentShader: document.getElementById('fragmentshader').textContent,
        });
        material.extensions.drawBuffers = true;

        this.geometry = new BufferGeometry();

        this.geometry.setAttribute('position', new Float32BufferAttribute(this.particleData.positions, 3));
        this.geometry.setAttribute('color', new Float32BufferAttribute(this.particleData.colors, 3));
        this.geometry.setAttribute('radius', new Float32BufferAttribute(this.particleData.radius, 1));

        this.points = new Points(this.geometry, material);
        this.points.matrixAutoUpdate = false;
		this.points.updateMatrix();

        this.scene.add(this.points);
    }

    update() {
        this.controls.update();
        this.stats.update();

        this.geometry.attributes.position.needsUpdate = true;

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
            positions: [],
            colors: [],
            radius: [],
        }
        this.points = undefined;
        this.uniforms = undefined;
        this.geometry = undefined;
    }
}
