import { ParticleType } from '../particle.js';
import {
    arrayToString
} from '../helpers.js';
import {
    simulation,
    core,
} from '../core.js';

let gGuiOptions = undefined;
let gGuiParticle = undefined;

export function guiParticleSetup(guiOptions, guiParticle) {
    gGuiOptions = guiOptions;
    gGuiParticle = guiParticle;

    guiOptions.particle = {
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
            guiOptions.particle.followParticle = !guiOptions.particle.followParticle;
        },
        lookAt: function () {
            let x = guiOptions.particle.obj.position;
            guiOptions.cameraTargetSet(x);
            //simulation.graphics.controls.target.set(x.x, x.y, x.z);
        },
        close: function (val) {
            guiParticleClose(guiOptions, val);
        },
        reset: () => {
            core.updateParticle(guiOptions.particle.obj, "reset", 0);
        },
        delete: () => {
            // TODO
        },
    };

    guiParticle.add(guiOptions.particle, 'id').name('ID').listen().onFinishChange((val) => {
        let obj = core.findParticle(parseInt(val));
        if (obj == undefined) {
            if (simulation.physics.particleList == undefined ||
                simulation.physics.particleList.length == 0) {
                alert("There's no particle in the simulation!");
            } else {
                alert("Particle not found!\n" +
                    "Hint: the first one is " + simulation.physics.particleList[0].id);
            }
            return;
        }
        guiOptions.particle.obj = obj;
    });
    guiParticle.add(guiOptions.particle, 'name').name('Name').listen().onFinishChange((val) => {
        if (guiOptions.particle.obj != undefined) {
            guiOptions.particle.obj.name = val;
        }
    });
    guiParticle.addColor(guiOptions.particle, 'color').name('Color').listen().onFinishChange(val => {
        core.updateParticle(guiOptions.particle.obj, 'color', val);
    });
    guiParticle.add(guiOptions.particle, 'energy').name('Energy').listen();

    const guiParticleProperties = guiParticle.addFolder("[+] Properties");
    guiParticleProperties.add(guiOptions.particle, 'mass').name('Mass').listen().onFinishChange((val) => {
        core.updateParticle(guiOptions.particle.obj, "mass", val);
    });
    guiParticleProperties.add(guiOptions.particle, 'charge').name('Charge').listen().onFinishChange((val) => {
        core.updateParticle(guiOptions.particle.obj, "charge", val);
    });
    guiParticleProperties.add(guiOptions.particle, 'nuclearCharge').name('Nuclear Charge').listen().onFinishChange((val) => {
        core.updateParticle(guiOptions.particle.obj, "nuclearCharge", val);
    });
    guiParticleProperties.open();

    const guiParticleVariables = guiParticle.addFolder("[+] Variables");
    guiParticleVariables.add(guiOptions.particle, 'position').name('Position').listen().onFinishChange((val) => {
        core.updateParticle(guiOptions.particle.obj, "position", val);
    });
    guiParticleVariables.add(guiOptions.particle, 'velocityAbs').name('Velocity').listen().onFinishChange((val) => {
        core.updateParticle(guiOptions.particle.obj, "velocityAbs", val);
    });
    guiParticleVariables.add(guiOptions.particle, 'velocityDir').name('Direction').listen().onFinishChange((val) => {
        core.updateParticle(guiOptions.particle.obj, "velocityDir", val);
    });
    guiParticleVariables.add(guiOptions.particle, 'fixed').name('Fixed position?').listen().onFinishChange((val) => {
        core.updateParticle(guiOptions.particle.obj, "fixed", val);
    });
    //guiParticleVariables.open();

    //const guiParticleActions = guiParticle.addFolder("[+] Controls");
    guiParticle.add(guiOptions.particle, 'follow').name('Follow/Unfollow');
    guiParticle.add(guiOptions.particle, 'lookAt').name('Look At');
    guiParticle.add(guiOptions.particle, 'reset').name('Reset Attributes');
    guiParticle.add(guiOptions.particle, 'close').name('Close');

    guiOptions.collapseList.push(guiParticle);
    //guiOptions.collapseList.push(guiParticleActions);
    guiOptions.collapseList.push(guiParticleVariables);
    guiOptions.collapseList.push(guiParticleProperties);
}

export function guiParticleRefresh(guiOptions) {
    let particleView = guiOptions.particle;
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

function guiParticleClose(guiOptions, clear = true) {
    gGuiOptions.particle.followParticle = false;
    if (clear) {
        let particleView = gGuiOptions.particle;
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
    gGuiParticle.close();
}