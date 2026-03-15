# Excel Export Guide

## Overview

The admin dashboard now includes comprehensive Excel export functionality for Analytics & Performance and Disputes & Reports. This feature allows administrators to download detailed reports in Excel format for offline analysis, presentations, and record-keeping.

## Installation

The following packages have been added to support Excel export:

```json
{
  "expo-file-system": "~18.0.8",
  "expo-sharing": "~13.0.4",
  "xlsx": "^0.18.5"
}
```

To install these packages, run:

```bash
npm install
```

## Features

### 1. Analytics Export

**Location**: Admin Dashboard → Analytics & Performance → Export Button

**What Gets Exported**:
- **Summary Sheet**:
  - Report generation date and time
  - Selected period (Daily/Weekly/Monthly)
  - Total revenue
  - Total orders
  - Average order value
  - User statistics (Clients, Merchants, Drivers)

- **Orders Sheet** (Last 1000 orders):
  - Order number
  - Client name
  - Merchant name
  - Order amount
  - Order status
  - Payment method
  - Payment status
  - Order date

- **Users Sheet** (Last 1000 users):
  - User name
  - Phone number
  - User type (Client/Merchant/Driver)
  - Account status
  - Join date

**File Name Format**: `Analytics_Report_YYYY-MM-DD.xlsx`

**Use Cases**:
- Monthly business reviews
- Revenue analysis
- Performance tracking
- Investor reports
- Tax documentation
- Trend analysis

### 2. Disputes Export

**Location**: Admin Dashboard → Disputes & Reports → Export Button

**What Gets Exported**:
- **Summary Sheet**:
  - Report generation date and time
  - Total number of reports
  - Status breakdown (Pending, Investigating, Resolved, Dismissed)

- **All Disputes Sheet**:
  - Report ID
  - Report type
  - Status
  - Reporter name and phone
  - Reported user name and phone
  - Order number (if applicable)
  - Order amount (if applicable)
  - Full description
  - Creation date
  - Last update date

- **By Type Sheet**:
  - Report type breakdown
  - Count for each type

- **Pending Sheet** (if any):
  - All pending disputes requiring attention
  - Same fields as All Disputes sheet

**File Name Format**: `Disputes_Report_YYYY-MM-DD.xlsx`

**Use Cases**:
- Dispute resolution tracking
- Pattern identification
- User behavior analysis
- Legal documentation
- Compliance reporting
- Quality assurance

## How to Use

### Export Analytics Report

1. Navigate to **Analytics & Performance** tab
2. Select your desired period (Day/Week/Month)
3. Click the **Export** button in the top-right corner
4. Wait for the export to complete
5. **On Mobile**: Share dialog will appear - save to Files or share via email/messaging
6. **On Web**: File will download automatically to your Downloads folder

### Export Disputes Report

1. Navigate to **Disputes & Reports** tab
2. Click the **Export** button in the top-right corner
3. Wait for the export to complete
4. **On Mobile**: Share dialog will appear - save to Files or share via email/messaging
5. **On Web**: File will download automatically to your Downloads folder

## Excel File Structure

### Sheet Formatting

All exported Excel files include:
- **Professional headers** with bold formatting
- **Auto-sized columns** for optimal readability
- **Multiple sheets** for organized data
- **Date/time stamps** for tracking
- **Formatted numbers** with proper thousand separators

### Column Widths

The exports automatically set optimal column widths:
- Short fields (IDs, Status): 12-15 characters
- Names and phones: 15-25 characters
- Descriptions: 40 characters
- Dates: 20 characters

## Technical Details

### Export Function Locations

**Main Export Library**: `/lib/excelExport.ts`

Functions:
- `exportAnalyticsToExcel(data: AnalyticsExportData)` - Exports analytics data
- `exportDisputesToExcel()` - Exports disputes data

### Platform Support

- **iOS**: Full support - uses native sharing
- **Android**: Full support - uses native sharing
- **Web**: Full support - automatic download

### Data Limits

To ensure performance:
- **Orders**: Last 1000 orders
- **Users**: Last 1000 users
- **Disputes**: All disputes (no limit)

### File Size

