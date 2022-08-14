import { WebGLRenderer, Scene, PerspectiveCamera, Vector3, SphereGeometry, Mesh, MeshBasicMaterial, ArrowHelper } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { sphericalToCartesian } from './helpers';

const axisLineWidth = 100;
const geometryMap = new Map();
const axis = [
    new ArrowHelper(new Vector3(1, 0, 0), new Vector3(), axisLineWidth, 0xff0000),
    new ArrowHelper(new Vector3(0, 1, 0), new Vector3(), axisLineWidth, 0x00ff00),
    new ArrowHelper(new Vector3(0, 0, 1), new Vector3(), axisLineWidth, 0x0000ff)
];

export class Graphics {
    constructor() {
        this.renderer = new WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById("container").appendChild(this.renderer.domElement);

        this.stats = new Stats();
        document.getElementById("container").appendChild(this.stats.dom);

        this.scene = new Scene();
        this.camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000000);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        this.cameraDefault();

        this.showAxis();
    }

    cameraDefault() {
        this.cameraDistance = 3000;
        this.cameraPhi = 30; // up/down [0,Pi]
        this.cameraTheta = 45; // rotation [0,2Pi]
    }

    cameraSetup() {
        let [x, y, z] = sphericalToCartesian(this.cameraDistance, this.cameraPhi * Math.PI / 180.0, this.cameraTheta * Math.PI / 180.0);
        this.camera.position.set(x, y, z);
        this.camera.lookAt(0, 0, 0);

        this.controls.target.set(0, 0, 0);
        this.controls.saveState();
    }

    showAxis(show = true) {
        axis.forEach(key => {
            show ? this.scene.add(key) : this.scene.remove(key);
            ;
        });
    }

    addToScene(particle, radius = 5) {
        if (geometryMap.has(radius) == false) {
            geometryMap.set(radius, new SphereGeometry(radius));
        }
        particle.sphere = new Mesh(geometryMap.get(radius), new MeshBasicMaterial());
        this.scene.add(particle.sphere);
    }

    render(particle) {
        particle.sphere.position.set(particle.position.x, particle.position.y, particle.position.z);
        //particle.sphere.position.multiplyScalar(0.5);
    }

    update() {
        this.controls.update();
        this.stats.update();
        this.renderer.render(this.scene, this.camera);
    }
}
