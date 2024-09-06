import { FrictionModel, NuclearPotentialType } from '../physics';
import {
    simulation,
    core,
} from '../core';

let options;
let controls;
let refreshCallbackList = []

function addPhysicsControl(folder, title, variable, defaultValue = '', refreshCallback = undefined, variableList = undefined) {
    console.log('add control ' + variable);
    options.parameters[variable] = defaultValue;
    folder.add(options.parameters, variable, variableList).name(title).listen().onFinishChange((val) => {
        core.updatePhysics(variable, val);
    });
    if (refreshCallback != undefined) {
        refreshCallbackList.push(refreshCallback);
    }
}

export class GUIParameters {
    constructor(guiOptions, guiParameters) { 
        options = guiOptions;
        controls = guiParameters;
        this.setup();
     }


    setup() {
        options.parameters = {
            massConstant: '',
            chargeConstant: '',
            nuclearForceConstant: '',
            nuclearForceRange: '',
            boundaryDamping: '',
            boundaryDistance: '',
            minDistance: '',
            maxParticles: '',
            radius: '',
            radiusRange: '',
            nuclearPotential: '',
            forceMap: '[]',
            boxBoundary: false,
            distance1: false,
            enableBoundary: true,
            enableFriction: false,
            frictionConstant: '',
            frictionModel: '',
            maxVel: '',
            close: () => {
                controls.close();
            }
        };

        const guiParametersConsts = controls.addFolder("[+] Constants ✏️");
        addPhysicsControl(guiParametersConsts, 'Gravitational Constant', 'massConstant', '', () => {
            options.parameters.massConstant = simulation.physics.massConstant.toExponential(4);
        });
        addPhysicsControl(guiParametersConsts, 'Electric Constant', 'chargeConstant', '', () => {
            options.parameters.chargeConstant= simulation.physics.chargeConstant.toExponential(4);
        });

        guiParametersConsts.add(options.parameters, 'distance1').name('Use x^-1 potential (gravity & charge)').listen().onFinishChange((val) => {
            core.updatePhysics('distance1', val);
        });
        addPhysicsControl(guiParametersConsts, 'Nuclear Force Constant', 'nuclearForceConstant', '', () => {
            options.parameters.nuclearForceConstant= simulation.physics.nuclearForceConstant.toExponential(4);
        });
        addPhysicsControl(guiParametersConsts, 'Nuclear Force Range', 'nuclearForceRange', '', () => {
            options.parameters.nuclearForceRange= simulation.physics.nuclearForceRange.toExponential(4);
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
        addPhysicsControl(guiParametersConsts, 'Nuclear Potential', 'nuclearPotential', '', undefined, potentialType);

        guiParametersConsts.add(options.parameters, 'forceMap').name('Nuclear Parameters').listen().onFinishChange((val) => {
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
        });

        guiParametersConsts.add(options.parameters, 'minDistance').name('Minimum Distance').listen().onFinishChange((val) => {
            let d = parseFloat(val);
            if (isNaN(d)) {
                alert('Invalid value.');
                return;
            }
            core.updatePhysics('minDistance2', Math.pow(d, 2));
        });
        
        addPhysicsControl(guiParametersConsts, 'Enable Friction', 'enableFriction', false);
        addPhysicsControl(guiParametersConsts, 'Friction Constant', 'frictionConstant');
        const frictionModel = {
            '-cv': FrictionModel.default,
            '-cv^2': FrictionModel.square,
        }
        addPhysicsControl(guiParametersConsts, 'Friction Model', 'frictionModel', '', undefined, frictionModel);
        addPhysicsControl(guiParametersConsts, 'Time Step', 'timeStep');
        addPhysicsControl(guiParametersConsts, 'Max Velocity (C)', 'maxVel');
        guiParametersConsts.open();

        const guiParametersBoundary = controls.addFolder("[+] Boundary ✏️");
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
        addPhysicsControl(guiParametersExp, 'Enable Color Charge', 'enableColorCharge', false, () => {
            options.parameters.enableColorCharge = simulation.physics.enableColorCharge;
        });
        addPhysicsControl(guiParametersExp, 'Color Force Constant', 'colorChargeConstant', '', () => {
            options.parameters.colorChargeConstant = simulation.physics.colorChargeConstant.toExponential(4);
        });
        addPhysicsControl(guiParametersExp, 'Enable Lorentz Factor', 'enableLorentzFactor', false, () => {
            options.parameters.enableLorentzFactor = simulation.physics.enableLorentzFactor;
        });
        addPhysicsControl(guiParametersExp, 'Post-Newtonian Gravity', 'enablePostGravity', false, () => {
            options.parameters.enablePostGravity = simulation.physics.enablePostGravity;
        });
        addPhysicsControl(guiParametersExp, 'Enable Random Noise', 'enableRandomNoise', false, () => {
            options.parameters.enableRandomNoise = simulation.physics.enableRandomNoise;
        });
        addPhysicsControl(guiParametersExp, 'Random Noise Constant', 'randomNoiseConstant', '', () => {
            options.parameters.randomNoiseConstant = simulation.physics.randomNoiseConstant.toExponential(4);
        });
        //guiParametersExp.open();

        controls.add(options.parameters, 'close').name('Close 🔺');

        options.collapseList.push(controls);
        options.collapseList.push(guiParametersBoundary);
        options.collapseList.push(guiParametersConsts);
        options.collapseList.push(guiParametersExp);
    }

    refresh() {
        let edit = options.parameters;
        edit.massConstant = simulation.physics.massConstant.toExponential(2);
        edit.chargeConstant = simulation.physics.chargeConstant.toExponential(2);
        edit.nuclearForceConstant = simulation.physics.nuclearForceConstant.toExponential(2);
        edit.nuclearForceRange = simulation.physics.nuclearForceRange.toExponential(2);
        edit.boundaryDamping = simulation.physics.boundaryDamping;
        edit.boundaryDistance = simulation.physics.boundaryDistance.toExponential(2);
        edit.minDistance = Math.sqrt(simulation.physics.minDistance2).toExponential(2);
        edit.timeStep = simulation.physics.timeStep;
        edit.maxParticles = simulation.graphics.maxParticles;
        edit.boxBoundary = simulation.physics.useBoxBoundary;
        edit.distance1 = simulation.physics.useDistance1;
        edit.nuclearPotential = simulation.physics.nuclearPotential;
        edit.forceMap = simulation.physics.forceMap;
        edit.enableBoundary = simulation.physics.enableBoundary;
        edit.enableFriction = simulation.physics.enableFriction;
        edit.frictionConstant = simulation.physics.frictionConstant.toExponential(2);
        edit.frictionModel = simulation.physics.frictionModel;
        edit.maxVel = simulation.physics.maxVel.toExponential(2);

        refreshCallbackList.forEach((callback) => {
            if (callback != undefined) {
                callback();
            }
        })
    }
}