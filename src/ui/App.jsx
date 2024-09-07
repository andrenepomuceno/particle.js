import React from 'react';
import ReactDOM from 'react-dom/client';

import InformationView from './views/Information';

const App = () => {
    return (
        <InformationView></InformationView>
    );
};

export const uiStart = () => {
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
}