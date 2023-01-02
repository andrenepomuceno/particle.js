import {
    simulation,
    core,
} from '../core.js';
import { randomSphericVector } from '../helpers.js';

let options, controls;

export class GUIAdvanced {
    constructor(guiOptions, guiAdvancedControls) {
        options = guiOptions;
        controls = guiAdvancedControls;
    }

    setup() {
        options.advancedControls = {
            dampKickFactor: "0.1",
            randomVelocity: "10",
            cleanupThreshold: "8",
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
                    p.velocity.set(0, 0, 0);
                });
                simulation.drawParticles();
            },
            particleCleanup: () => {
                let thresh = parseFloat(options.advancedControls.cleanupThreshold);
                if (isNaN(thresh)) {
                    alert("Invalid threshold.");
                    return;
                }
                core.particleAutoCleanup(thresh);
            },
            dampVelocity: () => {
                let factor = parseFloat(options.advancedControls.dampKickFactor);
                simulation.graphics.readbackParticleData();
                simulation.graphics.particleList.forEach((p) => {
                    p.velocity.multiplyScalar(1.0 - factor);
                });
                simulation.drawParticles();
            },
            kickVelocity: () => {
                let factor = parseFloat(options.advancedControls.dampKickFactor);
                simulation.graphics.readbackParticleData();
                simulation.graphics.particleList.forEach((p) => {
                    p.velocity.multiplyScalar(1.0 + factor);
                });
                simulation.drawParticles();
            },
            addRandomVelocity: () => {
                simulation.graphics.readbackParticleData();
                simulation.graphics.particleList.forEach((p) => {
                    let e = parseFloat(options.advancedControls.randomVelocity);
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
    
        controls.add(options.advancedControls, 'zeroVelocity').name("Zero Velocity [B]"); // [Numpad 0]
        controls.add(options.advancedControls, 'reverseVelocity').name("Reverse Velocity");
    
        controls.add(options.advancedControls, 'dampVelocity').name("Damp Velocity [T]"); // [Numpad -]
        controls.add(options.advancedControls, 'kickVelocity').name("Kick Velocity [Y]"); // [Numpad +]
        controls.add(options.advancedControls, 'dampKickFactor').name("Damp/Kick Factor").listen().onFinishChange((val) => {
            let factor = parseFloat(val);
            if (isNaN(factor) || factor > 1.0 || factor < 0.0) {
                alert("Factor must be between 0.0 and 1.0.");
                options.advancedControls.dampKickFactor = "0.1";
                return;
            }
            options.advancedControls.dampKickFactor = factor.toString();
        });
    
        controls.add(options.advancedControls, 'addRandomVelocity').name("Add Random Velocity");
        controls.add(options.advancedControls, 'randomVelocity').name("Random Velocity").listen();
    
        controls.add(options.advancedControls, 'particleCleanup').name("Automatic Particle Cleanup [U]"); // [Numpad .]
        controls.add(options.advancedControls, 'cleanupThreshold').name("Cleanup Threshold").listen();
        controls.add(options.advancedControls, 'zeroPosition').name("Zero Position");
        controls.add(options.advancedControls, 'close').name("Close");
    
        options.collapseList.push(controls);
    }
}