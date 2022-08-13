import * as $ from 'jquery';
import { WebGLRenderer, Scene, PerspectiveCamera, Vector3, SphereGeometry, Mesh, MeshBasicMaterial, ArrowHelper } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import WebGL from 'three/examples/jsm/capabilities/WebGL.js';

import { simulationAtom } from './simulations.js';
import './globals.js'

let renderer, scene, camera;
let controls;
let stats;

function random(a, b) {
    return a + (b - a) * Math.random();
}

function init() {
    renderer = new WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("container").appendChild(renderer.domElement);

    stats = new Stats();
    document.getElementById("container").appendChild(stats.dom);

    scene = new Scene();
    camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000000);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.update();

    window.onresize = function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
}

class Particle {
    constructor() {
        this.id = particleId++;
        this.position = new Vector3();
        this.velocity = new Vector3();
        this.acceleration = new Vector3();
        this.mass = 0;
        this.charge = 0;
        this.force = new Vector3();
    }

    addToScene(radius = 5) {
        if (geometryMap.has(radius) == false) {
            geometryMap.set(radius, new SphereGeometry(radius));
        }
        this.sphere = new Mesh(geometryMap.get(radius), new MeshBasicMaterial());
        scene.add(this.sphere);
    }

    update() {
        if (this.mass != 0.0) {
            this.force.divideScalar(Math.abs(this.mass));
        }

        this.force.multiplyScalar(forceConstant);

        this.velocity.add(this.force);
        this.position.add(this.velocity);

        if (quantizedPosition) {
            this.position.round();
        }

        this.force.setScalar(0);
    }

    render() {
        this.sphere.position.set(this.position.x, this.position.y, this.position.z);
    }

    print() {
        console.log("ID:" + this.id + " M:" + this.mass + " Q:" + this.charge + " P:" + this.position.toArray() + " V:" + this.velocity.toArray());
    }
}

function colide(p1, p2) {
    let m = p1.mass + p2.mass;
    if (m == 0) {
        return;
    }

    let s = 2 * p1.mass * p2.mass / m;
    let dv1 = p2.velocity.clone().sub(p1.velocity);
    let dv2 = p1.velocity.clone().sub(p2.velocity);

    dv1.multiplyScalar(s);
    dv2.multiplyScalar(s);

    p1.force.add(dv1);
    p2.force.add(dv2);
}

function interact(p1, p2) {
    if (p1.id == p2.id) return;

    let distance = p2.position.clone();
    distance.sub(p1.position);

    let absDistanceSq = distance.lengthSq();
    if (minDistance > 0 && absDistanceSq < minDistance) {
        absDistanceSq = minDistance;
    }

    if (absDistanceSq == 0.0) {
        ++colisions;
        return;
    }

    let force = 0.0;
    force += massConstant * p1.mass * p2.mass;
    force -= chargeConstant * p1.charge * p2.charge;
    force /= absDistanceSq;
    if (force == 0.0) return;

    distance.multiplyScalar(force);
    p1.force.add(distance);

    p2.force.sub(distance);
}

function simulate() {
    let energy = 0.0;
    for (let i = 0; i < particleList.length; ++i) {
        let p1 = particleList[i];
        for (let j = i + 1; j < particleList.length; ++j) {
            let p2 = particleList[j];

            interact(p1, p2);

            if (enableColision && p1.position.equals(p2.position)) {
                colide(p1, p2);
            }
        }
        p1.update();
        p1.render();
        energy += (p1.mass * p1.velocity.lengthSq());
    }

    let particles = particleList.length;
    $("#info").html("N: " + particles + "<br>T: " + cicles + "<br>E (avg): " + Math.round(energy / particles) + "<br>C: " + colisions);
}

function animate() {
    requestAnimationFrame(animate);

    controls.update();
    stats.update();

    if (!pause || nextFrame) {
        nextFrame = false;
        simulate();
        ++cicles;
    }

    renderer.render(scene, camera);
}

function createParticles(particles, [m1, m2], [q1, q2], positionGenerator, center = new Vector3(), velocity = new Vector3()) {
    for (var i = 0; i < particles; ++i) {
        let [x, y, z] = positionGenerator();
        let p = new Particle();
        p.mass = Math.round(random(m1, m2));
        p.charge = Math.round(random(q1, q2));
        p.position.set(x, y, z);
        p.position.add(center);
        p.velocity.add(velocity);
        particleList.push(p);
    }
}

