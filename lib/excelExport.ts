import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { supabase } from './supabase';

export interface TopPerformer {
  id: string;
  name: string;
  revenue: number;
  orders: number;
  phone?: string;
}

export interface AnalyticsExportData {
  period: 'day' | 'week' | 'month';
  revenue: number;
  orders: number;
  avgOrderValue: number;
  totalClients: number;
  totalMerchants: number;
  totalDrivers: number;
  topMerchants?: TopPerformer[];
  topDrivers?: TopPerformer[];
  topClients?: TopPerformer[];
}

export interface DisputeExportData {
  id: string;
  report_type: string;
  description: string;
  status: string;
  created_at: string;
  reporter_name: string;
  reported_user_name: string;
  order_number: string | null;
}

export async function exportAnalyticsToExcel(data: AnalyticsExportData) {
  try {
    const XLSX = require('xlsx');

    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `Analytics_Report_${timestamp}.xlsx`;

    const topMerchantRevenue = data.topMerchants?.reduce((sum, m) => sum + m.revenue, 0) || 0;
    const topDriverEarnings = data.topDrivers?.reduce((sum, d) => sum + d.revenue, 0) || 0;
    const topClientSpending = data.topClients?.reduce((sum, c) => sum + c.revenue, 0) || 0;

    const summaryData = [
      ['ORDERS Platform - Analytics Report'],
      ['Generated on:', new Date().toLocaleString()],
      ['Period:', data.period],
      [''],
      ['Overall Metrics', 'Value'],
      ['Total Revenue', `${data.revenue.toLocaleString()} F CFA`],
      ['Total Orders', data.orders.toLocaleString()],
      ['Average Order Value', `${data.avgOrderValue.toLocaleString()} F CFA`],
      [''],
      ['User Base', ''],
      ['Total Clients', data.totalClients.toLocaleString()],
      ['Total Merchants', data.totalMerchants.toLocaleString()],
      ['Total Drivers', data.totalDrivers.toLocaleString()],
      [''],
      ['Top Performers Impact (Top 5)', ''],
      ['Merchants Revenue', `${topMerchantRevenue.toLocaleString()} F CFA`],
      ['Drivers Earnings', `${topDriverEarnings.toLocaleString()} F CFA`],
      ['Clients Spending', `${topClientSpending.toLocaleString()} F CFA`],
      ['% of Revenue from Top Merchants', data.revenue > 0 ? `${((topMerchantRevenue / data.revenue) * 100).toFixed(1)}%` : '0%'],
      ['% of Spending from Top Clients', data.revenue > 0 ? `${((topClientSpending / data.revenue) * 100).toFixed(1)}%` : '0%'],
    ];

    const { data: ordersData } = await supabase
      .from('orders')
      .select(`
        order_number,
        total,
        status,
        payment_method,
        payment_status,
        created_at,
        user_profiles!orders_client_id_fkey(first_name, last_name),
        merchants(shop_name)
      `)
      .order('created_at', { ascending: false })
      .limit(1000);

    const ordersForExport = ordersData?.map((order: any) => ({
      'Order Number': order.order_number,
      'Client': `${order.user_profiles?.first_name || ''} ${order.user_profiles?.last_name || ''}`,
      'Merchant': order.merchants?.shop_name || 'N/A',
      'Amount (F CFA)': order.total,
      'Status': order.status,
      'Payment Method': order.payment_method,
      'Payment Status': order.payment_status,
      'Date': new Date(order.created_at).toLocaleString(),
    })) || [];

    const { data: usersData } = await supabase
      .from('user_profiles')
      .select('user_type, first_name, last_name, phone, status, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    const usersForExport = usersData?.map((user: any) => ({
      'Name': `${user.first_name} ${user.last_name || ''}`,
      'Phone': user.phone,
      'Type': user.user_type,
      'Status': user.status,
      'Joined': new Date(user.created_at).toLocaleDateString(),
    })) || [];

    const wb = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    const wsOrders = XLSX.utils.json_to_sheet(ordersForExport);
    wsOrders['!cols'] = [
      { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }
    ];
    XLSX.utils.book_append_sheet(wb, wsOrders, 'Orders');

    const wsUsers = XLSX.utils.json_to_sheet(usersForExport);
    wsUsers['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsUsers, 'Users');

    if (data.topMerchants && data.topMerchants.length > 0) {
      const topMerchantsData = [
        ['Top Merchants - Boosting Business'],
        ['Rank', 'Merchant Name', 'Phone', 'Revenue (F CFA)', 'Orders'],
        ...data.topMerchants.map((merchant, index) => [
          `#${index + 1}`,
          merchant.name,
          merchant.phone || 'N/A',
          merchant.revenue.toLocaleString(),
          merchant.orders,
        ]),
        [''],
        ['Total Revenue from Top 5:', data.topMerchants.reduce((sum, m) => sum + m.revenue, 0).toLocaleString()],
        ['Total Orders from Top 5:', data.topMerchants.reduce((sum, m) => sum + m.orders, 0)],
      ];

      const wsTopMerchants = XLSX.utils.aoa_to_sheet(topMerchantsData);
      wsTopMerchants['!cols'] = [{ wch: 8 }, { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, wsTopMerchants, 'Top Merchants');
    }

    if (data.topDrivers && data.topDrivers.length > 0) {
      const topDriversData = [
        ['Top Drivers - Boosting Business'],
        ['Rank', 'Driver Name', 'Phone', 'Earnings (F CFA)', 'Deliveries'],
        ...data.topDrivers.map((driver, index) => [
          `#${index + 1}`,
          driver.name,
          driver.phone || 'N/A',
          driver.revenue.toLocaleString(),
          driver.orders,
        ]),
        [''],
        ['Total Earnings from Top 5:', data.topDrivers.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()],
        ['Total Deliveries from Top 5:', data.topDrivers.reduce((sum, d) => sum + d.orders, 0)],
      ];

      const wsTopDrivers = XLSX.utils.aoa_to_sheet(topDriversData);
      wsTopDrivers['!cols'] = [{ wch: 8 }, { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsTopDrivers, 'Top Drivers');
    }

    if (data.topClients && data.topClients.length > 0) {
      const topClientsData = [
        ['Top Clients - Boosting Business'],
        ['Rank', 'Client Name', 'Phone', 'Spending (F CFA)', 'Orders'],
        ...data.topClients.map((client, index) => [
          `#${index + 1}`,
          client.name,
          client.phone || 'N/A',
          client.revenue.toLocaleString(),
          client.orders,
        ]),
        [''],
        ['Total Spending from Top 5:', data.topClients.reduce((sum, c) => sum + c.revenue, 0).toLocaleString()],
        ['Total Orders from Top 5:', data.topClients.reduce((sum, c) => sum + c.orders, 0)],
      ];

      const wsTopClients = XLSX.utils.aoa_to_sheet(topClientsData);
      wsTopClients['!cols'] = [{ wch: 8 }, { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, wsTopClients, 'Top Clients');
    }

    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Exporter le rapport d\'analyse',
        UTI: 'com.microsoft.excel.xlsx',
      });
      Alert.alert('Succès', 'Rapport d\'analyse exporté avec succès!');
    } else {
      Alert.alert('Succès', `Rapport enregistré dans: ${fileUri}`);
    }

    return { success: true, message: 'Report exported successfully!' };
  } catch (error: any) {
    console.error('Error exporting analytics:', error);
    Alert.alert('Export Failed', error.message || 'Could not export analytics report');
    return { success: false, error: error.message };
  }
}

