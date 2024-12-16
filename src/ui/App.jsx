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

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
    },
});

class DialogView {
    constructor(open = true, initialState) {
        [this.isOpen, this.setOpen] = useState(open);
        [this.state, this.setState] = useState(initialState);

        // useEffect(() => {
        //     this.setState(initialState);
        // }, [initialState]);

        if (initialState.refresh == undefined) {
            initialState.refresh = (newParameters) => {
                // const newState = this.state;
                // newState.parameters = {
                //     ...newState.parameters,
                //     ...newParameters
                // }
                // this.setState(initialState);
                // console.log(initialState);
            };
        }
    };

    onClickOpen(e) {
        this.setOpen(!this.isOpen);
    };

    onClickClose(e) {
        this.setOpen(false);
    };
}

const App = () => {
    const informationView = new DialogView(true, UI.info);
    const parametersView = new DialogView(false, UI.parameters);
    const controlsView = new DialogView(false, UI.controls);
    const advancedView = new DialogView(false, UI.advanced);
    const fieldView = new DialogView(false, UI.field);
    const particleView = new DialogView(false, UI.particle);
    const selectionView = new DialogView(false, UI.selection);
    const generatorView = new DialogView(false, UI.generator);

    UI.field.setOpen = fieldView.setOpen;
    UI.particle.setOpen = particleView.setOpen;
    UI.selection.setOpen = selectionView.setOpen;
    UI.generator.setOpen = generatorView.setOpen;

    return (
        <div>
            <ThemeProvider theme={darkTheme}>
            <CssBaseline />
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

let root;

export const UI = {
    start: () => {
        root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
    },

    refresh: () => {
        root.render(<App />);
    },

    addItem: (view, item) => {
        item.id = crypto.randomUUID();
        if (!(item.folder in view.parameters)) {
            view.parameters[item.folder] = [];
        }
        view.parameters[item.folder].push(item);
    },

    info: {
        refresh: undefined,
        parameters: {},
        setOpen: null,
    },

    parameters: {
        refresh: undefined,
        parameters: {
            "Folder": [{
                title: "Title",
                value: "Value",
                onFinish: undefined // readOnly
            }],
            "general": [],
        },
        newParameters: {},
        setOpen: null,
    },

    controls: {
        refresh: undefined,
        parameters: {
            "Folder": [{
                title: "Title",
                value: "Value",
                onFinish: undefined // readOnly
            }],
            "general": [],
        },
        newParameters: {},
        setOpen: null,
    },

    advanced: {
        refresh: undefined,
        parameters: {
            "Folder": [{
                title: "Title",
                value: "Value",
                onFinish: undefined // readOnly
            }],
            "general": [],
        },
        newParameters: {},
        setOpen: null,
    },

    field: {
        refresh: undefined,
        parameters: {
            "Folder": [{
                title: "Title",
                value: "Value",
                onFinish: undefined // readOnly
            }],
            "general": [],
        },
        newParameters: {},
        setOpen: null,
    },

    particle: {
        refresh: undefined,
        parameters: {
            "Folder": [{
                title: "Title",
                value: "Value",
                onFinish: undefined // readOnly
            }],
            "general": [],
        },
        newParameters: {},
        setOpen: null,
    },

    selection: {
        refresh: undefined,
        parameters: {
            "Folder": [{
                title: "Title",
                value: "Value",
                onFinish: undefined // readOnly
            }],
            "general": [],
        },
        newParameters: {},
        setOpen: null,
    },

    generator: {
        refresh: undefined,
        parameters: {
            "Folder": [{
                title: "Title",
                value: "Value",
                onFinish: undefined // readOnly
            }],
            "general": [],
        },
        newParameters: {},
        setOpen: null,
    },
};