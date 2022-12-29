import { Vector3 } from 'three';
import {
    decodeVector3, random, floatArrayToString,
    generateHexagon
} from '../helpers.js';
import {
    simulation,
    core,
} from '../core.js';
import { randomSphericVector } from '../helpers.js';
import { SelectionHelper, SourceType } from '../components/selectionHelper.js';
import { createParticle, randomVector } from '../scenariosHelpers.js';
import { scaleEPN } from '../physics.js';

function log(msg) {
    console.log("menu/generator: " + msg);
}

let gGuiOptions = undefined;
let gMouseHelper = undefined;
let gGuiSelection = undefined;
let gSelection = undefined;

export function guiGeneratorSetup(guiOptions, guiGenerator, collapseList, mouseHelper, guiSelection, selection) {
    gGuiOptions = guiOptions;
    gMouseHelper = mouseHelper;
    gGuiSelection = guiSelection;
    gSelection = selection;

    guiOptions.generator = {
        mass: "1",
        randomMass: false,
        enableZeroMass: false,
        roundMass: true,

        charge: "1",
        randomCharge: false,
        chargeRandomSignal: true,
        enableZeroCharge: false,
        roundCharge: true,

        nuclearCharge: "1",
        randomNuclearCharge: false,
        nuclearChargeRandomSignal: true,
        enableZeroNuclearCharge: false,
        roundNuclearCharge: true,

        velocity: "1,0,0",
        randomVelocity: true,

        radius: "1",
        quantity: "1",
        pattern: "circle",
        preset: "default",
        fixed: false,
        generate: () => {
            particleGenerator(guiOptions.generator);
            guiGenerator.open();
        },
        clear: () => {
            guiGenerator.close();
        },
        default: () => {
            let clean = {
                mass: "1",
                randomMass: false,
                enableZeroMass: false,
                roundMass: true,

                charge: "1",
                randomCharge: false,
                chargeRandomSignal: true,
                enableZeroCharge: false,
                roundCharge: true,

                nuclearCharge: "1",
                randomNuclearCharge: false,
                nuclearChargeRandomSignal: true,
                enableZeroNuclearCharge: false,
                roundNuclearCharge: true,

                velocity: "1,0,0",
                randomVelocity: true,

                radius: "1",
                quantity: "1",
                pattern: "circle",
                preset: "default",
                fixed: false,
            };
            Object.assign(guiOptions.generator, clean);
        },
    };

    guiGenerator.add(guiOptions.generator, "quantity").name("Particles").listen().onFinishChange((val) => {
        guiOptions.generator.quantity = Math.round(parseFloat(val));
    });
    guiGenerator.add(guiOptions.generator, "radius").name("Brush radius").listen().onFinishChange((val) => {
        guiOptions.generator.radius = parseFloat(val);
    });

    function defaultTemplate() {
        guiOptions.generator.mass = "1";
        guiOptions.generator.randomMass = false;
        guiOptions.generator.enableZeroMass = false;
        guiOptions.generator.roundMass = false;

        guiOptions.generator.charge = "1";
        guiOptions.generator.randomCharge = false;
        guiOptions.generator.chargeRandomSignal = false;
        guiOptions.generator.enableZeroCharge = true;
        guiOptions.generator.roundCharge = false;

        guiOptions.generator.nuclearCharge = "1";
        guiOptions.generator.randomNuclearCharge = false;
        guiOptions.generator.nuclearChargeRandomSignal = true;
        guiOptions.generator.enableZeroNuclearCharge = false;
        guiOptions.generator.roundNuclearCharge = true;
    }

    function beamTemplate(v) {
        guiOptions.generator.velocity = v + ",0,0";
        guiOptions.generator.randomVelocity = false;
    }

    const patternList = {
        Circle: "circle",
        Square: "square",
        Hexagon: "hexagon",
        Beam: "beam",
    };
    guiGenerator.add(guiOptions.generator, "pattern", patternList).name("Brush pattern").listen().onFinishChange((val) => {
        switch (val) {
            case "beam":
                let v = 10 * parseFloat(guiOptions.info.velocity);
                if (isNaN(v) || v < 1e2) v = 1e2;
                beamTemplate(v);
                guiOptions.generator.quantity = 16;
                break;

            default:
                break;
        }
    });

    const presetList = {
        'Default': "default",
        'Random Clone': "randomClone",
        'E Beam': "eBeam",
        'Alpha Beam': "alphaBeam",
        'Quark Model': "stdModel0",
        'EPN': "epnModel",
        'EPN Model (Scale)': "epnModelScaled",
        'Quark Model (Scale)': "stdModel0Scaled",
    };
    guiGenerator.add(guiOptions.generator, "preset", presetList).name("Particle preset").listen().onFinishChange((val) => {
        let v = 10 * parseFloat(guiOptions.info.velocity);
        if (isNaN(v) || v < 1e2) v = 1e2;
        switch (val) {
            case "eBeam":
                defaultTemplate();
                beamTemplate(v);
                guiOptions.generator.quantity = "32";
                break;

            case "alphaBeam":
                defaultTemplate();
                beamTemplate(v);
                guiOptions.generator.quantity = "24";
                guiOptions.generator.nuclearChargeRandomSignal = false;
                break;

            case "epnModel":
            case "stdModel0":
            case "randomClone":
            case "stdModel0Scaled":
            case "epnModelScaled":
                defaultTemplate();
                break;

            default:
                guiOptions.generator.default();
                break;
        }
    });

    const guiGenerateMass = guiGenerator.addFolder("[+] Mass");
    guiGenerateMass.add(guiOptions.generator, "mass").name("Mass").listen().onFinishChange((val) => {
        guiOptions.generator.mass = parseFloat(val);
    });
    guiGenerateMass.add(guiOptions.generator, "randomMass").name("Randomize value?").listen();
    guiGenerateMass.add(guiOptions.generator, "enableZeroMass").name("Allow zero?").listen();
    guiGenerateMass.add(guiOptions.generator, "roundMass").name("Round?").listen();
    //guiGenerateMass.open();

    const guiGenerateCharge = guiGenerator.addFolder("[+] Charge");
    guiGenerateCharge.add(guiOptions.generator, "charge").name("Charge").listen().onFinishChange((val) => {
        guiOptions.generator.charge = parseFloat(val);
    });
    guiGenerateCharge.add(guiOptions.generator, "randomCharge").name("Randomize value?").listen();
    guiGenerateCharge.add(guiOptions.generator, "chargeRandomSignal").name("Randomize signal?").listen();
    guiGenerateCharge.add(guiOptions.generator, "enableZeroCharge").name("Allow zero?").listen();
    guiGenerateCharge.add(guiOptions.generator, "roundCharge").name("Round?").listen();
    //guiGenerateCharge.open();

    const guiGenerateNuclearCharge = guiGenerator.addFolder("[+] Nuclear Charge");
    guiGenerateNuclearCharge.add(guiOptions.generator, "nuclearCharge").name("Nuclear Charge").listen().onFinishChange((val) => {
        guiOptions.generator.nuclearCharge = parseFloat(val);
    });
    guiGenerateNuclearCharge.add(guiOptions.generator, "randomNuclearCharge").name("Randomize value?").listen();
    guiGenerateNuclearCharge.add(guiOptions.generator, "nuclearChargeRandomSignal").name("Randomize signal?").listen();
    guiGenerateNuclearCharge.add(guiOptions.generator, "enableZeroNuclearCharge").name("Allow zero?").listen();
    guiGenerateNuclearCharge.add(guiOptions.generator, "roundNuclearCharge").name("Round?").listen();

    const guiGenerateVelocity = guiGenerator.addFolder("[+] Velocity");
    guiGenerateVelocity.add(guiOptions.generator, "velocity").name("Velocity").listen().onFinishChange((val) => {
        const precision = 2;
        let velocity = decodeVector3(val);
        if (velocity != undefined) {
            guiOptions.generator.velocity = floatArrayToString([velocity.x, velocity.y, velocity.z], precision);
            return;
        }
        velocity = parseFloat(val);
        if (isNaN(velocity)) {
            alert("Invalid velocity.");
            guiOptions.generator.velocity = '0';
            return;
        }
        guiOptions.generator.velocity = floatArrayToString([velocity, 0, 0], precision);
    });
    guiGenerateVelocity.add(guiOptions.generator, "randomVelocity").name("Randomize?").listen();

    guiGenerator.add(guiOptions.generator, "fixed").name("Fixed position?").listen();
    guiGenerator.add(guiOptions.generator, "generate").name("Generate [G]");
    guiGenerator.add(guiOptions.generator, "default").name("Default Values");
    guiGenerator.add(guiOptions.generator, "clear").name("Close");

    collapseList.push(guiGenerator);
    collapseList.push(guiGenerateCharge);
    collapseList.push(guiGenerateMass);
    collapseList.push(guiGenerateVelocity);
}

