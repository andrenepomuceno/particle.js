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
import SimulationView from '../simulation/view';

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
    },
});

const useDialogView = (viewName, defaultOpen = true) => {
    const localStorageKey = `DialogView:${viewName}`;
    
    const getInitialState = () => {
        const savedState = localStorage.getItem(localStorageKey);
        return savedState ? JSON.parse(savedState) : { open: defaultOpen };
    };

    const obj = UI[viewName] || {};

    const [isOpen, setOpen] = useState(getInitialState().open);
    const [state, setState] = useState(obj.parameters);

    obj.setOpen = setOpen;

    useEffect(() => {
        localStorage.setItem(localStorageKey, JSON.stringify({ open: isOpen }));
    }, [isOpen]);

    return {
        name: viewName,
        isOpen,
        state,
        setState,
        onClickOpen: () => setOpen(!isOpen),
        onClickClose: () => setOpen(false)
    };
};

const App = () => {
    const aboutView = useDialogView('about');
    const informationView = useDialogView('info');
    const parametersView = useDialogView('parameters', false);
    const controlsView = useDialogView('controls', false);
    const advancedView = useDialogView('advanced', false);
    const fieldView = useDialogView('field', false);
    const particleView = useDialogView('particle', false);
    const selectionView = useDialogView('selection', false);
    const generatorView = useDialogView('generator', false);

    return (
        <div>
            <ThemeProvider theme={darkTheme}>
                <CssBaseline />
                <AboutView view={aboutView} />
                <InformationView view={informationView} />
                <ParametersView view={parametersView} />
                <ControlsView view={controlsView} />
                <AdvancedView view={advancedView} />
                <FieldView view={fieldView} />
                <ParticleView view={particleView} />
                <SelectionView view={selectionView} />
                <GeneratorView view={generatorView} />
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
        // console.log(UI);
        UI.root = ReactDOM.createRoot(document.getElementById('root'));
        UI.root.render(<App />);
        // UI.refresh();
    },

    refresh: () => {
        UI.root.render(<App />);
        // UI.updateCallbacks.updateInfo(UI.info.parameters);
    },

    addItem: (view, item) => {
        item.id = crypto.randomUUID();
        item.type = item.type || typeof item.value;

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