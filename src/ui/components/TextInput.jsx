import React, { useState, forwardRef, useImperativeHandle } from 'react';

const NumberInput = forwardRef(({ name, value = "", children }, ref) => {
    return (
        <div className="text-input">
            <p>{name}: {value}</p>
        </div>
    );
});

export default NumberInput;