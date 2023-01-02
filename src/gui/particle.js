import { ParticleType } from '../particle.js';
import {
    arrayToString
} from '../helpers.js';
import {
    simulation,
    core,
} from '../core.js';

let options = undefined;
let controls = undefined;

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
            id: "",
            name: '',
            mass: "",
            charge: "",
            nuclearCharge: "",
            position: "",
            velocityDir: "",
            velocityAbs: "",
            color: "#000000",
            fixed: false,
            energy: "",
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
                core.updateParticle(options.particle.obj, "reset", 0);
            },
            delete: () => {
                // TODO
            },
        };

        controls.add(options.particle, 'id').name('ID').listen().onFinishChange((val) => {
            let obj = core.findParticle(parseInt(val));
            if (obj == undefined) {
                if (simulation.physics.particleList == undefined ||
                    simulation.physics.particleList.length == 0) {
                    alert("There's no particles in the simulation!");
                } else {
                    alert("Particle not found!\n" +
                        "Hint: the first one is " + simulation.physics.particleList[0].id);
                }
                return;
            }
            options.particle.obj = obj;
        });
        controls.add(options.particle, 'name').name('Name').listen().onFinishChange((val) => {
            if (options.particle.obj != undefined) {
                options.particle.obj.name = val;
            }
        });
        controls.addColor(options.particle, 'color').name('Color').listen().onFinishChange(val => {
            core.updateParticle(options.particle.obj, 'color', val);
        });
        controls.add(options.particle, 'energy').name('Energy').listen();

        const guiParticleProperties = controls.addFolder("[+] Properties");
        guiParticleProperties.add(options.particle, 'mass').name('Mass').listen().onFinishChange((val) => {
            core.updateParticle(options.particle.obj, "mass", val);
        });
        guiParticleProperties.add(options.particle, 'charge').name('Charge').listen().onFinishChange((val) => {
            core.updateParticle(options.particle.obj, "charge", val);
        });
        guiParticleProperties.add(options.particle, 'nuclearCharge').name('Nuclear Charge').listen().onFinishChange((val) => {
            core.updateParticle(options.particle.obj, "nuclearCharge", val);
        });
        guiParticleProperties.open();

        const guiParticleVariables = controls.addFolder("[+] Variables");
        guiParticleVariables.add(options.particle, 'position').name('Position').listen().onFinishChange((val) => {
            core.updateParticle(options.particle.obj, "position", val);
        });
        guiParticleVariables.add(options.particle, 'velocityAbs').name('Velocity').listen().onFinishChange((val) => {
            core.updateParticle(options.particle.obj, "velocityAbs", val);
        });
        guiParticleVariables.add(options.particle, 'velocityDir').name('Direction').listen().onFinishChange((val) => {
            core.updateParticle(options.particle.obj, "velocityDir", val);
        });
        guiParticleVariables.add(options.particle, 'fixed').name('Fixed position?').listen().onFinishChange((val) => {
            core.updateParticle(options.particle.obj, "fixed", val);
        });
        //guiParticleVariables.open();

        //const guiParticleActions = gGuiParticle.addFolder("[+] Controls");
        controls.add(options.particle, 'follow').name('Follow/Unfollow');
        controls.add(options.particle, 'lookAt').name('Look At');
        controls.add(options.particle, 'reset').name('Reset Attributes');
        controls.add(options.particle, 'close').name('Close');

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
        }
    }
}

function guiParticleClose(clear = true) {
    options.particle.followParticle = false;
    if (clear) {
        let particleView = options.particle;
        particleView.obj = undefined;
        particleView.id = "";
        particleView.mass = "";
        particleView.charge = "";
        particleView.nuclearCharge = "";
        particleView.color = "";
        particleView.position = "";
        particleView.velocityDir = "";
        particleView.velocityAbs = "";
        particleView.energy = "";
        particleView.fixed = false;
    }
    controls.close();
}