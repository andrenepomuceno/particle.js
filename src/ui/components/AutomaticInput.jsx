import React from 'react';
import { useState } from 'react';
import TextInput from './TextInput';
import BooleanInput from './BooleanInput';
import SelectionInput from './SelectionInput';
import ButtonInput from './ButtonInput';

const AutomaticInput = ({
    name = '',
    itemType = '',
    value = false,
    onFinish = undefined,
    selectionList = undefined,
}) => {
    //const [type, setType] = useState(itemType);
    const type = itemType;

    if (type == 'boolean') {
        return (
            <BooleanInput
                name={name}
                value={value}
                onFinish={onFinish}
            />
        );
    }

    if (type == 'function') {
        return (
            <ButtonInput
                name={name}
                onClick={value}
            />
        );
    }

    if (selectionList != undefined) {
        return (
            <SelectionInput
                name={name}
                value={value}
                onFinish={onFinish}
                selectionList={selectionList}
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