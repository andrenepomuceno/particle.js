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
const refreshCallbackList = [];

function addMenuControl(
    folder, title, variable,
    onFinishChange = undefined,
) {
    const defaultValue = options.particle[variable];
    const variableList = undefined;

    const item = {
        title: title,
        value: defaultValue,
        onFinish: onFinishChange,
        selectionList: variableList,
        folder
    }
    UI.addItem(UI.particle, item);
    if (typeof defaultValue != 'function') {
        refreshCallbackList.push(() => {
            item.value = options.particle[variable];
        });
    }
}

export class GUIParticle {
    constructor(guiOptions) {
        options = guiOptions;
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

        addMenuControl('particle', 'ID 🔍', 'id', (val) => {
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
        addMenuControl('particle', 'Name', 'name', (val) => {
            if (options.particle.obj != undefined) {
                options.particle.obj.name = val;
            }
        });
        // 'particle'.addColor(options.particle, 'color').name('Color').listen().onFinishChange(val => {
        //     core.updateParticle(options.particle.obj, 'color', val);
        // });
        addMenuControl('particle', 'Energy', 'energy');

        addMenuControl('particle', 'Mass', 'mass', (val) => {
            core.updateParticle(options.particle.obj, 'mass', val);
        });
        addMenuControl('particle', 'Charge', 'charge', (val) => {
            core.updateParticle(options.particle.obj, 'charge', val);
        });
        addMenuControl('particle', 'Nuclear Charge', 'nuclearCharge', (val) => {
            core.updateParticle(options.particle.obj, 'nuclearCharge', val);
        });
        addMenuControl('particle', 'Color Charge', 'colorCharge');

        addMenuControl('particle', 'Position', 'position', (val) => {
            core.updateParticle(options.particle.obj, 'position', val);
        });
        addMenuControl('particle', 'Velocity', 'velocityAbs', (val) => {
            core.updateParticle(options.particle.obj, 'velocityAbs', val);
        });
        addMenuControl('particle', 'Direction', 'velocityDir', (val) => {
            core.updateParticle(options.particle.obj, 'velocityDir', val);
        });

        addMenuControl('particle', 'Follow/Unfollow', 'follow');
        addMenuControl('particle', 'Look At', 'lookAt');

        addMenuControl('particle', 'Fixed position?', 'fixed', (val) => {
            core.updateParticle(options.particle.obj, 'fixed', val);
        });
        //addMenuControl(controls, 'Reset Attributes', 'reset');
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

    UI.particle.setOpen(false);
}