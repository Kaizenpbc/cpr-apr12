import React from 'react';
import {
    TableCell, 
    TableHead, 
    TableRow, 
    Paper, Table, TableContainer, Typography, Box, Button, CircularProgress, Alert, Snackbar, IconButton, Tooltip, TableBody
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PricingRuleDialog from './PricingRuleDialog';

                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Organization</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Course Type</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Price</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                </TableHead> 