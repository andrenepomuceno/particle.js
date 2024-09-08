import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import ReactDOM from 'react-dom/client';

import Dialog from '../components/Dialog';
import NumberInput from '../components/NumberInput';
import TextInput from '../components/TextInput';

const InformationView = forwardRef(({ scenarioName = "scenario", children }, ref) => {
    const dialogRef = useRef();

    useImperativeHandle(ref, () => ({
        open: () => dialogRef.current.open(),
    }));

    return (
        <div>
            <Dialog
                title='Information'
                // canClose='false'
                ref={dialogRef}
                size={{ width: 640, height: 480 }}
                position={{ x: 10, y: 210 }}
            >
                <div className='info-grid'>
                    <TextInput name="Scenario Name" value={scenarioName}></TextInput>
                    <TextInput name="Scenario Folder"></TextInput>
                    <NumberInput name="Particles"></NumberInput>
                    <NumberInput name="Max Particles"></NumberInput>
                    <NumberInput name="Elapsed Time (steps)"></NumberInput>
                    <NumberInput name="Camera Coordinates"></NumberInput>
                </div>
                {children}
            </Dialog>
        </div>
    );
});

export default InformationView;