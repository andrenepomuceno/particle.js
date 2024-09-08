import React, { useState, forwardRef, useImperativeHandle } from 'react';
import TextField from '@mui/material/TextField'

const NumberInput = forwardRef(({ name, value = 10.0, children }, ref) => {
    return (
        <div className="number-input">
            <p>{name}</p>
            <TextField type='number' value={value}/>
        </div>
    );
});

export default NumberInput;