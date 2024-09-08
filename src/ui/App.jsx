import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import InformationView from './views/Information';
import MenuView from './views/Menu';

let info, setInfo;

const App = () => {
    const [isInfoOpen, setInfoOpen] = useState(true);
    [info, setInfo] = useState({ name: 'myScenario', folder: 'myFolder' });

    const onClickInfo = (e) => {
        setInfoOpen(!isInfoOpen);
    };
    
    const onCloseInfo = (e) => {
        setInfoOpen(false);
    };

    return (
        <div>
            <MenuView onClickInfo={onClickInfo}></MenuView>
            <InformationView open={isInfoOpen} onClose={onCloseInfo} info={info}/>
        </div>
    );
};

export const uiStart = () => {
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
}

export const uiSetInfo = (info) => {
    setInfo(info);
}