function createParticlesSphere(particles, r1, r2, massRange, chargeRange, center, velocity, mode = 0) {
    createParticles(particles, massRange, chargeRange, (x, y, z) => randomSpheric(r1, r2, mode), center, velocity);
}

function createParticlesCube(particles, size, mass, charge, center, velocity) {
    createParticles(particles, massRange, chargeRange, (x, y, z) => {
        return [
            random(-size, size),
            random(-size, size),
            random(-size, size)
        ];
    }, center, velocity);
}

// globals
let simulation = simulationAtom;
let hideText = false;
let hideAxis = false;
let nextFrame = false;
const axisLineWidth = 100;

let cicles = 0;
let pause = true;
let particleList = [];
let particleId = 0;
let colisions = 0;
const geometryMap = new Map();

// animation parameters
const enableMassRadius = true;
let enableChargeColor = true;

function simulationSetup() {
    simulation();
    sceneSetup(massRange, chargeRange);
    cameraSetup();
}

function cameraSetup() {
    let [x, y, z] = sphericalToCartesian(cameraDistance, cameraPhi * Math.PI / 180.0, cameraTheta * Math.PI / 180.0);
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);

    controls.target.set(0, 0, 0);
    controls.saveState();
}

function sceneSetup(massRange, chargeRange) {
    particleList.forEach((p, i) => {
        //p.position.z = 0;
        let radius = 5;
        if (enableMassRadius) {
            const absMass = Math.abs(Math.max(massRange[0], massRange[1]));
            radius += Math.round(10 * Math.abs(p.mass) / absMass);
        }
        p.addToScene(radius);

        let color;
        if (enableChargeColor) {
            const absCharge = Math.abs(Math.max(chargeRange[0], chargeRange[1]));
            color = generateParticleColor(p, absCharge);
        } else {
            color = randomColor();
        }
        p.sphere.material.color.set(color);

        if (quantizedPosition) {
            p.position.round();
        }

        p.render();
    });
}

function cleanup() {
    particleList.forEach((p, i) => {
        scene.remove(p.sphere);
    });
    particleList = [];
    particleId = 0;
    colisions = 0;
    cicles = 0;
}

document.addEventListener("keydown", (event) => {
    let key = event.key;
    switch (key) {
        case ' ':
            pause = !pause;
            break;

        case 'c':
            controls.reset();
            break;

        case 'r':
            cleanup();
            simulationSetup();
            break;

        case 'p':
            particleList.forEach((p, i) => {
                p.print();
            });
            break;

        case 'h':
            hideText = !hideText;
            $(".text").css("opacity", hideText ? 0 : 100);
            stats.dom.style.display = hideText ? "none" : "block";
            break;

        case 'a':
            hideAxis = !hideAxis;
            showAxis(!hideAxis);
            break;

        case 'v':
            camera.position.set(0, 0, cameraDistance);
            controls.update();
            controls.target.set(0, 0, 0);
            break;

        case 'n':
            nextFrame = true;
            break;

        case 'q':
            enableChargeColor = !enableChargeColor;
            particleList.forEach((p, i) => {
                scene.remove(p.sphere);
            });
            cleanup();
            simulationSetup();
            //sceneSetup();
            break;

        case '_':
            pause = true;
            simulation = colisionTest;
            cleanup();
            simulationSetup();
            break;

        default:
            if (key >= '0' && key <= '9') {
                pause = true;
                switch (key - '0') {
                    default:
                    case 1:
                        simulation = simulationCross;
                        break;
                    case 5:
                        simulation = simulation0;
                        break;
                    case 2:
                        simulation = simulation1;
                        break;
                    case 3:
                        simulation = simulationGrid2D;
                        break;
                    case 4:
                        simulation = simulationGrid3D;
                        break;
                    case 6:
                        simulation = simulationSpheres;
                        break;
                    case 0:
                        simulation = simulationAtom;
                        break;
                }
                cleanup();
                simulationSetup();
            }
            break;

    }
})

function randomColor() {
    const min = 10;
    const max = 255;
    const r = Math.round(random(min, max));
    const g = Math.round(random(min, max));
    const b = Math.round(random(min, max));
    return "rgb(" + r + "," + g + "," + b + ")";
}

