import {
    simulation,
    core,
} from '../core.js';
import { randomSphericVector } from '../helpers.js';

export function guiAdvancedControlsSetup(guiOptions, guiAdvancedControls, collapseList) {
    guiOptions.advancedControls = {
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
            let thresh = parseFloat(guiOptions.advancedControls.cleanupThreshold);
            if (isNaN(thresh)) {
                alert("Invalid threshold.");
                return;
            }
            core.particleAutoCleanup(thresh);
        },
        dampVelocity: () => {
            let factor = parseFloat(guiOptions.advancedControls.dampKickFactor);
            simulation.graphics.readbackParticleData();
            simulation.graphics.particleList.forEach((p) => {
                p.velocity.multiplyScalar(1.0 - factor);
            });
            simulation.drawParticles();
        },
        kickVelocity: () => {
            let factor = parseFloat(guiOptions.advancedControls.dampKickFactor);
            simulation.graphics.readbackParticleData();
            simulation.graphics.particleList.forEach((p) => {
                p.velocity.multiplyScalar(1.0 + factor);
            });
            simulation.drawParticles();
        },
        addRandomVelocity: () => {
            simulation.graphics.readbackParticleData();
            simulation.graphics.particleList.forEach((p) => {
                let e = parseFloat(guiOptions.advancedControls.randomVelocity);
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
            guiAdvancedControls.close();
        },
    };

    guiAdvancedControls.add(guiOptions.advancedControls, 'zeroVelocity').name("Zero Velocity [B]"); // [Numpad 0]
    guiAdvancedControls.add(guiOptions.advancedControls, 'reverseVelocity').name("Reverse Velocity");

    guiAdvancedControls.add(guiOptions.advancedControls, 'dampVelocity').name("Damp Velocity [T]"); // [Numpad -]
    guiAdvancedControls.add(guiOptions.advancedControls, 'kickVelocity').name("Kick Velocity [Y]"); // [Numpad +]
    guiAdvancedControls.add(guiOptions.advancedControls, 'dampKickFactor').name("Damp/Kick Factor").listen().onFinishChange((val) => {
        let factor = parseFloat(val);
        if (isNaN(factor) || factor > 1.0 || factor < 0.0) {
            alert("Factor must be between 0.0 and 1.0.");
            guiOptions.advancedControls.dampKickFactor = "0.1";
            return;
        }
        guiOptions.advancedControls.dampKickFactor = factor.toString();
    });

    guiAdvancedControls.add(guiOptions.advancedControls, 'addRandomVelocity').name("Add Random Velocity");
    guiAdvancedControls.add(guiOptions.advancedControls, 'randomVelocity').name("Random Velocity").listen();

    guiAdvancedControls.add(guiOptions.advancedControls, 'particleCleanup').name("Automatic Particle Cleanup [U]"); // [Numpad .]
    guiAdvancedControls.add(guiOptions.advancedControls, 'cleanupThreshold').name("Cleanup Threshold").listen();
    guiAdvancedControls.add(guiOptions.advancedControls, 'zeroPosition').name("Zero Position");
    guiAdvancedControls.add(guiOptions.advancedControls, 'close').name("Close");

    collapseList.push(guiAdvancedControls);
}