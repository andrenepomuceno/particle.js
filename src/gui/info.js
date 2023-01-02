import {
    arrayToString,
    decodeVector3,
    floatArrayToString,
} from '../helpers.js';
import {
    simulation,
    core,
} from '../core.js';

let options, controls;
let maxAvgVelocity = 0;
let computeTimeHistory = [];

export class GUIInfo {
    constructor(guiOptions, guiInfo) {
        options = guiOptions;
        controls = guiInfo;
        this.setup();
    }

    setup() {
        options.info = {
            name: "",
            folderName: "",
            particles: 0,
            maxParticles: "",
            time: "",
            collisions: 0,

            mass: "",
            charge: "",
            nuclearCharge: '',
            energy: "",
            velocity: "",

            cameraDistance: "",
            cameraPosition: "",

            autoRefresh: true,

            rulerLen: '0',
            rulerDelta: '0,0,0',
            rulerStart: '0,0,0',

            // debug
            cameraNormal: '',
            fieldMaxVel: '0',
            fieldAvgVel: '0',
        };

        controls.add(options.info, 'name').name('Name').listen().onFinishChange((val) => {
            simulation.name = val;
        });
        controls.add(options.info, 'folderName').name('Folder').listen();
        controls.add(options.info, 'particles').name('Particles').listen();
        controls.add(options.info, 'maxParticles').name('Max Particles').listen().onFinishChange((val) => {
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
            options.scenarioSetup();
        });
        controls.add(options.info, 'time').name('Time').listen();
        controls.add(options.info, 'autoRefresh').name('Automatic Refresh').listen().onFinishChange((val) => {
            options.info.autoRefresh = val;
        });
        controls.open();

        const guiInfoMore = controls.addFolder("[+] Statistics");
        guiInfoMore.add(options.info, 'mass').name('Mass (sum)').listen().onFinishChange((val) => {
            core.updateParticleList("mass", val);
        });
        guiInfoMore.add(options.info, 'charge').name('Charge (sum)').listen().onFinishChange((val) => {
            core.updateParticleList("charge", val);
        });
        guiInfoMore.add(options.info, 'nuclearCharge').name('Nuclear Charge (sum)').listen().onFinishChange((val) => {
            core.updateParticleList("nuclearCharge", val);
        });
        guiInfoMore.add(options.info, 'energy').name('Energy (avg)').listen();
        guiInfoMore.add(options.info, 'velocity').name('Velocity (avg)').listen();
        guiInfoMore.add(options.info, 'collisions').name('Collisions').listen();

        const guiInfoRuler = controls.addFolder("[+] Ruler");
        guiInfoRuler.add(options.info, 'cameraPosition').name('Camera Coordinates').listen().onFinishChange((val) => {
            let p = decodeVector3(val);
            if (p == undefined) {
                alert("Invalid coordinates!");
                return;
            }
            simulation.graphics.camera.position.set(p.x, p.y, p.z);
            simulation.graphics.controls.target.set(p.x, p.y, 0);
            simulation.graphics.controls.update();
        });
        guiInfoRuler.add(options.info, 'rulerLen').name("Length").listen();
        guiInfoRuler.add(options.info, 'rulerDelta').name("Delta").listen();
        guiInfoRuler.add(options.info, 'rulerStart').name("Start").listen();
        guiInfoRuler.open();

        if (!ENV?.production) {
            const guiInfoDebug = controls.addFolder('[+] Debug');
            guiInfoDebug.add(options.info, 'cameraNormal').name('cameraNormal').listen();
            guiInfoDebug.add(options.info, 'fieldMaxVel').name('fieldMaxVel').listen();
            guiInfoDebug.add(options.info, 'fieldAvgVel').name('fieldAvgVel').listen();
            guiInfoDebug.open();
            options.collapseList.push(guiInfoDebug);
        }

        //options.collapseList.push(guiInfo);
        options.collapseList.push(guiInfoMore);
        options.collapseList.push(guiInfoRuler);

    }

    refresh() {
        let [name, n, t, e, c, m, r, totalTime, totalCharge] = simulation.state();

        options.info.name = name;
        options.info.folderName = simulation.folderName;
        options.info.particles = n;
        options.info.maxParticles = simulation.graphics.maxParticles;

        let realTime = new Date(totalTime).toISOString().substring(11, 19);
        options.info.time = realTime + " (" + t + ")";

        n = (n == 0) ? (1) : (n);
        m = (m == 0) ? (1) : (m);
        let avgEnergy = simulation.stats.avgEnergy;
        let avgVelocity = Math.sqrt(e / m);
        simulation.physics.avgEnergy = avgEnergy;
        simulation.physics.avgVelocity = avgVelocity;
        simulation.graphics.updateAvgVelocity(avgVelocity);

        simulation.field.refreshMaxVelocity();
        options.info.fieldMaxVel = simulation.field.maxVelocity.toExponential(2);
        options.info.fieldAvgVel = simulation.field.avgVelocity.toExponential(2);

        options.info.energy = avgEnergy.toExponential(2);
        options.info.velocity = avgVelocity.toExponential(2);

        options.info.collisions = c;
        options.info.mass = m.toExponential(2);
        options.info.charge = totalCharge.toExponential(2);
        options.info.nuclearCharge = simulation.stats.totalNuclearCharge.toExponential(2);
        options.info.cameraPosition = floatArrayToString(simulation.graphics.camera.position.toArray(), 1);
        let tmp = simulation.graphics.controls.target.clone().sub(simulation.graphics.camera.position).normalize().toArray();
        options.info.cameraNormal = arrayToString(tmp, 1);

        if (avgVelocity > maxAvgVelocity) maxAvgVelocity = avgVelocity;
        options.velocityPanel.update(avgVelocity, maxAvgVelocity);

        let computeTime = simulation.getComputeTime();
        options.computePanel.update(1000 * computeTime.avg, 1000 * computeTime.max);

        //console.log(realTime + ',' + avg);
        computeTimeHistory.push({
            time: realTime,
            avg: computeTime.avg,
        });

    }

    reset() {
        maxAvgVelocity = 0;
        computeTimeHistory = [];
    }
}
