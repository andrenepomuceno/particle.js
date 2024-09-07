import React, { useState, forwardRef, useImperativeHandle } from 'react';

const NumberInput = forwardRef(({ name, value = "", children }, ref) => {
    const [isOpen, setIsOpen] = useState(true);
    const [width, setWidth] = useState(300);
    const [height, setHeight] = useState(300);

    const handleClick = (e) => {
        setIsOpen(false);
    };

    useImperativeHandle(ref, () => ({
        open: () => setIsOpen(true),
    }));

    if (!isOpen) return null;

    return (
        <div className="text-input">
            <p>{name}: {value}</p>
        </div>
    );
});

export default NumberInput;