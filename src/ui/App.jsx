import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import InformationView from './views/Information';
import MenuView from './views/Menu';
import ParametersView from './views/Parameters';
import ControlsView from './views/Controls';
import AdvancedView from './views/Advanced';
import FieldView from './views/Field';
import ParticleView from './views/Particle';
import SelectionView from './views/Selection';
import GeneratorView from './views/Generator';
import AboutView from './views/About';

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
    },
});

class DialogView {
    constructor(viewName, open = true) {
        const localStorageKey = "DialogView:" + viewName;

        function getInitialState() {
            const savedState = localStorage.getItem(localStorageKey);
            if (savedState) {
                return JSON.parse(savedState);
            }

            return { open };
        };

        [this.isOpen, this.setOpen] = useState( getInitialState().open );

        this.name = viewName;
        
        const initialState = UI[viewName] || {};
        this.state = initialState;

        if (!initialState.setOpen) {
            initialState.setOpen = this.setOpen;
        }

        useEffect(() => {
            localStorage.setItem(
                localStorageKey,
                JSON.stringify({ open: this.isOpen })
            );
        }, [this.isOpen]);
    };

    onClickOpen(e) {
        this.setOpen(!this.isOpen);
    };

    onClickClose(e) {
        this.setOpen(false);
    };
}

const App = () => {
    const aboutView = new DialogView('about');
    const informationView = new DialogView('info');
    const parametersView = new DialogView('parameters', false)
    const controlsView = new DialogView('controls', false)
    const advancedView = new DialogView('advanced', false)
    const fieldView = new DialogView('field', false)
    const particleView = new DialogView('particle', false)
    const selectionView = new DialogView('selection', false)
    const generatorView = new DialogView('generator', false)

    return (
        <div>
            <ThemeProvider theme={darkTheme}>
            <CssBaseline />
                <AboutView
                    open={aboutView.isOpen}
                    onClose={(e) => { aboutView.onClickClose(e); }}
                />
                <InformationView
                    open={informationView.isOpen}
                    onClose={(e) => { informationView.onClickClose(e); }}
                    parameters={informationView.state.parameters}
                />
                <ParametersView
                    open={parametersView.isOpen}
                    onClose={(e) => { parametersView.onClickClose(e); }}
                    parameters={parametersView.state.parameters}
                />
                <ControlsView
                    open={controlsView.isOpen}
                    onClose={(e) => { controlsView.onClickClose(e); }}
                    parameters={controlsView.state.parameters}
                />
                <AdvancedView
                    open={advancedView.isOpen}
                    onClose={(e) => { advancedView.onClickClose(e); }}
                    parameters={advancedView.state.parameters}
                />
                <FieldView
                    open={fieldView.isOpen}
                    onClose={(e) => { fieldView.onClickClose(e); }}
                    parameters={fieldView.state.parameters}
                />
                <ParticleView
                    open={particleView.isOpen}
                    onClose={(e) => { particleView.onClickClose(e); }}
                    parameters={particleView.state.parameters}
                />
                <SelectionView
                    open={selectionView.isOpen}
                    onClose={(e) => { selectionView.onClickClose(e); }}
                    parameters={selectionView.state.parameters}
                />
                <GeneratorView
                    open={generatorView.isOpen}
                    onClose={(e) => { generatorView.onClickClose(e); }}
                    parameters={generatorView.state.parameters}
                />
                <MenuView
                    onClickAbout={(e) => { aboutView.onClickOpen(e); }}
                    onClickInfo={(e) => { informationView.onClickOpen(e); }}
                    onClickParameters={(e) => { parametersView.onClickOpen(e); }}
                    onClickControls={(e) => { controlsView.onClickOpen(e); }}
                    onClickAdvanced={(e) => { advancedView.onClickOpen(e); }}
                    onClickField={(e) => { fieldView.onClickOpen(e); }}
                    onClickParticle={(e) => { particleView.onClickOpen(e); }}
                    onClickSelection={(e) => { selectionView.onClickOpen(e); }}
                    onClickGenerator={(e) => { generatorView.onClickOpen(e); }}
                ></MenuView>
            </ThemeProvider>
        </div>
    );
};

export const UI = {
    root: null,

    start: () => {
        UI.root = ReactDOM.createRoot(document.getElementById('root'));

        function refresh() {
            UI.root.render(<App />);
            setTimeout(refresh, 500);
        }
        refresh();
    },

    addItem: (view, item) => {
        item.id = crypto.randomUUID();
        const parameters = view.parameters;
        if (!parameters[item.folder]) parameters[item.folder] = [];
        
        parameters[item.folder].push(item);
    },

    info: {
        parameters: {},
        setOpen: null,
    },

    parameters: {
        parameters: {},
        setOpen: null,
    },

    controls: {
        parameters: {},
        setOpen: null,
    },

    advanced: {
        parameters: {},
        setOpen: null,
    },

    field: {
        parameters: {},
        setOpen: null,
    },

    particle: {
        parameters: {},
        setOpen: null,
    },

    selection: {
        parameters: {},
        setOpen: null,
    },

    generator: {
        parameters: {},
        setOpen: null,
    },
};