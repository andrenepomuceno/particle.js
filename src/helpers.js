import { ParticleType } from './particle.js';
import { MathUtils, Vector3 } from "three";
import { Particle } from './particle.js';

export function randomSphericVector(r1, r2, mode2D = true, mode = 0) {
    let x, y, z = 0;
    if (mode2D) [x, y, z] = randomDisc(r1, r2, mode);
    else[x, y, z] = randomSpheric(r1, r2, mode);
    return new Vector3(x, y, z);
}

export function random(a, b, round = false) {
    let r = Math.random();
    r *= (b - a);
    r += a;
    if (round) {
        r = Math.round(r);
    }
    return r;
}

export function randomColor(mode = "hue") {
    let color;

    switch (mode) {
        case "rgb":
            const min = 10;
            const max = 255;
            let r = random(min, max, true);
            let g = random(min, max, true);
            let b = random(min, max, true);
            color = "rgb(" + r + "," + g + "," + b + ")";
            break;

        case "hue":
        default:
            let h = random(0, 360, true);
            color = "hsl(" + h + ",100%,50%)";
            break;
    }

    return color;
}

export function randomSpheric(r1, r2, mode = 0) {
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

export function sphericalToCartesian(r, phi, theta) {
    let x = r * Math.cos(phi) * Math.sin(theta);
    let y = r * Math.sin(phi) * Math.sin(theta);
    let z = r * Math.cos(theta);
    return [x, y, z];
}

export function randomDisc(r1, r2, mode = 0) {
    if (mode == 0) {
        let r12 = Math.pow(r1, 2);
        let r22 = Math.pow(r2, 2);
        let t = random(r12, r22);
        let r = Math.pow(t, 1 / 2);

        let theta = 2 * Math.PI * Math.random();
        let x0 = Math.cos(theta);
        let y0 = Math.sin(theta);
        let x = r * x0;
        let y = r * y0;

        return [x, y, 0];
    } else {
        let r = random(r1, r2);
        let theta = 2 * Math.PI * Math.random();
        let x = r * Math.cos(theta);
        let y = r * Math.sin(theta);
        return [x, y, 0]
    }
}

export function cubeGenerator(callback, width = 1e3, gridSize = [10, 10, 10]) {
    let spacing = width / gridSize[0];
    for (let z = 0; z < gridSize[2]; z++) {
        let zPos = (z - gridSize[2] / 2 + 0.5) * spacing;
        for (let y = 0; y < gridSize[1]; y++) {
            let yPos = (y - gridSize[1] / 2 + 0.5) * spacing;
            for (let x = 0; x < gridSize[0]; x++) {
                let xPos = (x - gridSize[0] / 2 + 0.5) * spacing;
                callback(xPos, yPos, zPos, x, y, z);
            }
        }
    }
}

export function sphereGenerator(callback, radius = 1e3, gridSize = [10, 10, 10]) {
    let spacing = 2 * radius / gridSize[0];
    for (let x = 0; x < gridSize[0]; x++) {
        let xPos = (x - gridSize[0] / 2 + 0.5) * spacing;
        for (let y = 0; y < gridSize[1]; y++) {
            let yPos = (y - gridSize[1] / 2 + 0.5) * spacing;
            for (let z = 0; z < gridSize[2]; z++) {
                let zPos = (z - gridSize[2] / 2 + 0.5) * spacing;

                let sum = xPos * xPos + yPos * yPos + zPos * zPos;
                if (sum < radius * radius)
                    callback(xPos, yPos, zPos);
            }
        }
    }
}

function offsetHexToPixel(row, col, size) {
    let x = size * Math.sqrt(3) * (col + 0.5 * (row % 2));
    let y = size * 3 / 2 * row;
    return [x, y];
}

function axialHexToPixel(q, r, size) {
    let x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
    let y = size * (3. / 2 * r);
    return [x, y];
}

export function generateHexagon(cx, cy, radius, map) {
    for (let i = 0; i < 6; ++i) {
        let theta = (30 + 60 * i) * Math.PI / 180;
        let x = radius * Math.cos(theta) + cx;
        let y = radius * Math.sin(theta) + cy;

        let vertex = { x, y, i };
        let tag = x.toFixed(3) + " " + y.toFixed(3);
        if (!map.has(tag)) {
            map.set(tag, vertex);
        }
    }
}

export function hexagonGenerator(callback, cellRadius, grid, mode = "offset") {
    let hexToPixel = (mode == "offset") ? offsetHexToPixel : axialHexToPixel;

    let vertexMap = new Map();
    let width = grid[0];
    let height = grid[1];

    let totalLen = hexToPixel(height, width, cellRadius);
    totalLen[0] += 2 * cellRadius * Math.cos(30 * Math.PI / 180);
    totalLen[1] += 2 * cellRadius;

    for (let i = -height / 2; i <= height / 2; ++i) {
        for (let j = -width / 2; j <= width / 2; ++j) {
            let [cx, cy] = hexToPixel(i, j, cellRadius);
            generateHexagon(cx, cy, cellRadius, vertexMap);
        }
    }

    //console.log("hexagonGenerator vertex count: " + vertexMap.size);
    vertexMap.forEach((vertex) => {
        callback(vertex, totalLen);
    });
}

export function arrayToString(array, precision) {
    let str = "";
    array.forEach((v, idx) => {
        str += v.toFixed(precision) + ", ";
    });
    return str.slice(0, -2);
}

export function floatArrayToString(array, precision) {
    let str = "";
    array.forEach((v, idx) => {
        str += v.toExponential(precision) + ", ";
    });
    return str.slice(0, -2);
}

export function downloadFile(data, filename, type) {
    let file = new Blob([data], { type: type });
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        let a = document.createElement("a"),
            url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}

export function generateParticleColor(p, absCharge) {
    let h = 0, s = 100, l = 50;
    let lmin = 30, lmax = 60;

    if (absCharge <= 0) absCharge = 1;

    let charge = p.charge;
    if (charge > 0) {
        h = 240;
        l = Math.round(lmin + (lmax - lmin) * Math.abs(charge) / absCharge);
    } else if (charge < 0) {
        h = 0;
        l = Math.round(lmin + (lmax - lmin) * Math.abs(charge) / absCharge);
    } else {
        h = 120;
        l = lmin;
    }

    if (p.mass == 0) {
        l = 80;
    }

    if (p.nuclearCharge > 0) {
        //h += 10;
    } else if (p.nuclearCharge < 0) {
        h += 20;
    }

    while (h > 360) h -= 360;
    while (h < 0) h += 360;

    return "hsl(" + h + "," + s + "%," + l + "%)";
}

export function fillParticleRadius(particleList, particleRadius, particleRadiusRange, mMin, mMax, enableMassRadius) {
    if (particleList == undefined || particleList.length == 0) {
        console.log("empty particle list");
        return;
    }

    let minRadius = particleRadius - particleRadiusRange;
    let maxRadius = particleRadius + particleRadiusRange;
    if (minRadius <= 0)
        minRadius = 0.1;
    const absMass = Math.max(Math.abs(mMin), Math.abs(mMax));

    particleList.forEach((p, i) => {
        if (p.type == ParticleType.probe) {
            return;
        }

        let radius = minRadius;
        if (enableMassRadius && absMass != 0) {
            radius += Math.round((maxRadius - minRadius) * Math.abs(p.mass) / absMass);
        }
        p.radius = radius;
    });
}

export function fillParticleColor(particleList, qMin, qMax, enableChargeColor) {
    if (particleList == undefined || particleList.length == 0) {
        console.log("empty particle list");
        return;
    }

    const absCharge = Math.max(Math.abs(qMin), Math.abs(qMax));
    particleList.forEach((p, i) => {
        let color;
        if (enableChargeColor) {
            color = generateParticleColor(p, absCharge);
        } else {
            color = randomColor();
        }
        p.setColor(color);
    });
}

export function viewSize(graphics) {
    var vFOV = MathUtils.degToRad(graphics.camera.fov);
    var height = 2 * Math.tan(vFOV / 2) * graphics.controls.getDistance();
    var width = height * graphics.camera.aspect;
    return [width, height];
}

export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

export function cameraToWorldCoord(pointer, camera, targetZ = 0) {
    let point = new Vector3(pointer.x, pointer.y, 0.5).unproject(camera);
    point.sub(camera.position).normalize();
    let d = (targetZ - camera.position.z) / point.z;
    point.multiplyScalar(d);
    let pos = point.add(camera.position);
    return pos;
}

export function mouseToScreenCoord(event) {
    let pos = {};
    pos.x = (event.clientX / window.innerWidth) * 2 - 1;
    pos.y = - (event.clientY / window.innerHeight) * 2 + 1;
    return pos;
}

export function decodeVector3(value) {
    let split = value.split(",");
    if (split.length != 3) {
        console.log("error decoding position");
        return undefined;
    }
    let vec = {
        x: parseFloat(split[0]),
        y: parseFloat(split[1]),
        z: parseFloat(split[2])
    };
    return vec;
}

export function exportFilename(prefix = "particles") {
    let timestamp = new Date().toISOString();
    let finalName = prefix + "_" + timestamp;
    finalName = finalName.replaceAll(/[ :\/-]/ig, "_").replaceAll(/\.csv/ig, "");
    return finalName;
}

export function createParticles(simulation, typeList, n, options) {
    const defaultOptions = {
        randomSequence: true,

        m: 1,
        randomMSignal: false, randomMThresh: 0.5,
        randomM: false,
        roundM: false,
        allowZeroM: false,

        q: 1,
        randomQSignal: false, randomQThresh: 0.5,
        randomQ: false,
        roundQ: false,
        allowZeroQ: true,

        nq: 1,
        randomNQSignal: true,

        r0: 0,
        r1: 1, 
        center: new Vector3(),
        v1: 0,
    };
    options = { ...defaultOptions, ...options };

    for (let i = 0; i < n; ++i) {
        let p = new Particle();
        let type = random(0, typeList.length - 1, true);
        if (options.randomSequence == false) type = i % typeList.length;

        let m = options.m;
        m *= typeList[type].m;
        if ((options.randomMSignal == true) && (random(0, 1) >= options.randomMThresh)) m *= -1;
        if (options.randomM == true) m *= random(0, 1);
        if (options.roundM == true) m = Math.round(m);
        if (options.allowZeroM == false && m == 0) m = options.m * typeList[type].m;
        p.mass = m;

        let q = options.q;
        q *= typeList[type].q;
        if ((options.randomQSignal == true) && (random(0, 1) >= options.randomQThresh)) q *= -1;
        if (options.randomQ == true) q *= random(0, 1);
        if (options.roundQ == true) q = Math.round(q);
        if (options.allowZeroQ == false && q == 0) q = options.q * typeList[type].q;
        p.charge = q;

        let nq = options.nq;
        nq *= typeList[type].nq;
        if (options.randomNQSignal == true) {
            if (random(0, 1, true) == 1) nq *= -1;
        }
        p.nuclearCharge = nq;

        p.position = randomSphericVector(options.r0, options.r1, simulation.mode2D);
        p.position.add(options.center);

        p.velocity = randomSphericVector(0, options.v1, simulation.mode2D);

        simulation.physics.particleList.push(p);
    }
}

export function getCameraConstant(camera) {
    return window.innerHeight / (Math.tan(MathUtils.DEG2RAD * 0.5 * camera.fov) / camera.zoom);
}