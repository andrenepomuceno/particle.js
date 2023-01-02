import {
    simulation,
    core,
} from '../core.js';
import { randomSphericVector } from '../helpers.js';

let options, controls;

export class GUIAdvanced {
    constructor(guiOptions, guiadvanced) {
        options = guiOptions;
        controls = guiadvanced;
    }

    setup() {
        options.advanced = {
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
                let thresh = parseFloat(options.advanced.cleanupThreshold);
                if (isNaN(thresh)) {
                    alert("Invalid threshold.");
                    return;
                }
                core.particleAutoCleanup(thresh);
            },
            dampVelocity: () => {
                let factor = parseFloat(options.advanced.dampKickFactor);
                simulation.graphics.readbackParticleData();
                simulation.graphics.particleList.forEach((p) => {
                    p.velocity.multiplyScalar(1.0 - factor);
                });
                simulation.drawParticles();
            },
            kickVelocity: () => {
                let factor = parseFloat(options.advanced.dampKickFactor);
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
    
        controls.add(options.advanced, 'zeroVelocity').name("Zero Velocity [B]"); // [Numpad 0]
        controls.add(options.advanced, 'reverseVelocity').name("Reverse Velocity");
    
        controls.add(options.advanced, 'dampVelocity').name("Damp Velocity [T]"); // [Numpad -]
        controls.add(options.advanced, 'kickVelocity').name("Kick Velocity [Y]"); // [Numpad +]
        controls.add(options.advanced, 'dampKickFactor').name("Damp/Kick Factor").listen().onFinishChange((val) => {
            let factor = parseFloat(val);
            if (isNaN(factor) || factor > 1.0 || factor < 0.0) {
                alert("Factor must be between 0.0 and 1.0.");
                options.advanced.dampKickFactor = "0.1";
                return;
            }
            options.advanced.dampKickFactor = factor.toString();
        });
    
        controls.add(options.advanced, 'addRandomVelocity').name("Add Random Velocity");
        controls.add(options.advanced, 'randomVelocity').name("Random Velocity").listen();
    
        controls.add(options.advanced, 'particleCleanup').name("Automatic Particle Cleanup [U]"); // [Numpad .]
        controls.add(options.advanced, 'cleanupThreshold').name("Cleanup Threshold").listen();
        controls.add(options.advanced, 'zeroPosition').name("Zero Position");
        controls.add(options.advanced, 'close').name("Close");
    
        options.collapseList.push(controls);
    }
}