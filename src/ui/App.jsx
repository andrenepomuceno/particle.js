import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import InformationView from './views/Information';
import MenuView from './views/Menu';

const App = () => {
    const [isInfoOpen, setInfoOpen] = useState(true);
    const [infoVariables, setInfoVariables] = useState();
    const [infoOnFinish, setInfoOnFinish] = useState();

    UI.info.refresh = setInfoVariables;
    UI.info.onFinish = setInfoOnFinish;

    const onClickInfo = (e) => {
        setInfoOpen(!isInfoOpen);
    };

    const onCloseInfo = (e) => {
        setInfoOpen(false);
    };

    return (
        <div>
            <MenuView onClickInfo={onClickInfo}></MenuView>
            <InformationView
                open={isInfoOpen}
                onClose={onCloseInfo} 
                info={infoVariables}
                onFinish={infoOnFinish}
            />
        </div>
    );
};

export const UI = {
    start: () => {
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
    },
    info: {},
};