Typical file sizes:
- Analytics Report: 50-200 KB
- Disputes Report: 20-100 KB

## Troubleshooting

### Export Button Not Working

**Problem**: Export button shows loading but nothing happens

**Solutions**:
1. Check internet connection
2. Verify database connection
3. Check for console errors
4. Try reducing export period (for analytics)

### File Not Saving on Mobile

**Problem**: Share dialog appears but file doesn't save

**Solutions**:
1. Grant file storage permissions to the app
2. Ensure sufficient storage space
3. Try saving to device before sharing
4. Update app to latest version

### Excel File Won't Open

**Problem**: Downloaded file won't open in Excel

**Solutions**:
1. Ensure you have Excel or compatible app installed
2. Try opening with Google Sheets or Numbers
3. Check file wasn't corrupted during download
4. Re-export the file

### Missing Data in Export

**Problem**: Some data is missing from the export

**Solutions**:
1. Check if data exists in the dashboard
2. Verify RLS policies allow admin access
3. Try refreshing the data before exporting
4. Check data limits (1000 records for orders/users)

## Advanced Usage

### Analyzing Exported Data

**In Excel**:
1. Use Pivot Tables for custom analysis
2. Create charts and graphs
3. Apply filters and sorting
4. Calculate custom metrics

**In Google Sheets**:
1. Import the file
2. Use formulas for analysis
3. Share with team members
4. Create collaborative reports

### Automating Reports

While manual export is the current method, future enhancements could include:
- Scheduled automatic exports
- Email delivery of reports
- Integration with BI tools
- Custom date range selection
- Additional data fields

## Security Considerations

### Data Protection

- Exported files contain sensitive information
- Files are generated locally on device
- No data is sent to third parties
- Files are not stored on servers

### Best Practices

1. **Store securely**: Save exported files in secure locations
2. **Delete after use**: Remove files when no longer needed
3. **Encrypt sensitive reports**: Use password protection
4. **Control access**: Only share with authorized personnel
5. **Regular exports**: Create backups regularly

### Permissions Required

- **File system access**: To save files locally
- **Sharing capability**: To share files with other apps
- **Database access**: To query data for export

## Data Included in Each Export

### Analytics Export Includes

✅ Revenue metrics
✅ Order statistics
✅ User counts
✅ Payment data
✅ Status breakdowns
✅ Merchant information
✅ Client information
✅ Timestamp data

### Disputes Export Includes

✅ Report details
✅ User information
✅ Contact details
✅ Order references
✅ Status tracking
✅ Descriptions
✅ Type categorization
✅ Date/time stamps

## Future Enhancements

Planned improvements:
- Custom date range selection
- Additional export formats (CSV, PDF)
- Scheduled automatic exports
- Email delivery
- Template customization
- Multi-language support
- Chart/graph inclusion
- Comparative analysis

## Support

For issues with Excel export:
1. Check this guide first
2. Verify all packages are installed
3. Check console for errors
4. Ensure proper admin permissions
5. Test with smaller datasets first

## Examples

### Sample Analytics Export Structure

```
Summary Sheet:
┌─────────────────────────────────────────┐
│ ORDERS Platform - Analytics Report     │
│ Generated on: 2026-01-17 10:30:00      │
│ Period: month                           │
│                                         │
│ Metric              | Value            │
│ Total Revenue       | 2,450,000 F CFA  │
│ Total Orders        | 234              │
│ Average Order Value | 10,470 F CFA     │
│ Total Clients       | 150              │
│ Total Merchants     | 25               │
│ Total Drivers       | 15               │
└─────────────────────────────────────────┘
```

### Sample Disputes Export Structure

```
Summary Sheet:
┌────────────────────────────────────────┐
│ ORDERS Platform - Disputes Report     │
│ Generated on: 2026-01-17 10:30:00     │
│ Total Reports: 47                     │
│                                       │
│ Status Breakdown                      │
│ Pending: 12                           │
│ Investigating: 8                      │
│ Resolved: 25                          │
│ Dismissed: 2                          │
└────────────────────────────────────────┘
```

---

**Note**: Excel export functionality requires the packages to be installed. Run `npm install` after pulling the latest code to ensure all dependencies are available.
