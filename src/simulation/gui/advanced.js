import {
    simulation,
    core,
} from '../core.js';
import { randomSphericVector } from '../helpers.js';
import { UI } from '../../ui/App';

let options, controls;

function addMenuControl(
    folder, title, variable,
    // defaultValue = '',
    // refreshCallback = undefined,
    // variableList = undefined,
    onFinishChange = undefined,
) {
    //options.controls[variable] = defaultValue;
    // const onFinish = (val) => {
    //     core.updatePhysics(variable, val);
    // };
    
    const defaultValue = options.advanced[variable];
    const refreshCallback = undefined;
    const variableList = undefined;

    if (onFinishChange == undefined) {
        folder.add(options.advanced, variable).name(title);
    }
    else {
        folder.add(options.advanced, variable, variableList).name(title).listen().onFinishChange(onFinishChange);
    }
    
    if (refreshCallback != undefined) {
        refreshCallbackList.push(refreshCallback);
    }

    const item = {
        title: title,
        value: defaultValue,
        onFinish: onFinishChange,
        selectionList: variableList,
        folder: 'advanced'
    }
    UI.addItem(UI.advanced, item);

    // if (typeof defaultValue != 'function') {
    //     refreshCallbackList.push(() => {
    //         item.value = options.controls[variable];
    //     });
    // }
}

export class GUIAdvanced {
    constructor(guiOptions, guiAdvanced) {
        options = guiOptions;
        controls = guiAdvanced;
        this.setup();
    }

    setup() {
        options.advanced = {
            dampKickFactor: '0.1',
            randomVelocity: '10',
            cleanupThreshold: '8',
            reverseVelocity: () => {
                simulation.graphics.readbackParticleData();
                simulation.graphics.particleList.forEach((p) => {
                    p.velocity.multiplyScalar(-1);
                });
                simulation.drawParticles();
            },
            zeroVelocity: () => {
                simulation.graphics.readbackParticleData();
                simulation.graphics.particleList.forEach((p) => {
                    p.velocity.multiplyScalar(1e-6);
                });
                simulation.drawParticles();
            },
            particleCleanup: () => {
                let thresh = parseFloat(options.advanced.cleanupThreshold);
                if (isNaN(thresh)) {
                    alert('Invalid threshold.');
                    return;
                }
                core.particleAutoCleanup(thresh);
            },
            dampVelocity: () => {
                let factor = parseFloat(options.advanced.dampKickFactor);
                if (isNaN(factor)) {
                    alert('Invalid value.');
                    return;
                }
                simulation.graphics.readbackParticleData();
                simulation.graphics.particleList.forEach((p) => {
                    p.velocity.multiplyScalar(1.0 - factor);
                });
                simulation.drawParticles();
            },
            kickVelocity: () => {
                let factor = parseFloat(options.advanced.dampKickFactor);
                if (isNaN(factor)) {
                    alert('Invalid value.');
                    return;
                }
                simulation.graphics.readbackParticleData();
                simulation.graphics.particleList.forEach((p) => {
                    p.velocity.multiplyScalar(1.0 + factor);
                });
                simulation.drawParticles();
            },
            addRandomVelocity: () => {
                simulation.graphics.readbackParticleData();
                simulation.graphics.particleList.forEach((p) => {
                    let e = parseFloat(options.advanced.randomVelocity);
                    if (isNaN(e)) return;
                    p.velocity.add(randomSphericVector(0, e, simulation.mode2D));
                });
                simulation.drawParticles();
            },
            zeroPosition: () => {
                simulation.graphics.readbackParticleData();
                simulation.graphics.particleList.forEach((p) => {
                    p.position = randomSphericVector(0, 1, simulation.mode2D);
                });
                simulation.drawParticles();
            },
            close: () => {
                controls.close();
            },
        };
    
        addMenuControl(controls, 'Reverse Particles Velocity', 'reverseVelocity');
        addMenuControl(controls, "Zero Particles Velocity [B]", 'zeroVelocity'); // [Numpad 0]
        addMenuControl(controls, 'Zero Particles Position', 'zeroPosition');
    
        /*addMenuControl(controls, "Damp Velocity [T]", 'dampVelocity'); // [Numpad -]
        addMenuControl(controls, "Kick Velocity [Y]", 'kickVelocity'); // [Numpad +]
        controls.add(options.advanced, 'dampKickFactor').name("Damp/Kick Factor ✏️").listen().onFinishChange((val) => {
            let factor = parseFloat(val);
            if (isNaN(factor) || factor > 1.0 || factor < 0.0) {
                alert('Factor must be between 0.0 and 1.0.');
                options.advanced.dampKickFactor = '0.1';
                return;
            }
            options.advanced.dampKickFactor = factor.toString();
        });
    
        addMenuControl(controls, 'Add Random Velocity', 'addRandomVelocity');
        addMenuControl(controls, 'Random Velocity ✏️').listen(, 'randomVelocity');*/
    
        addMenuControl(controls, "Automatic Particles Cleanup [U]", 'particleCleanup'); // [Numpad .]
        addMenuControl(controls, 'Cleanup Threshold ✏️', 'cleanupThreshold');
        
        controls.add(options.advanced, 'close').name('Close 🔺');
    
        options.collapseList.push(controls);
    }
}