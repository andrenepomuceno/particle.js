import React from 'react';
import { Box } from '@mui/material';
import CustomDialog from '../components/CustomDialog';
import GridList from '../components/GridList';

const AdvancedView = ({ view }) => {
    return (
        <div>
            <CustomDialog
                title='Advanced'
                size={{ width: 300, height: 460 }}
                position={{ x: 1130, y: 530 }}
                canClose={true}
                open={view.isOpen}
                onClose={(e) => view.onClickClose(e)}
            >
                <Box sx={{ px: 2 }}>
                    <GridList itemList={view.state['advanced']} cols={1}></GridList>
                </Box>
            </CustomDialog>
        </div>
    );
};

export default AdvancedView;