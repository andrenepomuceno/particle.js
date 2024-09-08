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

    function handleInformationClick() {
        setInfoOpen(true);
    }
    
    function handleInfoClose(e) {
        setInfoOpen(false);
    }

    return (
        <div>
            <MenuView onInfoOpen={handleInformationClick}></MenuView>
            <InformationView open={isInfoOpen} onClose={handleInfoClose}/>
        </div>
    );
};

export const uiStart = () => {
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
}