import React from 'react';
import TextField from '@mui/material/TextField'
import './Input.css';

const TextInput = ({ name, value = "", children }) => {
    return (
        <div className="text-input">
            <TextField id="outlined-basic"
                type="text" label={name} value={value}
            />
        </div>
    );
};

export default TextInput;