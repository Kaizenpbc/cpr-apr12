const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs').promises; // Use promises version of fs
const path = require('path');

// Helper function to format currency (consistency with email service)
const formatCurrency = (amount) => {
    if (amount == null || isNaN(amount)) return 'N/A'; // Added NaN check
    return `$${parseFloat(amount).toFixed(2)}`;
};

// Helper function to format dates (consistency with email service)
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString();
    } catch (e) {
        console.error('Error formatting date in PDF service:', dateString, e);
        return 'Invalid Date';
    }
};

// Register Handlebars helpers if needed (e.g., for formatting)
handlebars.registerHelper('formatCurrency', formatCurrency);
handlebars.registerHelper('formatDate', formatDate);

const generateInvoicePDF = async (invoiceData) => {
    console.log('[PDF Service] Starting PDF generation for Invoice:', invoiceData?.invoiceNumber);
    let browser = null; // Define browser outside try block
    try {
        // 1. Load HTML Template
        const templatePath = path.join(__dirname, '../templates', 'invoice_template.html');
        const htmlTemplate = await fs.readFile(templatePath, 'utf-8');

        // 2. Compile Template with Handlebars
        const template = handlebars.compile(htmlTemplate);

        // 3. Prepare Data Context for Handlebars
        // Ensure data matches the placeholders in the template
        const context = {
            ...invoiceData,
            // Add formatted versions for easier template usage
            invoiceDateFormatted: formatDate(invoiceData.invoicedate),
            dueDateFormatted: formatDate(invoiceData.duedate),
            dateCompletedFormatted: formatDate(invoiceData.datecompleted),
            ratePerStudentFormatted: formatCurrency(invoiceData.rateperstudent),
            totalAmountFormatted: formatCurrency(invoiceData.amount),
            // Assuming invoiceData.students is an array of student objects
        };
        console.log('[PDF Service] Data context prepared for template.');

        // 4. Inject Data into Template
        const finalHtml = template(context);
        // console.log('[PDF Service] Final HTML:', finalHtml); // Optional: Log generated HTML for debugging

        // 5. Launch Puppeteer and Generate PDF
        // Use puppeteer.launch({ args: ['--no-sandbox'] }) if running in certain environments like Docker
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        
        // Set content and wait for it to be fully loaded
        await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
        
        // Generate PDF from the page content
        const pdfBuffer = await page.pdf({
            format: 'Letter', // Or 'A4'
            printBackground: true, // Include background colors/images from CSS
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        });
        console.log('[PDF Service] PDF buffer generated successfully.');

        return pdfBuffer;

    } catch (error) {
        console.error('[PDF Service] Error generating PDF:', error);
        throw new Error('Failed to generate invoice PDF.'); // Propagate error
    } finally {
        // Ensure browser is closed even if errors occur
        if (browser) {
            await browser.close();
            console.log('[PDF Service] Puppeteer browser closed.');
        }
    }
};

module.exports = { generateInvoicePDF }; 