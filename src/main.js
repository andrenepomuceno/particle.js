import React, { useRef } from 'react';
import ReactDOM from 'react-dom/client';
import WebGL from 'three/examples/jsm/capabilities/WebGL.js';
import { viewSetup } from './view';

import DraggableDialog from './ui/DraggableDialog';

const start = () => {
    if (ENV?.production === true) {
        function analytics() {
            window.dataLayer = window.dataLayer || [];
            function gtag() { dataLayer.push(arguments); }
            gtag('js', new Date());
            gtag('config', 'G-STP92EN2LF');
        }
        new Promise(analytics);
    }
    
    if (ENV?.version != false) {
        let dom = document.getElementById('info');
        dom.innerHTML = dom.innerHTML.replace('loading...', ENV?.version);
    }
    
    if (WebGL.isWebGL2Available()) {
        viewSetup();
    } else {
        const warning = WebGL.getWebGLErrorMessage();
        document.getElementById('renderer-container').appendChild(warning);
    }
}

const App = () => {
    const dialogRef = useRef();

    return (
        <div>
            {(
                <DraggableDialog ref={dialogRef} title="INFORMATION">
                    <p>Scenario Name</p>
                    <p>Scenario Folder</p>
                    <p>Particles</p>
                    <p>Max Particles</p>
                    <p>Elapsed Time</p>
                    <p>Camera</p>
                </DraggableDialog>
            )}
            <div id="info">
                <a href="https://github.com/andrenepomuceno/particle.js" target="_blank" rel="noopener">particle.js </a>
                loading...
            </div>
            <div id='renderer-container'></div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

setTimeout(() => {
    requestAnimationFrame(start);
});