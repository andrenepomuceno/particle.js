import React from 'react';
import { useState, useEffect } from 'react';
import TextField from '@mui/material/TextField'

const TextInput = ({
    name,
    value: inputValue = '',
    onFinish,
    // readOnly = false,
}) => {
    const [value, setValue] = useState(inputValue);
    const [isEditing, setEditing] = useState(false);
    const readOnly = (onFinish == undefined) ? true : false;

    // TODO onStart

    const onChange = (e) => {
        setValue(e.target.value);
    }

    const onFinish_ = (e) => {
        setEditing(false);
        const value = e.target.value;
        if (onFinish) onFinish(value);
    }

    const onKeyDown = (e) => {
        setEditing(true);
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

    const onFocus = (e) => {
        // console.log('onFocus', e);
        if (readOnly) return;
        setEditing(true);
    }

    useEffect(() => {
        if (isEditing) return;
        setValue(inputValue);
    }, [inputValue]);

    const color = (readOnly ? 'secondary' : 'success');
    return (
        <TextField
            type="text"
            variant="filled"
            size="small"
            label={name}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            onFocus={onFocus}
            focused={!readOnly}
            slotProps={{
                input: {
                    readOnly: readOnly,
                },
            }}
        />
    );
};

export default TextInput;