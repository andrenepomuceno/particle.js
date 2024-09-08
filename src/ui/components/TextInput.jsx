import React from 'react';
import { useState, useEffect } from 'react';
import TextField from '@mui/material/TextField'
import './Input.css';

const TextInput = ({
    name,
    value = '',
    onFinish,
    disabled,
}) => {
    const [value_, setValue] = useState(value);

    // TODO onStart

    const onChange = (e) => {
        setValue(e.target.value);
    }

    const onFinish_ = (e) => {
        const value = e.target.value;
        // TODO sanitize value
        if (onFinish) onFinish(value);
    }

    const onKeyDown = (e) => {
        switch (e.key) {
            case 'Enter':
                // case 'Tab':
                onFinish_(e);
                break;
        }
    }

    const onBlur = (e) => {
        onFinish_(e);
    }

    useEffect(() => {
        setValue(value);
    }, [value]);

    return (
        <TextField id="filled"
            variant='filled'
            disabled={disabled}
            type="text"
            label={name}
            value={value_}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
        />
    );
};

export default TextInput;