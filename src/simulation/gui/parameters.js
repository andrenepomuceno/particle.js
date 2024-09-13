import { FrictionModel, NuclearPotentialType } from '../physics';
import {
    simulation,
    core,
} from '../core';
import { UI } from '../../ui/App';

let options;
let controls;
let refreshCallbackList = []

function addPhysicsControl(
    folder, title, variable, defaultValue = '',
    refreshCallback = undefined,
    variableList = undefined,
    onFinishChange = undefined,
) {
    options.parameters[variable] = defaultValue;
    const onFinish = (val) => {
        core.updatePhysics(variable, val);
    };
    if (onFinishChange == undefined) {
        onFinishChange = onFinish;
    }
    folder.add(options.parameters, variable, variableList).name(title).listen().onFinishChange(onFinishChange);
    if (refreshCallback != undefined) {
        refreshCallbackList.push(refreshCallback);
    }

    const item = {
        title: title,
        value: defaultValue,
        onFinish: onFinish,
    }
    UI.addItem(UI.parameters.parameters['general'], item);
    refreshCallbackList.push((value) => {
        item.value = options.parameters[variable];
    });
}

export class GUIParameters {
    constructor(guiOptions, guiParameters) {
        options = guiOptions;
        controls = guiParameters;
        this.setup();
    }


