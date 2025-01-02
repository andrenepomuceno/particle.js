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
    const [lastValue, setLastValue] = useState();
    const [isEditing, setEditing] = useState(false);
    const readOnly = (onFinish == undefined) ? true : false;

    // TODO onStart

    const onChange = (e) => {
        setValue(e.target.value);
    }

    const onFinish_ = (e) => {
        if (!isEditing) return;
        setEditing(false);

        if (onFinish) {
            const value = e.target.value;
            if (value == lastValue) return;
            
            onFinish(value);
        }
    }

    const startEditing = () => {
        if (readOnly) return;
        if (!isEditing) {
            setEditing(true);
            setLastValue(value);
        }
    }

    const onKeyDown = (e) => {
        startEditing();
        switch (e.key) {
            case 'Enter':
                onFinish_(e);
                break;
        }
    }

    const onBlur = (e) => {
        onFinish_(e);
    }

    const onFocus = (e) => {
        startEditing();
    }

    useEffect(() => {
        if (isEditing) return;
        setValue(inputValue);
    }, [inputValue]);

    return (
        <TextField
            fullWidth
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