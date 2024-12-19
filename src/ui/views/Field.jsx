import React, { useState } from 'react';
import CustomDialog from '../components/CustomDialog';
import GridList from '../components/GridList';

const FieldView = ({
    open = true,
    onClose,
    parameters = [{
        folder: "",
        content: [{
            title: "", value: "", onFinish: undefined
        }]
    }],
}) => {
    return (
        <div>
            <CustomDialog
                title='Field'
                size={{ width: 500, height: 280 }}
                position={{ x: 10, y: 840 }}
                canClose={true}
                open={open}
                onClose={onClose}
            >
                <GridList itemList={parameters['field']}></GridList>
            </CustomDialog>
        </div>
    );
};

export default FieldView;