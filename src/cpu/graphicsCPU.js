import {
    WebGLRenderer,
    Scene,
    PerspectiveCamera,
    SphereGeometry,
    Mesh,
    MeshBasicMaterial,
    ArrowHelper,
    Raycaster,
} from 'three';
import { Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { sphericalToCartesian } from '../helpers';

const axisLineWidth = 100;
const geometryMap = new Map();
const axis = [
    new ArrowHelper(new Vector3(1, 0, 0), new Vector3(), axisLineWidth, 0xff0000),
    new ArrowHelper(new Vector3(0, 1, 0), new Vector3(), axisLineWidth, 0x00ff00),
    new ArrowHelper(new Vector3(0, 0, 1), new Vector3(), axisLineWidth, 0x0000ff)
];

function log(msg) {
    console.log("GraphicsCPU: " + msg);
}

export class GraphicsCPU {
    constructor() {
        log("graphics init");

        this.renderer = new WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById("container").appendChild(this.renderer.domElement);

        this.stats = new Stats();
        document.getElementById("container").appendChild(this.stats.dom);

        this.scene = new Scene();
        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1e9);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        this.cameraDefault();

        this.showAxis();

        this.raycaster = new Raycaster();

        log("graphics done");
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

    cameraRefresh() {
        log("cameraRefresh");
        //this.controls.update();
        // log(this.controls.getDistance());
        // log(this.controls.getAzimuthalAngle() * 180/Math.PI);
        // log(this.controls.getPolarAngle()* 180/Math.PI);
        //let [x, y, z] = sphericalToCartesian(this.cameraDistance, this.cameraPhi * Math.PI / 180.0, this.cameraTheta * Math.PI / 180.0);
        //this.camera.position.set(x, y, z);
        //this.controls.update();
    }

    showAxis(show = true) {
        axis.forEach(key => {
            show ? this.scene.add(key) : this.scene.remove(key);
        });
    }

    addParticle(particle, radius = 5) {
        if (geometryMap.has(radius) == false) {
            geometryMap.set(radius, new SphereGeometry(radius));
        }
        particle.mesh = new Mesh(geometryMap.get(radius), new MeshBasicMaterial());
        this.scene.add(particle.mesh);

        particle.mesh.particle = particle;
    }

    render(particle) {
        particle.mesh.position.set(particle.position.x, particle.position.y, particle.position.z);
        //particle.mesh.position.multiplyScalar(0.5);
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
            //if (obj == this.raycaster.lastObject) continue;
            //this.raycaster.lastObject = obj;
            return particle;
        }
    }

    onWindowResize(window) {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
