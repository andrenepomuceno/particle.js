import React from 'react';
import { useState, useEffect } from 'react';
import TextInput from './TextInput';
import BooleanInput from './BooleanInput';

const AutomaticInput = ({
    name,
    value = false,
    onFinish,
}) => {
    const [type, setType] = useState();

    if (type == undefined) {
        setType(typeof value);
    }

    if (type == 'boolean') {
        return (
            <BooleanInput
                name={name}
                value={value}
                onFinish={onFinish}
            />
        );
    }

    return (
        <TextInput
            name={name}
            value={value}
            onFinish={onFinish}
        />
    );
};

export default AutomaticInput;