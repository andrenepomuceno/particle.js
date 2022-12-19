import { scenarios0 } from './scenarios/scenarios0.js';
import { scenarios1 } from './scenarios/scenarios1.js';
import { fields } from './scenarios/fieldTest.js';
import { elements } from './scenarios/elements.js';
import { nuclearForce } from './scenarios/nuclearForce.js';
import { scenarios2 } from './scenarios/scenarios2.js';
import { gpgpu } from './scenarios/gpgpuTest';
import { nuclearForce1 } from './scenarios/nuclearForce1.js';
import { experiments0 } from './scenarios/experiments0.js';
import { tests } from './scenarios/tests.js';
import { sandbox } from './scenarios/sandbox.js';
import { experiments1 } from './scenarios/experiments1.js';

export let scenariosList = [];
function addFolder(name, list) {
    list.forEach((value, index) => {
        list[index].folderName = name;
    });
    scenariosList = scenariosList.concat(list);
}

/*if (!ENV?.production) {
    addFolder("dev", sandbox);
}*/

addFolder("experiments1", experiments1);
addFolder("experiments0", experiments0);
addFolder("nuclearForce1", nuclearForce1);
addFolder("gpgpu", gpgpu);
addFolder("scenarios2", scenarios2);
addFolder("nuclearForce", nuclearForce);
addFolder("fields", fields);
addFolder("elements", elements);
addFolder("scenarios1", scenarios1);
addFolder("scenarios0", scenarios0);
addFolder("tests", tests);
addFolder("sandbox", sandbox);