    setup() {
        options.parameters = {
            forceMap: '[]',
            minDistance: '',

            close: () => {
                controls.close();
            }
        };

        const guiParametersConsts = controls.addFolder("[+] Gravitational & Electric ✏️");
        addPhysicsControl(guiParametersConsts, 'Gravitational Constant', 'massConstant', '', () => {
            options.parameters.massConstant = simulation.physics.massConstant.toExponential(4);
        });
        addPhysicsControl(guiParametersConsts, 'Electric Constant', 'chargeConstant', '', () => {
            options.parameters.chargeConstant = simulation.physics.chargeConstant.toExponential(4);
        });
        addPhysicsControl(guiParametersConsts, 'x^-1 potential', 'distance1', false, () => {
            options.parameters.distance1 = simulation.physics.useDistance1;
        });
        guiParametersConsts.open();

        const guiParametersNuclear = controls.addFolder("[+] Nuclear Force ✏️");
        addPhysicsControl(guiParametersNuclear, 'Nuclear Force Constant', 'nuclearForceConstant', '', () => {
            options.parameters.nuclearForceConstant = simulation.physics.nuclearForceConstant.toExponential(4);
        });
        addPhysicsControl(guiParametersNuclear, 'Nuclear Force Range', 'nuclearForceRange', '', () => {
            options.parameters.nuclearForceRange = simulation.physics.nuclearForceRange.toExponential(4);
        });
        const potentialType = {
            'Sin[ax]': NuclearPotentialType.default,
            "2x-1": NuclearPotentialType.hooksLaw,
            'Sin[a(1-b^x)] (v1)': NuclearPotentialType.potential_powAX,
            'Sin[a(1-b^x)] (v2)': NuclearPotentialType.potential_powAXv2,
            'Sin[a(1-b^x)]Exp[-cx]c': NuclearPotentialType.potential_powAXv3,
            '[a,b,c,d,...,x] (param.)': NuclearPotentialType.potential_forceMap1,
            'aExp(-x/b)-cx (param.)': NuclearPotentialType.potential_forceMap2,
            /*'Sin[-Exp[-ax]]': NuclearPotentialType.potential_exp,
            'Sin[ax^b]': NuclearPotentialType.potential_powXR,*/
        };
        addPhysicsControl(guiParametersNuclear, 'Nuclear Potential', 'nuclearPotential', '', () => {
            options.parameters.nuclearPotential = simulation.physics.nuclearPotential;
        }, potentialType);

        const onFinishMap = (val) => {
            let forceMap = String(val).split(',').map((x) => {
                let v = parseFloat(x);
                if (isNaN(v)) {
                    v = 0;
                }
                return v;
            });
            if (forceMap.length < 1 || forceMap.length > 128) {
                alert('Invalid map.');
                return;
            }
            core.updatePhysics('forceMap', forceMap);
        };
        addPhysicsControl(guiParametersNuclear, 'Nuclear Parameters', 'forceMap', '', undefined, undefined, onFinishMap);
        addPhysicsControl(guiParametersNuclear, 'Enable Color Charge', 'enableColorCharge', false, () => {
            options.parameters.enableColorCharge = simulation.physics.enableColorCharge;
        });
        addPhysicsControl(guiParametersNuclear, 'Color Force Constant', 'colorChargeConstant', '', () => {
            options.parameters.colorChargeConstant = simulation.physics.colorChargeConstant.toExponential(4);
        });
        guiParametersNuclear.open();

        const guiParametersModel = controls.addFolder("[+] Other ✏️");
        addPhysicsControl(guiParametersModel, 'Enable Friction', 'enableFriction', false, () => {
            options.parameters.enableFriction = simulation.physics.enableFriction;
        });
        addPhysicsControl(guiParametersModel, 'Friction Constant', 'frictionConstant', '', () => {
            options.parameters.frictionConstant = simulation.physics.frictionConstant.toExponential(4);
        });
        const frictionModel = {
            '-cv': FrictionModel.default,
            '-cv^2': FrictionModel.square,
        }
        addPhysicsControl(guiParametersModel, 'Friction Model', 'frictionModel', '', () => {
            options.parameters.frictionModel = simulation.physics.frictionModel;
        }, frictionModel);
        addPhysicsControl(guiParametersModel, 'Time Step', 'timeStep', '', () => {
            options.parameters.timeStep = simulation.physics.timeStep.toFixed(4);
        });
        addPhysicsControl(guiParametersModel, 'Max Velocity (C)', 'maxVel', '', () => {
            options.parameters.maxVel = simulation.physics.maxVel.toExponential(4);
        });
        const onFinishMinDistance = (val) => {
            let d = parseFloat(val);
            if (isNaN(d)) {
                alert('Invalid value.');
                return;
            }
            core.updatePhysics('minDistance2', Math.pow(d, 2));
        };
        guiParametersModel.add(options.parameters, 'minDistance').name('').listen().onFinishChange(onFinishMinDistance);
        addPhysicsControl(guiParametersModel, 'Collision Distance', 'minDistance', '', undefined, undefined, onFinishMap);
        addPhysicsControl(guiParametersModel, 'Enable Random Noise', 'enableRandomNoise', false, () => {
            options.parameters.enableRandomNoise = simulation.physics.enableRandomNoise;
        });
        addPhysicsControl(guiParametersModel, 'Random Noise Constant', 'randomNoiseConstant', '', () => {
            options.parameters.randomNoiseConstant = simulation.physics.randomNoiseConstant.toExponential(4);
        });
        guiParametersModel.open();

        const guiParametersBoundary = controls.addFolder("[+] Simulation Boundaries ✏️");
        addPhysicsControl(guiParametersBoundary, 'Boundary Distance', 'boundaryDistance', '', () => {
            options.parameters.boundaryDistance = simulation.physics.boundaryDistance.toExponential(4);
        });
        addPhysicsControl(guiParametersBoundary, 'Boundary Damping Factor', 'boundaryDamping', '', () => {
            options.parameters.boundaryDamping = simulation.physics.boundaryDamping.toFixed(4);
        });
        addPhysicsControl(guiParametersBoundary, 'Use box boundary', 'boxBoundary', false, () => {
            options.parameters.boxBoundary = simulation.physics.useBoxBoundary;
        });
        addPhysicsControl(guiParametersBoundary, 'Enable Boundary', 'enableBoundary', false, () => {
            options.parameters.enableBoundary = simulation.physics.enableBoundary;
        });
        //guiParametersBoundary.open();

        const guiParametersExp = controls.addFolder("[+] Experimental ✏️");
        addPhysicsControl(guiParametersExp, 'Enable Fine Structure', 'enableFineStructure', false, () => {
            options.parameters.enableFineStructure = simulation.physics.enableFineStructure;
        });
        addPhysicsControl(guiParametersExp, 'Fine Structure Constant', 'fineStructureConstant', '', () => {
            options.parameters.fineStructureConstant = Number(simulation.physics.fineStructureConstant).toExponential(4);
        });
        addPhysicsControl(guiParametersExp, 'Enable Lorentz Factor', 'enableLorentzFactor', false, () => {
            options.parameters.enableLorentzFactor = simulation.physics.enableLorentzFactor;
        });
        addPhysicsControl(guiParametersExp, 'Post-Newtonian Gravity', 'enablePostGravity', false, () => {
            options.parameters.enablePostGravity = simulation.physics.enablePostGravity;
        });
        //guiParametersExp.open();

        controls.add(options.parameters, 'close').name('Close 🔺');

        options.collapseList.push(controls);
        options.collapseList.push(guiParametersBoundary);
        options.collapseList.push(guiParametersConsts);
        options.collapseList.push(guiParametersExp);
        options.collapseList.push(guiParametersModel);
        options.collapseList.push(guiParametersNuclear);
    }

    refresh() {
        let edit = options.parameters;

        edit.minDistance = Math.sqrt(simulation.physics.minDistance2).toExponential(4);
        edit.forceMap = simulation.physics.forceMap;

        refreshCallbackList.forEach((callback) => {
            if (callback != undefined) {
                callback();
            }
        })

        UI.parameters.refresh();
    }
}