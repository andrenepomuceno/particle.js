export function random(a, b, round = false) {
    let r = Math.random();
    r *= (b - a);
    r += a;
    if (round) {
        return Math.round(r);
    }
    return r;
}

export function randomColor() {
    const min = 10;
    const max = 255;
    const r = Math.round(random(min, max));
    const g = Math.round(random(min, max));
    const b = Math.round(random(min, max));
    return "rgb(" + r + "," + g + "," + b + ")";
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

export function randomDisc(r1, r2) {
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
}

export function cubeGenerator(callback, width = 1e3, gridSize = [10, 10, 10]) {
    let spacing = width/gridSize[0];
    for (let x = 0; x < gridSize[0]; x++) {
        let xPos = (x - gridSize[0] / 2 + 0.5) * spacing;
        for (let y = 0; y < gridSize[1]; y++) {
            let yPos = (y - gridSize[1] / 2 + 0.5) * spacing;
            for (let z = 0; z < gridSize[2]; z++) {
                let zPos = (z - gridSize[2] / 2 + 0.5) * spacing;
                callback(xPos, yPos, zPos);
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

export function arrayToString(array, precision) {
    let str = "";
    array.forEach((v, idx) => {
        str += v.toFixed(precision) + ", ";
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