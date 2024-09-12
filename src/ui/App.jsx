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

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
    },
});

const App = () => {
    const [isInfoOpen, setInfoOpen] = useState(true);
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

    const [isParametersOpen, setParametersOpen] = useState(true);
    const [parametersState, setParametersState] = useState(UI.parameters);
    if (UI.parameters.refresh == undefined) {
        UI.parameters.refresh = () => {
            const newState = parametersState;
            console.log(UI.parameters.newParameters);
            newState.parameters = {
                ...newState.parameters,
                ...UI.parameters.newParameters
            }
            setParametersState(newState);
        };
    }
    const onClickParameters = (e) => {
        setParametersOpen(!isParametersOpen);
    };
    const onCloseParameters = (e) => {
        setParametersOpen(false);
    };

    return (
        <div>
            {/* <ThemeProvider> */}
            {/* <CssBaseline /> */}
            <InformationView
                open={isInfoOpen}
                onClose={onCloseInfo}
                info={infoVariables}
                onFinish={infoOnFinish}
            />
            <ParametersView
                open={isParametersOpen}
                onClose={onCloseParameters}
                parameters={parametersState.parameters}
            />
            <MenuView
                onClickInfo={onClickInfo}
                onClickParameters={onClickParameters}
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
};