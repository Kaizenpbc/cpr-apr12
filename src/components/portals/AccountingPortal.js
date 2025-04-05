import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const AccountingPortal = () => {
  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Accounting Portal
        </Typography>
        <Typography variant="body1">
          Welcome to the Accounting Portal. This is a placeholder component.
        </Typography>
      </Box>
    </Container>
  );
};

export default AccountingPortal; 