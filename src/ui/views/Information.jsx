import React, { useRef } from 'react';
import ReactDOM from 'react-dom/client';

import Dialog from '../components/Dialog';
import NumberInput from '../components/NumberInput';
import TextInput from '../components/TextInput';

const InformationView = ({scenarioName = "scenario", children}) => {
    const infoDialogRef = useRef();
    return (
        <div>
            <Dialog
                title='Information'
                // canClose='false'
                ref={infoDialogRef}
            >
                <TextInput name="Scenario Name" value={scenarioName}></TextInput>
                <TextInput name="Scenario Folder"></TextInput>
                <NumberInput name="Particles"></NumberInput>
                <NumberInput name="Max Particles"></NumberInput>
                <NumberInput name="Elapsed Time (steps)"></NumberInput>
                <NumberInput name="Camera Coordinates"></NumberInput>
                {children}
            </Dialog>
        </div>
    );
};

export default InformationView;