import React from 'react';
import { useState, useEffect } from 'react';
import TextField from '@mui/material/TextField'
import './Input.css';

const TextInput = ({
    name,
    value = '',
    onFinish,
    // readOnly = false,
}) => {
    const [value_, setValue] = useState(value);
    const readOnly = (onFinish == undefined) ? true : false;

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

    const color = (readOnly ? 'secondary' : 'success');
    return (
        <TextField id="filled"
            variant='filled'
            type="text"
            label={name}
            value={value_}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            focused={!readOnly}
            slotProps={{
                input: {
                    readOnly: readOnly,
                },
            }}
            size='small'
        />
    );
};

export default TextInput;