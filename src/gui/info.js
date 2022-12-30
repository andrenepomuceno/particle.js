import {
    arrayToString,
    decodeVector3,
    floatArrayToString,
} from '../helpers.js';
import {
    simulation,
    core,
} from '../core.js';

let options;

export function guiInfoSetup(guiOptions, guiInfo) {
    options = guiOptions;

    guiOptions.info = {
        name: "",
        particles: "",
        maxParticles: "",
        energy: "",
        time: "",
        collisions: 0,
        mass: "",
        radius: "",
        charge: "",
        cameraDistance: "",
        cameraPosition: "",
        autoRefresh: true,
        mode2D: false,
        folderName: "",
        velocity: "",
        // debug
        cameraNormal: '',
        fieldMaxVel: '0',
        fieldAvgVel: '0',
        rulerLen: '0',
        rulerDelta: '0,0,0',
        rulerStart: '0,0,0',
    };

    guiInfo.add(guiOptions.info, 'name').name('Name').listen().onFinishChange((val) => {
        simulation.name = val;
    });
    guiInfo.add(guiOptions.info, 'folderName').name('Folder').listen();
    guiInfo.add(guiOptions.info, 'particles').name('Particles').listen();
    guiInfo.add(guiOptions.info, 'maxParticles').name('Max Particles').listen().onFinishChange((val) => {
        val = parseFloat(val);
        if (val == simulation.physics.particleList.length) {
            return;
        }
        if (val > simulation.physics.particleList.length) {
            simulation.graphics.readbackParticleData();
            simulation.graphics.setMaxParticles(val);
            simulation.drawParticles();
            return;
        }
        simulation.graphics.setMaxParticles(val);
        guiOptions.scenarioSetup();
    });
    guiInfo.add(guiOptions.info, 'time').name('Time').listen();
    guiInfo.open();

    const guiInfoMore = guiInfo.addFolder("[+] Statistics");
    guiInfoMore.add(guiOptions.info, 'energy').name('Energy (avg)').listen();
    guiInfoMore.add(guiOptions.info, 'velocity').name('Velocity (avg)').listen();
    guiInfoMore.add(guiOptions.info, 'mass').name('Mass (sum)').listen().onFinishChange((val) => {
        core.updateParticleList("mass", val);
    });
    guiInfoMore.add(guiOptions.info, 'charge').name('Charge (sum)').listen().onFinishChange((val) => {
        core.updateParticleList("charge", val);
    });
    guiInfoMore.add(guiOptions.info, 'collisions').name('Collisions').listen();

    const guiInfoRuler = guiInfo.addFolder("[+] Ruler");
    guiInfoRuler.add(guiOptions.info, 'cameraPosition').name('Camera Coordinates').listen().onFinishChange((val) => {
        let p = decodeVector3(val);
        if (p == undefined) {
            alert("Invalid coordinates!");
            return;
        }
        simulation.graphics.camera.position.set(p.x, p.y, p.z);
        simulation.graphics.controls.target.set(p.x, p.y, 0);
        simulation.graphics.controls.update();
    });
    guiInfoRuler.add(guiOptions.info, 'rulerLen').name("Length").listen();
    guiInfoRuler.add(guiOptions.info, 'rulerDelta').name("Delta").listen();
    guiInfoRuler.add(guiOptions.info, 'rulerStart').name("Start").listen();
    guiInfoRuler.open();

    guiInfo.add(guiOptions.info, 'mode2D').name('2D Mode').listen().onFinishChange((val) => {
        simulation.bidimensionalMode(val);
    });
    guiInfo.add(guiOptions.info, 'autoRefresh').name('Automatic Refresh').listen().onFinishChange((val) => {
        guiOptions.info.autoRefresh = val;
    });

    if (!ENV?.production) {
        const guiInfoDebug = guiInfo.addFolder('[+] Debug');
        guiInfoDebug.add(guiOptions.info, 'cameraNormal').name('cameraNormal').listen();
        guiInfoDebug.add(guiOptions.info, 'fieldMaxVel').name('fieldMaxVel').listen();
        guiInfoDebug.add(guiOptions.info, 'fieldAvgVel').name('fieldAvgVel').listen();
        guiInfoDebug.open();
        guiOptions.collapseList.push(guiInfoDebug);
    }

    //guiOptions.collapseList.push(guiInfo);
    guiOptions.collapseList.push(guiInfoMore);
    guiOptions.collapseList.push(guiInfoRuler);
}

export function guiInfoRefresh() {
    let [name, n, t, e, c, m, r, totalTime, totalCharge] = simulation.state();

    options.info.name = name;
    options.info.folderName = simulation.folderName;
    options.info.particles = n;
    options.info.maxParticles = simulation.graphics.maxParticles;

    let realTime = new Date(totalTime).toISOString().substring(11, 19);
    options.info.time = realTime + " (" + t + ")";

    n = (n == 0) ? (1) : (n);
    m = (m == 0) ? (1) : (m);
    let avgEnergy = e / n;
    let avgVelocity = Math.sqrt(e / m);
    simulation.physics.avgEnergy = avgEnergy;
    simulation.physics.avgVelocity = avgVelocity;
    simulation.graphics.pointsUniforms['uAvgVelocity'].value = avgVelocity; // TODO FIX THIS

    simulation.field.refreshMaxVelocity();
    options.info.fieldMaxVel = simulation.field.maxVelocity.toExponential(2);
    options.info.fieldAvgVel = simulation.field.avgVelocity.toExponential(2);

    options.info.energy = avgEnergy.toExponential(2);
    options.info.velocity = avgVelocity.toExponential(2);

    options.info.collisions = c;
    options.info.mass = m.toExponential(2);
    options.info.charge = totalCharge.toExponential(2);
    options.info.cameraPosition = floatArrayToString(simulation.graphics.camera.position.toArray(), 1);
    let tmp = simulation.graphics.controls.target.clone().sub(simulation.graphics.camera.position).normalize().toArray();
    options.info.cameraNormal = arrayToString(tmp, 1);
    options.info.mode2D = simulation.mode2D;

    let energy = avgVelocity;
    if (energy > options.energyPanel.max) options.energyPanel.max = energy;
    options.energyPanel.update(energy, options.energyPanel.max);

    let avg = simulation.getComputeTime().toFixed(3);
    options.computePanel.update(1000 * avg, 1000);
    /*console.log(realTime + ',' + avg);
    computeTimeHistory.push({
        time: realTime,
        avg: avg,
    });*/
}

let computeTimeHistory = [];