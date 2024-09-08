import React from 'react';
import { useState } from 'react';
import TextField from '@mui/material/TextField'
import './Input.css';

const TextInput = ({
    name,
    value = '',
    onFinish,
    readOnly=false,
}) => {
    const [currentValue, setValue] = useState(value);

    // TODO sanitize value

    const onChange = (e) => {
        setValue(e.target.value);
    }

    const onKeyDown = (e) => {
        switch (e.key) {
            case 'Enter':
            // case 'Tab':
                if (onFinish) onFinish(e);
                break;
        }
    }

    const onBlur = (e) => {
        if (onFinish) onFinish(e);
    }

    return (
        <TextField id="outlined-basic"
            type="text"
            label={name}
            value={currentValue}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
        />
    );
};

export default TextInput;