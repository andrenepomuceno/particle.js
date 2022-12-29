import {
    arrayToString,
    decodeVector3,
    floatArrayToString,
} from '../helpers.js';
import {
    simulation,
    core,
} from '../core.js';

export let autoRefresh = true;

export function guiInfoSetup(guiOptions, guiInfo, collapseList) {
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
        autoRefresh: autoRefresh,
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
        autoRefresh = val;
    });

    if (!ENV?.production) {
        const guiInfoDebug = guiInfo.addFolder('[+] Debug');
        guiInfoDebug.add(guiOptions.info, 'cameraNormal').name('cameraNormal').listen();
        guiInfoDebug.add(guiOptions.info, 'fieldMaxVel').name('fieldMaxVel').listen();
        guiInfoDebug.add(guiOptions.info, 'fieldAvgVel').name('fieldAvgVel').listen();
        guiInfoDebug.open();
        collapseList.push(guiInfoDebug);
    }

    //collapseList.push(guiInfo);
    collapseList.push(guiInfoMore);
    collapseList.push(guiInfoRuler);
}

export function guiInfoRefresh(guiOptions) {
    let [name, n, t, e, c, m, r, totalTime, totalCharge] = simulation.state();

    guiOptions.info.name = name;
    guiOptions.info.folderName = simulation.folderName;
    guiOptions.info.particles = n;
    guiOptions.info.maxParticles = simulation.graphics.maxParticles;

    let realTime = new Date(totalTime).toISOString().substring(11, 19);
    guiOptions.info.time = realTime + " (" + t + ")";

    n = (n == 0) ? (1) : (n);
    m = (m == 0) ? (1) : (m);
    let avgEnergy = e / n;
    let avgVelocity = Math.sqrt(e / m);
    simulation.physics.avgEnergy = avgEnergy;
    simulation.physics.avgVelocity = avgVelocity;
    simulation.graphics.pointsUniforms['uAvgVelocity'].value = avgVelocity; // TODO FIX THIS

    simulation.field.refreshMaxVelocity();
    guiOptions.info.fieldMaxVel = simulation.field.maxVelocity.toExponential(2);
    guiOptions.info.fieldAvgVel = simulation.field.avgVelocity.toExponential(2);

    guiOptions.info.energy = avgEnergy.toExponential(2);
    guiOptions.info.velocity = avgVelocity.toExponential(2);

    guiOptions.info.collisions = c;
    guiOptions.info.mass = m.toExponential(2);
    guiOptions.info.charge = totalCharge.toExponential(2);
    guiOptions.info.cameraPosition = floatArrayToString(simulation.graphics.camera.position.toArray(), 1);
    let tmp = simulation.graphics.controls.target.clone().sub(simulation.graphics.camera.position).normalize().toArray();
    guiOptions.info.cameraNormal = arrayToString(tmp, 1);
    guiOptions.info.mode2D = simulation.mode2D;

    let energy = avgVelocity;
    if (energy > guiOptions.energyPanel.max) guiOptions.energyPanel.max = energy;
    guiOptions.energyPanel.update(energy, guiOptions.energyPanel.max);
}