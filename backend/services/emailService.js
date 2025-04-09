const nodemailer = require('nodemailer');

// Create a transporter object using Ethereal for testing
// In production, replace this with actual SMTP transport or service integration (e.g., SendGrid, Mailgun)
const createEtherealTransporter = async () => {
    try {
        // Generate test SMTP service account from ethereal.email
        let testAccount = await nodemailer.createTestAccount();
        console.log('[Email Service] Ethereal test account created:', testAccount.user);

        // Create reusable transporter object using the default SMTP transport
        let transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: testAccount.user, // generated ethereal user
                pass: testAccount.pass, // generated ethereal password
            },
        });
        return transporter;
    } catch (error) {
        console.error('[Email Service] Failed to create Ethereal test account:', error);
        return null; // Return null if account creation fails
    }
};

// Function to send the invoice email
// Accepts invoice details (including org email), the transporter, and optional PDF buffer
const sendInvoiceEmail = async (transporter, invoiceDetails, pdfBuffer) => {
    if (!transporter) {
        console.error('[Email Service] Cannot send email: Transporter not available.');
        throw new Error('Email service configuration error.');
    }
    if (!invoiceDetails || !invoiceDetails.contactemail) {
         console.error('[Email Service] Cannot send email: Missing invoice details or recipient email.');
         throw new Error('Recipient email address is missing.');
    }

    // Format currency and dates for the email body
    const formatCurrency = (amount) => amount != null ? `$${parseFloat(amount).toFixed(2)}` : 'N/A';
    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString() : 'N/A';

    // Construct simple text email body
    // TODO: Replace with HTML template and potentially PDF attachment later
    const textBody = `
Dear ${invoiceDetails.contactname || invoiceDetails.organizationname},

Please find your invoice attached.

Invoice Number: ${invoiceDetails.invoicenumber}
Invoice Date: ${formatDate(invoiceDetails.invoicedate)}
Due Date: ${formatDate(invoiceDetails.duedate)}
Total Amount Due: ${formatCurrency(invoiceDetails.amount)}
Status: ${invoiceDetails.paymentstatus}

Thank you,
Your Company Name
    `; // Simplified body text

    // Prepare email options
    let mailOptions = {
        from: '"Your Company Name noreply" <noreply@yourcompany.com>', // TODO: Use a real sender address
        to: invoiceDetails.contactemail, // list of receivers
        subject: `Invoice ${invoiceDetails.invoicenumber} from Your Company Name`, // Subject line
        text: textBody, // plain text body
        // html: "<b>Hello world?</b>", // html body - implement later with templates
    };

    // Add attachment if pdfBuffer is provided
    if (pdfBuffer) {
        mailOptions.attachments = [
            {
                filename: `Invoice_${invoiceDetails.invoicenumber}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ];
        console.log('[Email Service] PDF attachment added to email options.');
    } else {
        console.warn('[Email Service] No PDF buffer provided, sending text-only email.');
    }

    try {
        // Send mail with defined transport object
        let info = await transporter.sendMail(mailOptions);

        console.log('[Email Service] Message sent: %s', info.messageId);
        // Preview only available when sending through an Ethereal account
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log('[Email Service] Preview URL: %s', previewUrl);
            return { success: true, messageId: info.messageId, previewUrl: previewUrl };
        } else {
             return { success: true, messageId: info.messageId };
        }

    } catch (error) {
        console.error('[Email Service] Error sending email:', error);
        throw new Error('Failed to send invoice email.');
    }
};

module.exports = {
    createEtherealTransporter,
    sendInvoiceEmail,
}; 