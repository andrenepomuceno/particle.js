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

import { scaledConstants } from './scenarios_v1/scaledConstants.js';

export let scenariosList = [];
function addFolder(name, list) {
    list.forEach((value, index) => {
        list[index].folderName = name;
    });
    scenariosList = scenariosList.concat(list);
}

/*if (!ENV?.production) {
    addFolder('dev', sandbox);
}*/

//addFolder('fields', fields);
addFolder('scaledConstants', scaledConstants);
addFolder('experiments1', experiments1);
addFolder('experiments0', experiments0);
addFolder('nuclearForce1', nuclearForce1);
addFolder('gpgpu', gpgpu);
addFolder('scenarios2', scenarios2);
addFolder('nuclearForce', nuclearForce);
addFolder('fields', fields);
addFolder('elements', elements);
addFolder('scenarios1', scenarios1);
addFolder('scenarios0', scenarios0);
addFolder('tests', tests);
addFolder('sandbox', sandbox);