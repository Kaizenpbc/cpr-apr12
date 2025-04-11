// frontend/src/utils/formatters.js

// Format date string (YYYY-MM-DD or ISO) to MM/DD/YYYY (or locale default)
export const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        return new Date(dateString).toLocaleDateString(); 
    } catch (e) {
        console.error('Error formatting date:', dateString, e);
        return 'Invalid Date';
    }
};

// Format YYYY-MM-DD string specifically to MM/DD/YYYY
export const formatDisplayDate = (isoDateString) => {
    if (!isoDateString) return 'N/A';
    try {
        const parts = isoDateString.split('-');
        if (parts.length === 3) {
            return `${parts[1]}/${parts[2]}/${parts[0]}`;
        } 
        // Fallback for non-YYYY-MM-DD input, attempt standard formatting
        return formatDate(isoDateString); 
    } catch (e) {
        console.error('Error formatting display date:', isoDateString, e);
        return 'Invalid Date';
    }
};

// Format number as currency
export const formatCurrency = (amount) => {
    if (amount == null || isNaN(amount)) return '$0.00';
    return `$${parseFloat(amount).toFixed(2)}`;
};

// Get MUI Chip color based on payment status
export const getStatusChipColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'paid': return 'success';
        case 'pending': return 'warning';
        case 'overdue': return 'error';
        // Add course statuses if needed here or create separate function
        case 'completed': return 'success';
        case 'invoiced': return 'success';
        case 'scheduled': return 'primary';
        case 'billing ready': return 'info'; 
        case 'cancelled': return 'error';
        default: return 'default';
    }
}; 