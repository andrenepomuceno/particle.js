import React, { useState, forwardRef, useImperativeHandle } from 'react';

import './Input.css';

const TextInput = forwardRef(({ name, value = "", children }, ref) => {
    return (
        <div className="text-input">
            <p>{name}</p>
            <input type="text" placeholder={value}/>
        </div>
    );
});

export default TextInput;