export async function exportDatabaseBackupToExcel() {
  try {
    const XLSX = require('xlsx');

    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `Database_Backup_${timestamp}.xlsx`;

    const { data: orders } = await supabase.from('orders').select('*').limit(1000);
    const { data: users } = await supabase.from('user_profiles').select('*').limit(1000);
    const { data: merchants } = await supabase.from('merchants').select('*').limit(1000);
    const { data: drivers } = await supabase.from('drivers').select('*').limit(1000);
    const { data: products } = await supabase.from('products').select('*').limit(1000);

    const summaryData = [
      ['ORDERS Platform - Database Backup'],
      ['Generated on:', new Date().toLocaleString()],
      ['Version:', '1.0.0'],
      [''],
      ['Database Statistics'],
      ['Total Orders:', orders?.length || 0],
      ['Total Users:', users?.length || 0],
      ['Total Merchants:', merchants?.length || 0],
      ['Total Drivers:', drivers?.length || 0],
      ['Total Products:', products?.length || 0],
    ];

    const wb = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    if (orders && orders.length > 0) {
      const wsOrders = XLSX.utils.json_to_sheet(orders);
      XLSX.utils.book_append_sheet(wb, wsOrders, 'Orders');
    }

    if (users && users.length > 0) {
      const wsUsers = XLSX.utils.json_to_sheet(users);
      XLSX.utils.book_append_sheet(wb, wsUsers, 'Users');
    }

    if (merchants && merchants.length > 0) {
      const wsMerchants = XLSX.utils.json_to_sheet(merchants);
      XLSX.utils.book_append_sheet(wb, wsMerchants, 'Merchants');
    }

    if (drivers && drivers.length > 0) {
      const wsDrivers = XLSX.utils.json_to_sheet(drivers);
      XLSX.utils.book_append_sheet(wb, wsDrivers, 'Drivers');
    }

    if (products && products.length > 0) {
      const wsProducts = XLSX.utils.json_to_sheet(products);
      XLSX.utils.book_append_sheet(wb, wsProducts, 'Products');
    }

    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Exporter la sauvegarde',
        UTI: 'com.microsoft.excel.xlsx',
      });
      Alert.alert('Succès', 'Sauvegarde exportée en Excel avec succès!');
    } else {
      Alert.alert('Succès', `Sauvegarde enregistrée dans: ${fileUri}`);
    }

    return { success: true, message: 'Backup exported successfully!' };
  } catch (error: any) {
    console.error('Error exporting backup:', error);
    Alert.alert('Erreur', error.message || 'Impossible d\'exporter la sauvegarde');
    return { success: false, error: error.message };
  }
}

