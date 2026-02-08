import React from 'react';
import { Box } from '@mui/material';
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
                onClose={(e) => view.onClickClose(e)}
            >
                <Box sx={{ px: 2 }}>
                    <GridList itemList={view.state['field']}></GridList>
                </Box>
            </CustomDialog>
        </div>
    );
};

export default FieldView;