function randomSpheric(r1, r2, mode = 0) {
    let x, y, z;
    if (mode == 1) {
        let r = random(r1, r2);
        let phi = Math.PI * Math.random();
        let theta = 2 * Math.PI * Math.random();
        [x, y, z] = sphericalToCartesian(r, phi, theta);
    } else {
        // density proportional to r^2
        let r13 = Math.pow(r1, 3);
        let r23 = Math.pow(r2, 3);
        let t = random(r13, r23);
        let r = Math.pow(t, 1 / 3);

        let theta = 2 * Math.PI * Math.random();
        let z0 = -1 + 2 * Math.random();
        let x0 = Math.sqrt(1 - z0 * z0) * Math.cos(theta);
        let y0 = Math.sqrt(1 - z0 * z0) * Math.sin(theta);
        x = r * x0;
        y = r * y0;
        z = r * z0;
    }
    return [x, y, z];
}

function sphericalToCartesian(r, phi, theta) {
    let x = r * Math.cos(phi) * Math.sin(theta);
    let y = r * Math.sin(phi) * Math.sin(theta);
    let z = r * Math.cos(theta);
    return [x, y, z];
}

const axis = [
    new ArrowHelper(new Vector3(1, 0, 0), new Vector3(), axisLineWidth, 0xff0000),
    new ArrowHelper(new Vector3(0, 1, 0), new Vector3(), axisLineWidth, 0x00ff00),
    new ArrowHelper(new Vector3(0, 0, 1), new Vector3(), axisLineWidth, 0x0000ff)
];
function showAxis(show = true) {
    axis.forEach(key => {
        show ? scene.add(key) : scene.remove(key);
        ;
    });
}

function generateParticleColor(p, absCharge) {
    let r = 0, g = 0, b = 0;
    const min = 30;
    const max = 255;

    if (p.mass < 0) {
        g = 255;
    }

    if (p.charge > 0) {
        b = Math.round(min + (max - min) * Math.abs(p.charge) / absCharge);
    } else if (p.charge < 0) {
        r = Math.round(min + (max - min) * Math.abs(p.charge) / absCharge);
    } else {
        if (p.mass >= 0) {
            r = g = b = 255;
        } else {
            r = g = b = 127;
        }
    }

    return "rgb(" + r + "," + g + "," + b + ")";
}

function colisionTest() {
    cameraDistance = 500;
    cameraPhi = cameraTheta = 0;

    massConstant = 0;
    chargeConstant = 0;
    massRange = [1, 50];
    chargeRange = [-1, 1];

    /*let i = -250;
    createParticles(10, [1, 1], chargeRange, (x, y, z) => {
        i += 50;
        return [i, 0, 0];
    })
    particleList.at(-1).velocity.set(-1, 0, 0);
    particleList.push(new Particle());
    particleList.at(-1).mass = 50;
    particleList.at(-1).charge = 1;
    particleList.at(-1).position.set(-400, 0, 0);
    particleList.push(new Particle());
    particleList.at(-1).mass = 50;
    particleList.at(-1).charge = 1;
    particleList.at(-1).position.set(400, 0, 0);*/

    particleList.push(new Particle());
    particleList.at(-1).mass = 1;
    particleList.at(-1).charge = 1;
    particleList.at(-1).position.set(-50, 50, 0);
    particleList.at(-1).velocity.set(1, -1, 0);
    particleList.push(new Particle());
    particleList.at(-1).mass = 1;
    particleList.at(-1).charge = 1;
    particleList.at(-1).position.set(50, 50, 0);
    particleList.at(-1).velocity.set(-1, -1, 0);
    particleList.push(new Particle());
    particleList.at(-1).mass = 100;
    particleList.at(-1).charge = 1;
    particleList.at(-1).position.set(-50, -50, 0);
    particleList.push(new Particle());
    particleList.at(-1).mass = 100;
    particleList.at(-1).charge = 1;
    particleList.at(-1).position.set(50, -50, 0);
    particleList.push(new Particle());
    particleList.at(-1).mass = 100;
    particleList.at(-1).charge = 1;
    particleList.at(-1).position.set(-60, 60, 0);
    particleList.push(new Particle());
    particleList.at(-1).mass = 100;
    particleList.at(-1).charge = 1;
    particleList.at(-1).position.set(60, 60, 0);
}

if (WebGL.isWebGLAvailable()) {
    init();
    showAxis();
    simulationSetup();
    animate();
} else {
    const warning = WebGL.getWebGLErrorMessage();
    document.getElementById('container').appendChild(warning);
}