export async function exportDisputesToExcel() {
  try {
    const XLSX = require('xlsx');

    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `Disputes_Report_${timestamp}.xlsx`;

    const { data: disputes } = await supabase
      .from('app_reports')
      .select(`
        id,
        report_type,
        description,
        status,
        created_at,
        updated_at,
        reporter:user_profiles!app_reports_reporter_id_fkey(first_name, last_name, phone),
        reported_user:user_profiles!app_reports_reported_user_id_fkey(first_name, last_name, phone),
        order:orders(order_number, total)
      `)
      .order('created_at', { ascending: false });

    if (!disputes || disputes.length === 0) {
      Alert.alert('No Data', 'No disputes to export');
      return { success: false, error: 'No data' };
    }

    const summaryData = [
      ['ORDERS Platform - Disputes Report'],
      ['Generated on:', new Date().toLocaleString()],
      ['Total Reports:', disputes.length.toString()],
      [''],
      ['Status Breakdown'],
      ['Pending:', disputes.filter((d: any) => d.status === 'pending').length.toString()],
      ['Investigating:', disputes.filter((d: any) => d.status === 'investigating').length.toString()],
      ['Resolved:', disputes.filter((d: any) => d.status === 'resolved').length.toString()],
      ['Dismissed:', disputes.filter((d: any) => d.status === 'dismissed').length.toString()],
    ];

    const disputesForExport = disputes.map((dispute: any) => ({
      'Report ID': dispute.id.substring(0, 8),
      'Type': dispute.report_type.replace(/_/g, ' '),
      'Status': dispute.status,
      'Reporter': `${dispute.reporter?.first_name || ''} ${dispute.reporter?.last_name || ''}`,
      'Reporter Phone': dispute.reporter?.phone || '',
      'Reported User': `${dispute.reported_user?.first_name || ''} ${dispute.reported_user?.last_name || ''}`,
      'Reported Phone': dispute.reported_user?.phone || '',
      'Order Number': dispute.order?.order_number || 'N/A',
      'Order Amount': dispute.order?.total ? `${dispute.order.total} F CFA` : 'N/A',
      'Description': dispute.description,
      'Created': new Date(dispute.created_at).toLocaleString(),
      'Updated': new Date(dispute.updated_at).toLocaleString(),
    }));

    const reportsByType = [
      ['Report Type', 'Count'],
      ...Object.entries(
        disputes.reduce((acc: any, d: any) => {
          acc[d.report_type] = (acc[d.report_type] || 0) + 1;
          return acc;
        }, {})
      ).map(([type, count]) => [type.replace(/_/g, ' '), count]),
    ];

    const wb = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    const wsDisputes = XLSX.utils.json_to_sheet(disputesForExport);
    wsDisputes['!cols'] = [
      { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 20 },
      { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 40 }, { wch: 20 }, { wch: 20 }
    ];
    XLSX.utils.book_append_sheet(wb, wsDisputes, 'All Disputes');

    const wsTypes = XLSX.utils.aoa_to_sheet(reportsByType);
    wsTypes['!cols'] = [{ wch: 25 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsTypes, 'By Type');

    const pendingDisputes = disputesForExport.filter(d => d.Status === 'pending');
    if (pendingDisputes.length > 0) {
      const wsPending = XLSX.utils.json_to_sheet(pendingDisputes);
      wsPending['!cols'] = wsDisputes['!cols'];
      XLSX.utils.book_append_sheet(wb, wsPending, 'Pending');
    }

    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Exporter le rapport des litiges',
        UTI: 'com.microsoft.excel.xlsx',
      });
      Alert.alert('Succès', 'Rapport des litiges exporté avec succès!');
    } else {
      Alert.alert('Succès', `Rapport enregistré dans: ${fileUri}`);
    }

    return { success: true, message: 'Report exported successfully!' };
  } catch (error: any) {
    console.error('Error exporting disputes:', error);
    Alert.alert('Export Failed', error.message || 'Could not export disputes report');
    return { success: false, error: error.message };
  }
}
