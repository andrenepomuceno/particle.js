import React, { useState, forwardRef, useImperativeHandle } from 'react';

const NumberInput = forwardRef(({ name, value = "0.0", children }, ref) => {
    return (
        <div className="number-input">
            <p>{name}: {value}</p>
        </div>
    );
});

export default NumberInput;