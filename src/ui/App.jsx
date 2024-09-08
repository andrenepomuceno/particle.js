import React, { useRef } from 'react';
import ReactDOM from 'react-dom/client';

import InformationView from './views/Information';
import MenuView from './views/Menu';

const App = () => {
    const informationRef = useRef();

    return (
        <div>
            <MenuView informationRef={informationRef}/>
            <InformationView ref={informationRef}/>
        </div>
    );
};

export const uiStart = () => {
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
}