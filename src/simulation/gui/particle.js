import { ParticleType } from '../particle.js';
import {
    arrayToString
} from '../helpers.js';
import {
    simulation,
    core,
} from '../core.js';
import { UI } from '../../ui/App';

let options = undefined;
let controls = undefined;
const refreshCallbackList = [];

function addMenuControl(
    folder, title, variable,
    onFinishChange = undefined,
) {
    const defaultValue = options.particle[variable];
    const variableList = undefined;

    if (onFinishChange == undefined) {
        folder.add(options.particle, variable).name(title);
    }
    else {
        folder.add(options.particle, variable, variableList).name(title).listen().onFinishChange(onFinishChange);
    }

    const item = {
        title: title,
        value: defaultValue,
        onFinish: onFinishChange,
        selectionList: variableList,
        folder: 'particle'
    }
    UI.addItem(UI.particle, item);
    if (typeof defaultValue != 'function') {
        refreshCallbackList.push(() => {
            item.value = options.particle[variable];
        });
    }
}

export class GUIParticle {
    constructor(guiOptions, guiParticle) {
        options = guiOptions;
        controls = guiParticle;
        this.setup();
    }

    setup() {
        options.particle = {
            obj: undefined,
            followParticle: false,
            id: '',
            name: '',
            mass: '',
            charge: '',
            nuclearCharge: '',
            colorCharge: '',
            position: '',
            velocityDir: '',
            velocityAbs: '',
            color: "#000000",
            fixed: false,
            energy: '',
            follow: function () {
                options.particle.followParticle = !options.particle.followParticle;
            },
            lookAt: function () {
                let x = options.particle.obj.position;
                options.cameraTargetSet(x);
                //simulation.graphics.controls.target.set(x.x, x.y, x.z);
            },
            close: guiParticleClose,
            reset: () => {
                core.updateParticle(options.particle.obj, 'reset', 0);
            },
            delete: () => {
                // TODO
            },
        };

        addMenuControl(controls, 'ID 🔍', 'id', (val) => {
            if (val == "") return;
            let obj = core.findParticle(parseInt(val));
            if (obj == undefined) {
                if (simulation.physics.particleList == undefined ||
                    simulation.physics.particleList.length == 0) {
                    alert("There's no particles in the simulation!");
                } else {
                    let idMin = Infinity, idMax = 0;
                    simulation.physics.particleList.forEach((particle) => {
                        idMin = Math.min(particle.id, idMin);
                        idMax = Math.max(particle.id, idMax);
                    });
                    alert("Particle not found!\n" +
                        "First: " + idMin + " Last: " + idMax);
                }
                return;
            }
            options.particle.obj = obj;
        });
        addMenuControl(controls, 'Name ✏️', 'name', (val) => {
            if (options.particle.obj != undefined) {
                options.particle.obj.name = val;
            }
        });
        controls.addColor(options.particle, 'color').name('Color ✏️').listen().onFinishChange(val => {
            core.updateParticle(options.particle.obj, 'color', val);
        });
        addMenuControl(controls, 'Energy', 'energy');

        const guiParticleProperties = controls.addFolder("[+] Properties");
        addMenuControl(guiParticleProperties, 'Mass ✏️', 'mass', (val) => {
            core.updateParticle(options.particle.obj, 'mass', val);
        });
        addMenuControl(guiParticleProperties, 'Charge ✏️', 'charge', (val) => {
            core.updateParticle(options.particle.obj, 'charge', val);
        });
        addMenuControl(guiParticleProperties, 'Nuclear Charge ✏️', 'nuclearCharge', (val) => {
            core.updateParticle(options.particle.obj, 'nuclearCharge', val);
        });
        addMenuControl(guiParticleProperties, 'Color Charge', 'colorCharge');
        guiParticleProperties.open();

        const guiParticleVariables = controls.addFolder("[+] Variables ✏️");
        addMenuControl(guiParticleVariables, 'Position', 'position', (val) => {
            core.updateParticle(options.particle.obj, 'position', val);
        });
        addMenuControl(guiParticleVariables, 'Velocity', 'velocityAbs', (val) => {
            core.updateParticle(options.particle.obj, 'velocityAbs', val);
        });
        addMenuControl(guiParticleVariables, 'Direction', 'velocityDir', (val) => {
            core.updateParticle(options.particle.obj, 'velocityDir', val);
        });
        addMenuControl(guiParticleVariables, 'Fixed position?', 'fixed', (val) => {
            core.updateParticle(options.particle.obj, 'fixed', val);
        });
        //guiParticleVariables.open();

        //const guiParticleActions = gGuiParticle.addFolder("[+] Controls");
        addMenuControl(controls, 'Follow/Unfollow', 'follow');
        addMenuControl(controls, 'Look At', 'lookAt');
        //addMenuControl(controls, 'Reset Attributes', 'reset');
        controls.add(options.particle, 'close').name('Close 🔺');

        options.collapseList.push(controls);
        //gGuiOptions.collapseList.push(guiParticleActions);
        options.collapseList.push(guiParticleVariables);
        options.collapseList.push(guiParticleProperties);
    }

    refresh() {
        let particleView = options.particle;
        let particle = particleView.obj;

        if (particle) {
            //static info
            particleView.id = particle.id;
            particleView.name = particle.name;
            particleView.mass = particle.mass.toExponential(3);
            particleView.charge = particle.charge.toExponential(3);
            particleView.nuclearCharge = particle.nuclearCharge;
            particleView.colorCharge = particle.colorCharge;
            particleView.fixed = (particle.type == ParticleType.fixed);

            let color = particle.color;
            particleView.color = "#" + color.getHexString();//arrayToString(color.toArray(), 2);

            //dynamic info
            let position = [];
            particle.position.toArray().forEach(element => {
                position.push(element.toExponential(3));
            });
            particleView.position = position;
            particleView.velocityDir = arrayToString(
                particle.velocity.clone().normalize().toArray(), 3);
            particleView.velocityAbs = particle.velocity.length().toExponential(3);
            particleView.energy = particle.energy().toExponential(3);

            refreshCallbackList.forEach((callback) => {
                if (callback != undefined) {
                    callback();
                }
            });
    
            UI.particle.refresh();
        }
    }
}

function guiParticleClose(clear = true) {
    options.particle.followParticle = false;
    if (clear) {
        let particleView = options.particle;
        particleView.obj = undefined;
        particleView.id = '';
        particleView.mass = '';
        particleView.charge = '';
        particleView.nuclearCharge = '';
        particleView.color = '';
        particleView.position = '';
        particleView.velocityDir = '';
        particleView.velocityAbs = '';
        particleView.energy = '';
        particleView.fixed = false;
    }
    controls.close();

    UI.particle.setOpen(false);
}