let hexagonMap = new Map();
function particleGenerator(input) {
    log("generateParticles");

    function generateMass() {
        let m = presetList[presetIdx].m;
        m *= mass;
        if (gGuiOptions.generator.randomMass) m *= random(0, 1);
        if (gGuiOptions.generator.roundMass) m = Math.round(m);
        if (!gGuiOptions.generator.enableZeroMass && m == 0) m = mass;
        return m;
    }

    function generateCharge() {
        let s = 1;
        let q = presetList[presetIdx].q;
        q *= charge;
        if (gGuiOptions.generator.chargeRandomSignal) s = random(0, 1, true) ? -1 : 1;
        if (gGuiOptions.generator.randomCharge) q *= random(0, 1);
        if (gGuiOptions.generator.roundCharge) q = Math.round(q);
        if (!gGuiOptions.generator.enableZeroCharge && q == 0) q = charge;
        return s * q;
    }

    function generateNuclearCharge() {
        let s = 1;
        let nq = presetList[presetIdx].nq;
        nq *= nuclearCharge;
        if (gGuiOptions.generator.nuclearChargeRandomSignal) s = random(0, 1, true) ? -1 : 1;
        if (gGuiOptions.generator.randomNuclearCharge) nq *= random(0, 1);
        if (gGuiOptions.generator.roundNuclearCharge) nq = Math.round(nq);
        if (!gGuiOptions.generator.enableZeroNuclearCharge && nq == 0) nq = nuclearCharge;
        return s * nq;
    }

    function generatePosition() {
        switch (input.pattern) {
            case "circle":
                return randomSphericVector(0, radius);

            case "square":
                return randomVector(radius);

            case "hexagon":
                {
                    log(hexagonMap.size);
                    if (hexagonMap.size == 0) {
                        generateHexagon(0, 0, radius, hexagonMap);
                    }

                    let idx = random(0, 256, true) % (hexagonMap.size);
                    let pos = new Vector3();
                    for (let [key, value] of hexagonMap) {
                        if (idx-- == 0) {
                            pos.set(value.x, value.y, 0);
                            hexagonMap.delete(key);
                            break;
                        }
                    }

                    return pos;
                }

            default:
                return new Vector3();
        }
    }

    function generateVelocity() {
        let v = velocity;
        switch (input.pattern) {
            case "beam":
                break;

            default:
                if (gGuiOptions.generator.randomVelocity) v = randomSphericVector(0, v.length(), simulation.mode2D);
                break;
        }

        if (Date.now() - gMouseHelper.lastMove < 1000) {
            let mv = gMouseHelper.avgVelocity();
            let mouseVelocity = new Vector3(mv.x, mv.y, 0);
            mouseVelocity.multiplyScalar(0.005 * simulation.graphics.controls.getDistance());
            //console.log(mouseVelocity);
            v.add(mouseVelocity);
        }

        return v;
    }

    let mass = parseFloat(input.mass);
    let charge = parseFloat(input.charge);
    let nuclearCharge = parseFloat(input.nuclearCharge);
    let radius = Math.abs(parseFloat(input.radius));
    let quantity = Math.round(parseFloat(input.quantity));
    if (isNaN(mass) || isNaN(charge) || isNaN(nuclearCharge) || isNaN(radius) || isNaN(quantity)) {
        alert("Invalid parameters!");
        return;
    }
    let velocity = decodeVector3(input.velocity);
    if (velocity == undefined) {
        velocity = parseFloat(input.velocity);
        if (isNaN(velocity)) {
            alert("Invalid velocity!");
            return;
        }
        velocity = { x: velocity, y: 0, z: 0 };
    }
    velocity = new Vector3(velocity.x, velocity.y, velocity.z);

    let presetList = [];
    let presetIdx = 0;
    let preset = input.preset;
    switch (preset) {
        case "stdModel0":
            presetList = [
                { m: 0.01, q: 0, nq: 1 },
                { m: 0.511, q: -1, nq: 1 },
                { m: 3, q: 1 / 3, nq: 1 },
                { m: 6, q: -2 / 3, nq: 1 },
            ];
            break;

        case "epnModel":
            presetList = [
                { m: 5.48579909065e-4, q: -1, nq: -1 / 137 },
                { m: 1.007276466583, q: 1, nq: 1 },
                { m: 1.00866491588, q: 0, nq: 1 },
            ];
            break;

        case "epnModelScaled":
            presetList = [
                { m: 9.1093837015e-31 * scaleEPN.kg, q: -1.602176634e-19 * scaleEPN.c, nq: -1 / 60, name: "electron" },
                { m: 1.67262192e-27 * scaleEPN.kg, q: 1.602176634e-19 * scaleEPN.c, nq: 1, name: "proton" },
                { m: 1.67492749e-27 * scaleEPN.kg, q: 0, nq: 1, name: "netron" },
            ];
            break;

        case 'quarkModelScaled':
            presetList = [
                { m: 9.1093837015e-31 * scaleEPN.kg, q: -1.602176634e-19 * scaleEPN.c, nq: -1, name: "electron" },
                { m: 5.347988087839e-30 * scaleEPN.kg, q: 2 / 3 * 1.602176634e-19 * scaleEPN.c, nq: 1, name: "quark up" }, // 3 MeV
                { m: 1.069597617568e-29 * scaleEPN.kg, q: -1 / 3 * 1.602176634e-19 * scaleEPN.c, nq: 1, name: "quark down" }, // 6 MeV
            ];
            break;

        case "randomClone":
            {
                presetList = [];
                for (let i = 0; i < quantity; ++i) {
                    let idx = random(0, simulation.particleList.length - 1, true);
                    let p = simulation.particleList[idx];
                    presetList.push(
                        { m: p.mass, q: p.charge, nq: p.nuclearCharge }
                    );
                }
            }
            break;

        case "eBeam":
            presetList = [
                { m: 0.511, q: -1, nq: 1 },
            ];
            break;

        case "alphaBeam":
            presetList = [
                { m: 3, q: 1 / 3, nq: 1 },
                { m: 6, q: -2 / 3, nq: 1 },
            ];
            break;

        default:
            presetList = [
                { m: 1, q: 1, nq: 1 },
            ];
            break;
    }

    let newParticleList = [];
    //if (input.pattern == "hexagon") quantity *= 6;
    for (let i = 0; i < quantity; ++i) {
        presetIdx = random(0, presetList.length - 1, true);
        createParticle(
            newParticleList,
            generateMass(),
            generateCharge(),
            generateNuclearCharge(),
            generatePosition(),
            generateVelocity(),
            gGuiOptions.generator.fixed
        );
    }

    gSelection.clear();
    gSelection.graphics = simulation.graphics;
    gSelection.options = gGuiOptions.selection;
    gSelection.guiSelection = gGuiOptions.selection;
    gSelection.source = SourceType.generated;
    gSelection.list = newParticleList;
    gSelection.guiRefresh();
    gGuiSelection.open();
}