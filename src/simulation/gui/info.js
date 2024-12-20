import {
    arrayToString,
    decodeVector3,
    floatArrayToString,
} from '../helpers.js';
import {
    simulation,
    core,
} from '../core.js';
import { calcListStatistics } from '../physics.js';
import { UI } from '../../ui/App.jsx';

let options, controls;
let maxAvgVelocity = 0;
let computeTimeHistory = [];

const refreshCallbackList = [];

function translateFolder(folder) {
    const regex = /[a-z]+/i;
    const result = regex.exec(folder.name)[0];
    const map = {
        'INFORMATION': 'general',
        'Simulation': 'statistics',
        'Ruler': 'ruler',
        'Debug': 'debug',
    }
    return map[result];
}

function addMenuControl(
    folder, title, variable,
    onFinishChange = undefined,
    variableList = undefined,
) {
    const defaultValue = options.info[variable];

    if (onFinishChange == undefined) {
        folder.add(options.info, variable, variableList).name(title).listen();
    }
    else {
        folder.add(options.info, variable, variableList).name(title).listen().onFinishChange(onFinishChange);
    }

    const item = {
        title: title,
        value: defaultValue,
        onFinish: onFinishChange,
        selectionList: variableList,
        folder: translateFolder(folder)
    }
    UI.addItem(UI.info, item);

    if (typeof defaultValue != 'function') {
        refreshCallbackList.push(() => {
            item.value = options.info[variable];
        });
    }
}

export class GUIInfo {
    constructor(guiOptions, guiInfo) {
        options = guiOptions;
        controls = guiInfo;
        this.setup();
    }

    setup() {
        options.info = {
            name: '',
            folderName: '',
            particles: '',
            maxParticles: '',
            time: '',
            collisions: '',
            outOfBoundary: '',

            mass: '',
            charge: '',
            nuclearCharge: '',
            colorCharge: '',
            energy: '',
            velocity: '',

            cameraDistance: '',
            cameraPosition: '',

            autoRefresh: true,

            rulerLen: '0',
            rulerDelta: '0,0,0',
            rulerStart: '0,0,0',

            // debug
            cameraNormal: '',
            fieldMaxVel: '0',
            fieldAvgVel: '0',
        };

        addMenuControl(controls, 'Scenario Name', 'name', (val) => {
            simulation.name = val;
        });
        addMenuControl(controls, 'Scenario Folder', 'folderName');
        addMenuControl(controls, 'Particles', 'particles');
        const onFinishMaxParticles = (val) => {
            val = parseFloat(val);
            if (isNaN(val)) {
                alert("Invalid value!");
                return;
            }

            if (val > simulation.physics.particleList.length) {
                simulation.graphics.readbackParticleData();
                simulation.graphics.setMaxParticles(val);
                simulation.drawParticles();
            } else if (val < simulation.physics.particleList.length) {
                simulation.graphics.readbackParticleData();
                simulation.graphics.setMaxParticles(val);
                let diff = simulation.physics.particleList.length - simulation.graphics.maxParticles;
                simulation.particleList.splice(0, diff);
                simulation.drawParticles();
            } else {
                // equal
            }
        }
        addMenuControl(controls, 'Max Particles', 'maxParticles', onFinishMaxParticles);
        addMenuControl(controls, 'Elapsed Time (steps)', 'time');
        /*addMenuControl(controls, 'Automatic Info. Refresh', 'autoRefresh', (val) => {
            options.info.autoRefresh = val;
        });*/
        const onFinishCamera = (val) => {
            let p = decodeVector3(val);
            if (p == undefined) {
                alert("Invalid coordinates!");
                return;
            }
            simulation.graphics.camera.position.set(p.x, p.y, p.z);
            simulation.graphics.controls.target.set(p.x, p.y, 0);
            simulation.graphics.controls.update();
        }
        addMenuControl(controls, 'Camera Coordinates', 'cameraPosition', onFinishCamera);

        const guiInfoMore = controls.addFolder("[+] Simulation Statistics");
        addMenuControl(guiInfoMore, 'Mass (sum)', 'mass', (val) => {
            core.updateParticleList('mass', val);
        });
        addMenuControl(guiInfoMore, 'Charge (sum)', 'charge', (val) => {
            core.updateParticleList('charge', val);
        });
        addMenuControl(guiInfoMore, 'Nuclear Charge (sum)', 'nuclearCharge', (val) => {
            core.updateParticleList('nuclearCharge', val);
        });
        addMenuControl(guiInfoMore, 'Color Charge (sum)', 'colorCharge'/*, (val) => {
            core.updateParticleList('colorCharge', val);
        }*/);
        addMenuControl(guiInfoMore, 'Energy (avg)', 'energy');
        addMenuControl(guiInfoMore, 'Velocity (avg)', 'velocity');
        addMenuControl(guiInfoMore, 'Collisions', 'collisions');
        addMenuControl(guiInfoMore, 'Out of Boundary', 'outOfBoundary');

        const guiInfoRuler = controls.addFolder("[+] Ruler");
        addMenuControl(guiInfoRuler, 'Length', 'rulerLen');
        addMenuControl(guiInfoRuler, 'Delta', 'rulerDelta');
        addMenuControl(guiInfoRuler, 'Start', 'rulerStart');
        //guiInfoRuler.open();

        if (!ENV?.production) {
            const guiInfoDebug = controls.addFolder('[+] Debug');
            addMenuControl(guiInfoDebug, 'cameraNormal', 'cameraNormal');
            addMenuControl(guiInfoDebug, 'fieldMaxVel', 'fieldMaxVel');
            addMenuControl(guiInfoDebug, 'fieldAvgVel', 'fieldAvgVel');
            //guiInfoDebug.open();
            options.collapseList.push(guiInfoDebug);
        }

        options.collapseList.push(controls);
        options.collapseList.push(guiInfoMore);
        options.collapseList.push(guiInfoRuler);

        controls.open();
    }

    refresh() {
        simulation.stats = calcListStatistics(simulation.particleList);

        let avgVelocity = Math.sqrt(simulation.stats.totalEnergy / simulation.stats.totalMass);
        simulation.physics.avgVelocity = avgVelocity;
        simulation.graphics.updateAvgVelocity(avgVelocity);
        simulation.field.refreshMaxVelocity();

        options.info.name = simulation.name;
        options.info.folderName = simulation.folderName;
        options.info.particles = simulation.stats.particles;
        options.info.maxParticles = simulation.graphics.maxParticles;

        let realTime = new Date(simulation.totalTime).toISOString().substring(11, 19);
        options.info.time = realTime + " (" + simulation.cycles + ")";

        options.info.fieldMaxVel = simulation.field.maxVelocity.toExponential(2);
        options.info.fieldAvgVel = simulation.field.avgVelocity.toExponential(2);

        options.info.energy = simulation.stats.avgEnergy.toExponential(2);
        options.info.velocity = avgVelocity.toExponential(2);

        options.info.collisions = simulation.stats.collisions;
        options.info.outOfBoundary = simulation.stats.outOfBoundary;
        options.info.mass = simulation.stats.totalMass.toExponential(2);
        options.info.charge = simulation.stats.totalCharge.toExponential(2);
        options.info.nuclearCharge = simulation.stats.totalNuclearCharge.toExponential(2);
        options.info.colorCharge = simulation.stats.totalColorCharge.toArray();
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

        refreshCallbackList.forEach((callback) => {
            if (callback != undefined) {
                callback();
            }
        })
    }

    reset() {
        maxAvgVelocity = 0;
        computeTimeHistory = [];
    }
}
