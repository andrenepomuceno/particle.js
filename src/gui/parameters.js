import { NuclearPotentialType } from '../physics';
import {
    simulation,
    core,
} from '../core';

let gGuiOptions;

export function guiParametersSetup(guiOptions, guiParameters) {
    gGuiOptions = guiOptions;

    guiOptions.parameters = {
        massConstant: "",
        chargeConstant: "",
        nuclearForceConstant: "",
        nuclearForceRange: "",
        boundaryDamping: "",
        boundaryDistance: "",
        minDistance: "",
        forceConstant: "",
        maxParticles: "",
        radius: "",
        radiusRange: "",
        nuclearPotential: NuclearPotentialType.default,
        boxBoundary: false,
        distance1: false,
        enableBoundary: true,
        close: () => {
            guiParameters.close();
        },
    };

    const guiParametersConsts = guiParameters.addFolder("[+] Constants");
    guiParametersConsts.add(guiOptions.parameters, 'massConstant').name("Gravitational Constant").listen().onFinishChange((val) => {
        core.updatePhysics("massConstant", val);
    });
    guiParametersConsts.add(guiOptions.parameters, 'chargeConstant').name("Electric Constant").listen().onFinishChange((val) => {
        core.updatePhysics("chargeConstant", val);
    });
    guiParametersConsts.add(guiOptions.parameters, 'nuclearForceConstant').name("Nuclear Force Constant").listen().onFinishChange((val) => {
        core.updatePhysics("nuclearForceConstant", val);
    });
    guiParametersConsts.add(guiOptions.parameters, 'nuclearForceRange').name("Nuclear Force Range").listen().onFinishChange((val) => {
        core.updatePhysics("nuclearForceRange", val);
    });
    guiParametersConsts.add(guiOptions.parameters, 'forceConstant').name("Force Multiplier").listen().onFinishChange((val) => {
        core.updatePhysics("forceConstant", val);
    });
    guiParametersConsts.add(guiOptions.parameters, 'minDistance').name("Minimum Distance").listen().onFinishChange((val) => {
        let d = parseFloat(val);
        if (isNaN(d)) {
            alert("Invalid value.");
            return;
        }
        core.updatePhysics("minDistance2", Math.pow(d, 2));
    });
    //guiParametersConsts.open();

    const guiParametersBoundary = guiParameters.addFolder("[+] Boundary");
    guiParametersBoundary.add(guiOptions.parameters, 'boundaryDistance').name("Boundary Distance").listen().onFinishChange((val) => {
        core.updatePhysics("boundaryDistance", val);
    });
    guiParametersBoundary.add(guiOptions.parameters, 'boundaryDamping').name("Boundary Damping Factor").listen().onFinishChange((val) => {
        core.updatePhysics("boundaryDamping", val);
    });
    guiParametersBoundary.add(guiOptions.parameters, 'boxBoundary').name("Use box boundary").listen().onFinishChange((val) => {
        core.updatePhysics("boxBoundary", val);
    });
    guiParametersBoundary.add(guiOptions.parameters, 'enableBoundary').name("Enable Boundary").listen().onFinishChange((val) => {
        core.updatePhysics("enableBoundary", val);
    });
    //guiParametersBoundary.open();

    const guiParametersInteractions = guiParameters.addFolder("[+] Interactions");
    const potentialType = {
        'Sin[a x]': NuclearPotentialType.default,
        'Hooks Law': NuclearPotentialType.hooksLaw,
        'Sin[a (1 - b^x)]': NuclearPotentialType.potential_powAX,
        'Sin[a (1 - b^x)] v2': NuclearPotentialType.potential_powAXv2,
        'Sin[a (1 - b^x)] Exp[-cx]': NuclearPotentialType.potential_powAXv3,
        'Sin[-Exp[-a x]]': NuclearPotentialType.potential_exp,
        'Sin[a x^b]': NuclearPotentialType.potential_powXR,
    }
    guiParametersInteractions.add(guiOptions.parameters, 'nuclearPotential', potentialType).name("Nuclear Potential").listen().onFinishChange((val) => {
        core.updatePhysics("potential", val);
    });
    guiParametersInteractions.add(guiOptions.parameters, 'distance1').name("Use 1/x potential (gravity/charge)").listen().onFinishChange((val) => {
        core.updatePhysics("distance1", val);
    });

    guiParameters.add(guiOptions.parameters, 'close').name("Close");

    guiOptions.collapseList.push(guiParameters);
    guiOptions.collapseList.push(guiParametersBoundary);
    guiOptions.collapseList.push(guiParametersConsts);
    guiOptions.collapseList.push(guiParametersInteractions);
}

export function guiParametersRefresh() {
    let edit = gGuiOptions.parameters;
    edit.massConstant = simulation.physics.massConstant.toExponential(2);
    edit.chargeConstant = simulation.physics.chargeConstant.toExponential(2);
    edit.nuclearForceConstant = simulation.physics.nuclearForceConstant.toExponential(2);
    edit.nuclearForceRange = simulation.physics.nuclearForceRange.toExponential(2);
    edit.boundaryDamping = simulation.physics.boundaryDamping;
    edit.boundaryDistance = simulation.physics.boundaryDistance.toExponential(2);
    edit.minDistance = Math.sqrt(simulation.physics.minDistance2).toExponential(2);
    edit.forceConstant = simulation.physics.forceConstant;
    edit.maxParticles = simulation.graphics.maxParticles;
    edit.boxBoundary = simulation.physics.useBoxBoundary;
    edit.distance1 = simulation.physics.useDistance1;
    edit.nuclearPotential = simulation.physics.nuclearPotential;
    edit.enableBoundary = simulation.physics.enableBoundary;
}