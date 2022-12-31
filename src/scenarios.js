import { scenarios0 } from './scenarios_v0/scenarios0.js';
import { scenarios1 } from './scenarios_v0/scenarios1.js';
import { fields } from './scenarios_v0/fieldTest.js';
import { elements } from './scenarios_v0/elements.js';
import { nuclearForce } from './scenarios_v0/nuclearForce.js';
import { scenarios2 } from './scenarios_v0/scenarios2.js';
import { gpgpu } from './scenarios_v0/gpgpuTest';
import { nuclearForce1 } from './scenarios_v0/nuclearForce1.js';
import { experiments0 } from './scenarios_v0/experiments0.js';
import { tests } from './scenarios_v0/tests.js';
import { sandbox } from './scenarios_v0/sandbox.js';
import { experiments1 } from './scenarios_v0/experiments1.js';
import { epnModel } from './scenarios_v1/epnModel.js';
import { quarkModel } from './scenarios_v1/quarkModel.js';

export let scenariosList = [];
function addFolder(name, list) {
    list.forEach((value, index) => {
        list[index].folderName = name;
    });
    scenariosList = scenariosList.concat(list);
}

addFolder('Quark Model', quarkModel);
addFolder('EPN Model', epnModel);
addFolder('Experiments 1', experiments1);
addFolder('Experiments 0', experiments0);
addFolder('Nuclear Force 1', nuclearForce1);
addFolder('GPGPU', gpgpu);
addFolder('Scenarios 2', scenarios2);
addFolder('Nuclear Force', nuclearForce);
addFolder('Fields', fields);
addFolder('Elements', elements);
addFolder('Scenarios 1', scenarios1);
addFolder('Scenarios 0', scenarios0);
addFolder('Tests', tests);
addFolder('Sandbox Mode', sandbox);