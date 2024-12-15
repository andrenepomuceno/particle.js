import React, { useState } from 'react';
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

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
    },
});

class DialogView {
    constructor(open = true, initialState) {
        [this.isOpen, this.setOpen] = useState(open);
        [this.state, this.setState] = useState(initialState);

        if (initialState.refresh == undefined) {
            initialState.refresh = () => {
                const newState = this.state;
                newState.parameters = {
                    ...newState.parameters,
                    ...this.state.newParameters
                }
                //this.setState(newState);
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
    const [isInfoOpen, setInfoOpen] = useState(true);  // TODO use DialogView
    const [infoVariables, setInfoVariables] = useState();
    const [infoOnFinish, setInfoOnFinish] = useState();
    if (UI.info.refresh == undefined) {
        UI.info.onFinish = setInfoOnFinish;
        UI.info.refresh = (newVariables) => {
            setInfoVariables({
                ...infoVariables,
                ...newVariables
            });
        };
    }
    const onClickInfo = (e) => {
        setInfoOpen(!isInfoOpen);
    };
    const onCloseInfo = (e) => {
        setInfoOpen(false);
    };

    const informationView = new DialogView(true, UI.info); // TODO

    const parametersView = new DialogView(false, UI.parameters);
    const controlsView = new DialogView(false, UI.controls);
    const advancedView = new DialogView(false, UI.advanced);
    const fieldView = new DialogView(false, UI.field);

    return (
        <div>
            {/* <ThemeProvider> */}
            {/* <CssBaseline /> */}
            <InformationView
                open={isInfoOpen}
                onClose={onCloseInfo}
                info={infoVariables}
                onFinish={infoOnFinish} // TODO
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
            <MenuView
                onClickInfo={onClickInfo}
                onClickParameters={(e) => { parametersView.onClickOpen(e); }}
                onClickControls={(e) => { controlsView.onClickOpen(e); }}
                onClickAdvanced={(e) => { advancedView.onClickOpen(e); }}
                onClickField={(e) => { fieldView.onClickOpen(e); }}
            ></MenuView>
            {/* </ThemeProvider> */}
        </div>
    );
};

export const UI = {
    start: () => {
        const root = ReactDOM.createRoot(document.getElementById('root'));
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
        onFinish: {},
        // key: value
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
    },
};