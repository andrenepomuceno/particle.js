import React, { useState } from 'react';
import CustomDialog from '../components/CustomDialog';
import GridList from '../components/GridList';

const FieldView = ({view}) => {
    return (
        <div>
            <CustomDialog
                title='Field'
                size={{ width: 340, height: 280 }}
                position={{ x: 10, y: 510 }}
                canClose={true}
                open={view.isOpen}
                onClose={view.onClose}
            >
                <GridList itemList={view.state.parameters['field']}></GridList>
            </CustomDialog>
        </div>
    );
};

export default FieldView;