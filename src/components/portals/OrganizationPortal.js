import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const OrganizationPortal = () => {
  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Organization Portal
        </Typography>
        <Typography variant="body1">
          Welcome to the Organization Portal. This is a placeholder component.
        </Typography>
      </Box>
    </Container>
  );
};

export default OrganizationPortal; 