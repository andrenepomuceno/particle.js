import React, { useRef } from 'react';
import ReactDOM from 'react-dom/client';

import Dialog from '../components/Dialog';
import NumberInput from '../components/NumberInput';
import TextInput from '../components/TextInput';

const InformationView = () => {
    const infoDialogRef = useRef();

    return (
        <div>
            <Dialog ref={infoDialogRef} title="INFORMATION">
                <TextInput name="Scenario Name"></TextInput>
                <TextInput name="Scenario Folder"></TextInput>
                <NumberInput name="Particles"></NumberInput>
                <NumberInput name="Max Particles"></NumberInput>
            </Dialog>
        </div>
    );
};

export default InformationView;