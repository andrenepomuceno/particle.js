import React, { useState } from 'react';
import CustomDialog from '../components/CustomDialog';
import GridList from '../components/GridList';

const AdvancedView = ({ view }) => {
    return (
        <div>
            <CustomDialog
                title='Advanced'
                size={{ width: 300, height: 280 }}
                position={{ x: 1130, y: 530 }}
                canClose={true}
                open={view.isOpen}
                onClose={(e) => view.onClickClose(e)}
            >
                <GridList itemList={view.state.parameters['advanced']} cols={1}></GridList>
            </CustomDialog>
        </div>
    );
};

export default AdvancedView;