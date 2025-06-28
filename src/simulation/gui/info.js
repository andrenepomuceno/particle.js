import { addUIOption } from './uiHelper.js';
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

let options;
let maxAvgVelocity = 0;
let computeTimeHistory = [];

const refreshCallbackList = [];

function addMenuControl(
    folder, title, variable,
    onFinishChange = undefined,
    variableList = undefined,
) {
    addUIOption({
        folder,
        title,
        variable,
        options: options.info,
        component: UI.info,
        refreshCallbacks: refreshCallbackList,
        onFinishChange,
        selectionList: variableList
    });
}

export class GUIInfo {
    constructor(guiOptions) {
        options = guiOptions;
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

        addMenuControl('general', 'Scenario Name', 'name', (val) => {
            simulation.name = val;
        });
        addMenuControl('general', 'Scenario Folder', 'folderName');
        addMenuControl('general', 'Particles', 'particles');
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
        addMenuControl('general', 'Max Particles', 'maxParticles', onFinishMaxParticles);
        addMenuControl('general', 'Elapsed Time (steps)', 'time');
        
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
        addMenuControl('general', 'Camera Coordinates', 'cameraPosition', onFinishCamera);

        addMenuControl('statistics', 'Mass (sum)', 'mass', (val) => {
            core.updateParticleList('mass', val);
        });
        addMenuControl('statistics', 'Charge (sum)', 'charge', (val) => {
            core.updateParticleList('charge', val);
        });
        addMenuControl('statistics', 'Nuclear Charge (sum)', 'nuclearCharge', (val) => {
            core.updateParticleList('nuclearCharge', val);
        });
        addMenuControl('statistics', 'Color Charge (sum)', 'colorCharge'/*, (val) => {
            core.updateParticleList('colorCharge', val);
        }*/);
        addMenuControl('statistics', 'Energy (avg)', 'energy');
        addMenuControl('statistics', 'Velocity (avg)', 'velocity');
        addMenuControl('statistics', 'Collisions', 'collisions');
        addMenuControl('statistics', 'Out of Boundary', 'outOfBoundary');

        addMenuControl('ruler', 'Length', 'rulerLen');
        addMenuControl('ruler', 'Delta', 'rulerDelta');
        addMenuControl('ruler', 'Start', 'rulerStart');

        if (!ENV?.production) {
            addMenuControl('debug', 'cameraNormal', 'cameraNormal');
            addMenuControl('debug', 'fieldMaxVel', 'fieldMaxVel');
            addMenuControl('debug', 'fieldAvgVel', 'fieldAvgVel');
        }
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
        });

        // UI.info.setState(UI.info);
    }

    reset() {
        maxAvgVelocity = 0;
        computeTimeHistory = [];
    }
}
