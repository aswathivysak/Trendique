
const PDFDocument = require('pdfkit')
const ExcelJS = require('exceljs')


function generatePDF(res, salesData, totalSale, totalAmount, totalDiscount, totalOffer) {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
  
    // Correct headers + filename
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');
  
    doc.pipe(res);
  
    // Title
    doc.fontSize(22).fillColor('#333366')
      .text('TRENDIQUE Sales Report', { align: 'center' })
      .moveDown(2);
  
    // Column X positions (no User column)
    const X = {
      sl: 50,
      orderId: 90,
      date: 200,
      amount: 300,
      discount: 370,
      offer: 430,
      payment: 500,
    };
  
    // Draw table header
    const drawHeader = () => {
      const y = doc.y;
      doc.fontSize(12).fillColor('#000')
        .text('SL', X.sl, y)
        .text('Order ID', X.orderId, y)
        .text('Date', X.date, y)
        .text('Amount', X.amount, y)
        .text('Discount', X.discount, y)
        .text('Offer', X.offer, y)
        .text('Payment', X.payment, y);
  
      doc.moveDown(0.5);
      doc.moveTo(X.sl, doc.y).lineTo(570, doc.y).stroke();
    };
  
    drawHeader();
    let y = doc.y + 8;
  
    const fmtAmt = v => (typeof v === 'number' ? `₹${v.toFixed(2)}` : (v ?? ''));
    const fmtDate = d => {
      const dt = new Date(d);
      return isNaN(dt) ? (d ?? '') : dt.toLocaleDateString('en-IN');
    };
  
    salesData.forEach((item, i) => {
      // Map common payment keys
      const payment =
        item.payment ??
        item.paymentMethod ??
        item.payment_mode ??
        item.payment_type ??
        item.paymentType ??
        '';
  
      doc.fontSize(10).fillColor('#000')
        .text(String(i + 1), X.sl, y)
        .text(String(item.orderId || '').slice(0, 10), X.orderId, y)
        .text(fmtDate(item.date), X.date, y)
        .text(fmtAmt(item.totalAmount), X.amount, y)
        .text(fmtAmt(item.discount), X.discount, y)
        .text(fmtAmt(item.offer), X.offer, y)
        .text(String(payment), X.payment, y, { width: 40, ellipsis: true });
  
      y += 18;
  
      // New page
      if (y > 770) {
        doc.addPage();
        drawHeader();
        y = doc.y + 8;
      }
    });
  
    // Totals
    y += 18;
    doc.fontSize(12).fillColor('#000')
      .text(`Total Orders: ${totalSale}`, X.sl, y)
      .text(`Total Amount: ₹${Number(totalAmount || 0).toFixed(2)}`, X.sl, y + 18)
      .text(`Total Discount: ₹${Number(totalDiscount || 0).toFixed(2)}`, X.sl, y + 36)
      .text(`Total Offer: ₹${Number(totalOffer || 0).toFixed(2)}`, X.sl, y + 54);
  
    doc.end();
  }
async function generateExcel(res, salesData, totalSale, totalAmount, totalDiscount, totalOffer) {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Sales Report')

    worksheet.columns = [
        { header: 'SL', key: 'sl', width: 6 },
        { header: 'Order ID', key: 'orderId', width: 20 },
        { header: 'User', key: 'user', width: 25 },
        { header: 'Date', key: 'date', width: 20 },
        { header: 'Amount', key: 'totalAmount', width: 15 },
        { header: 'Discount', key: 'discount', width: 15 },
        { header: 'Offer', key: 'offer', width: 15 },
        { header: 'Payment', key: 'payment', width: 15 },
    ]

    // Add rows
    salesData.forEach((row, i) => {
        worksheet.addRow({ sl: i + 1, ...row })
    })

    // Styling header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF333366' },
    }
    worksheet.getRow(1).alignment = { horizontal: 'center' }

    worksheet.addRow([]) // empty row

    worksheet.addRow({
        user: 'TOTALS:',
        totalAmount,
        discount: totalDiscount,
        offer: totalOffer
    })

    const lastRow = worksheet.lastRow
    lastRow.font = { bold: true }
    lastRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' },
        }
    })

    res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"')

    await workbook.xlsx.write(res)
    res.end()
}



module.exports = {
    generatePDF,
    generateExcel
}