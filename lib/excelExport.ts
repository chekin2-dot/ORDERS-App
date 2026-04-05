import { Platform } from 'react-native';
import { supabase } from './supabase';
import * as XLSX from 'xlsx';

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

async function saveAndShare(wb: any, fileName: string) {
  if (Platform.OS === 'web') {
    const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } else {
    const FileSystem = await import('expo-file-system');
    const Sharing = await import('expo-sharing');
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const fileUri = FileSystem.documentDirectory + fileName;
    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Exporter le rapport',
        UTI: 'com.microsoft.excel.xlsx',
      });
    }
  }
}

export async function exportAnalyticsToExcel(data: AnalyticsExportData) {


  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `Analytics_Report_${timestamp}.xlsx`;

  const topMerchantRevenue = data.topMerchants?.reduce((sum, m) => sum + m.revenue, 0) || 0;
  const topDriverEarnings = data.topDrivers?.reduce((sum, d) => sum + d.revenue, 0) || 0;
  const topClientSpending = data.topClients?.reduce((sum, c) => sum + c.revenue, 0) || 0;

  const summaryData = [
    ['Rapport Analytique'],
    ['Généré le:', new Date().toLocaleString()],
    ['Période:', data.period],
    [''],
    ['Métriques Globales', 'Valeur'],
    ['Revenu Total', `${data.revenue.toLocaleString()} F CFA`],
    ['Commandes Total', data.orders.toLocaleString()],
    ['Valeur Moyenne / Commande', `${data.avgOrderValue.toLocaleString()} F CFA`],
    [''],
    ['Base Utilisateurs', ''],
    ['Clients', data.totalClients.toLocaleString()],
    ['Commerçants', data.totalMerchants.toLocaleString()],
    ['Livreurs', data.totalDrivers.toLocaleString()],
    [''],
    ['Impact Top 5 Performers', ''],
    ['Revenu Commerçants', `${topMerchantRevenue.toLocaleString()} F CFA`],
    ['Gains Livreurs', `${topDriverEarnings.toLocaleString()} F CFA`],
    ['Dépenses Clients', `${topClientSpending.toLocaleString()} F CFA`],
    ['% Revenu Top Commerçants', data.revenue > 0 ? `${((topMerchantRevenue / data.revenue) * 100).toFixed(1)}%` : '0%'],
    ['% Dépenses Top Clients', data.revenue > 0 ? `${((topClientSpending / data.revenue) * 100).toFixed(1)}%` : '0%'],
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
    'N° Commande': order.order_number,
    'Client': `${order.user_profiles?.first_name || ''} ${order.user_profiles?.last_name || ''}`,
    'Commerçant': order.merchants?.shop_name || 'N/A',
    'Montant (F CFA)': order.total,
    'Statut': order.status,
    'Paiement': order.payment_method,
    'Statut Paiement': order.payment_status,
    'Date': new Date(order.created_at).toLocaleString(),
  })) || [];

  const { data: usersData } = await supabase
    .from('user_profiles')
    .select('user_type, first_name, last_name, phone, status, created_at')
    .order('created_at', { ascending: false })
    .limit(1000);

  const usersForExport = usersData?.map((user: any) => ({
    'Nom': `${user.first_name} ${user.last_name || ''}`,
    'Téléphone': user.phone,
    'Type': user.user_type,
    'Statut': user.status,
    'Inscription': new Date(user.created_at).toLocaleDateString(),
  })) || [];

  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

  const wsOrders = XLSX.utils.json_to_sheet(ordersForExport);
  wsOrders['!cols'] = [
    { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, wsOrders, 'Commandes');

  const wsUsers = XLSX.utils.json_to_sheet(usersForExport);
  wsUsers['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsUsers, 'Utilisateurs');

  if (data.topMerchants && data.topMerchants.length > 0) {
    const topMerchantsData = [
      ['Top Commerçants'],
      ['Rang', 'Nom', 'Téléphone', 'Revenu (F CFA)', 'Commandes'],
      ...data.topMerchants.map((merchant, index) => [
        `#${index + 1}`,
        merchant.name,
        merchant.phone || 'N/A',
        merchant.revenue.toLocaleString(),
        merchant.orders,
      ]),
      [''],
      ['Total revenu Top 5:', data.topMerchants.reduce((sum, m) => sum + m.revenue, 0).toLocaleString()],
      ['Total commandes Top 5:', data.topMerchants.reduce((sum, m) => sum + m.orders, 0)],
    ];
    const wsTopMerchants = XLSX.utils.aoa_to_sheet(topMerchantsData);
    wsTopMerchants['!cols'] = [{ wch: 8 }, { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsTopMerchants, 'Top Commerçants');
  }

  if (data.topDrivers && data.topDrivers.length > 0) {
    const topDriversData = [
      ['Top Livreurs'],
      ['Rang', 'Nom', 'Téléphone', 'Gains (F CFA)', 'Livraisons'],
      ...data.topDrivers.map((driver, index) => [
        `#${index + 1}`,
        driver.name,
        driver.phone || 'N/A',
        driver.revenue.toLocaleString(),
        driver.orders,
      ]),
      [''],
      ['Total gains Top 5:', data.topDrivers.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()],
      ['Total livraisons Top 5:', data.topDrivers.reduce((sum, d) => sum + d.orders, 0)],
    ];
    const wsTopDrivers = XLSX.utils.aoa_to_sheet(topDriversData);
    wsTopDrivers['!cols'] = [{ wch: 8 }, { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsTopDrivers, 'Top Livreurs');
  }

  if (data.topClients && data.topClients.length > 0) {
    const topClientsData = [
      ['Top Clients'],
      ['Rang', 'Nom', 'Téléphone', 'Dépenses (F CFA)', 'Commandes'],
      ...data.topClients.map((client, index) => [
        `#${index + 1}`,
        client.name,
        client.phone || 'N/A',
        client.revenue.toLocaleString(),
        client.orders,
      ]),
      [''],
      ['Total dépenses Top 5:', data.topClients.reduce((sum, c) => sum + c.revenue, 0).toLocaleString()],
      ['Total commandes Top 5:', data.topClients.reduce((sum, c) => sum + c.orders, 0)],
    ];
    const wsTopClients = XLSX.utils.aoa_to_sheet(topClientsData);
    wsTopClients['!cols'] = [{ wch: 8 }, { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsTopClients, 'Top Clients');
  }

  await saveAndShare(wb, fileName);
  return { success: true };
}

export async function exportDatabaseBackupToExcel() {


  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `Database_Backup_${timestamp}.xlsx`;

  const { data: orders } = await supabase.from('orders').select('*').limit(1000);
  const { data: users } = await supabase.from('user_profiles').select('*').limit(1000);
  const { data: merchants } = await supabase.from('merchants').select('*').limit(1000);
  const { data: drivers } = await supabase.from('drivers').select('*').limit(1000);
  const { data: products } = await supabase.from('products').select('*').limit(1000);

  const summaryData = [
    ['Sauvegarde Base de Données'],
    ['Généré le:', new Date().toLocaleString()],
    [''],
    ['Statistiques'],
    ['Commandes:', orders?.length || 0],
    ['Utilisateurs:', users?.length || 0],
    ['Commerçants:', merchants?.length || 0],
    ['Livreurs:', drivers?.length || 0],
    ['Produits:', products?.length || 0],
  ];

  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

  if (orders && orders.length > 0) {
    const wsOrders = XLSX.utils.json_to_sheet(orders);
    XLSX.utils.book_append_sheet(wb, wsOrders, 'Commandes');
  }
  if (users && users.length > 0) {
    const wsUsers = XLSX.utils.json_to_sheet(users);
    XLSX.utils.book_append_sheet(wb, wsUsers, 'Utilisateurs');
  }
  if (merchants && merchants.length > 0) {
    const wsMerchants = XLSX.utils.json_to_sheet(merchants);
    XLSX.utils.book_append_sheet(wb, wsMerchants, 'Commerçants');
  }
  if (drivers && drivers.length > 0) {
    const wsDrivers = XLSX.utils.json_to_sheet(drivers);
    XLSX.utils.book_append_sheet(wb, wsDrivers, 'Livreurs');
  }
  if (products && products.length > 0) {
    const wsProducts = XLSX.utils.json_to_sheet(products);
    XLSX.utils.book_append_sheet(wb, wsProducts, 'Produits');
  }

  await saveAndShare(wb, fileName);
  return { success: true };
}

export async function exportDisputesToExcel() {


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
    return { success: false, error: 'No data' };
  }

  const summaryData = [
    ['Rapport des Litiges'],
    ['Généré le:', new Date().toLocaleString()],
    ['Total rapports:', disputes.length.toString()],
    [''],
    ['Par statut'],
    ['En attente:', disputes.filter((d: any) => d.status === 'pending').length.toString()],
    ['En enquête:', disputes.filter((d: any) => d.status === 'investigating').length.toString()],
    ['Résolu:', disputes.filter((d: any) => d.status === 'resolved').length.toString()],
    ['Rejeté:', disputes.filter((d: any) => d.status === 'dismissed').length.toString()],
  ];

  const disputesForExport = disputes.map((dispute: any) => ({
    'ID': dispute.id.substring(0, 8),
    'Type': dispute.report_type.replace(/_/g, ' '),
    'Statut': dispute.status,
    'Rapporteur': `${dispute.reporter?.first_name || ''} ${dispute.reporter?.last_name || ''}`,
    'Tel Rapporteur': dispute.reporter?.phone || '',
    'Rapporté': `${dispute.reported_user?.first_name || ''} ${dispute.reported_user?.last_name || ''}`,
    'Tel Rapporté': dispute.reported_user?.phone || '',
    'N° Commande': dispute.order?.order_number || 'N/A',
    'Montant': dispute.order?.total ? `${dispute.order.total} F CFA` : 'N/A',
    'Description': dispute.description,
    'Créé le': new Date(dispute.created_at).toLocaleString(),
    'Mis à jour': new Date(dispute.updated_at).toLocaleString(),
  }));

  const reportsByType = [
    ['Type', 'Nombre'],
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
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

  const wsDisputes = XLSX.utils.json_to_sheet(disputesForExport);
  wsDisputes['!cols'] = [
    { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 20 },
    { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 40 }, { wch: 20 }, { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDisputes, 'Tous les litiges');

  const wsTypes = XLSX.utils.aoa_to_sheet(reportsByType);
  wsTypes['!cols'] = [{ wch: 25 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsTypes, 'Par type');

  const pendingDisputes = disputesForExport.filter((d: any) => d['Statut'] === 'pending');
  if (pendingDisputes.length > 0) {
    const wsPending = XLSX.utils.json_to_sheet(pendingDisputes);
    wsPending['!cols'] = wsDisputes['!cols'];
    XLSX.utils.book_append_sheet(wb, wsPending, 'En attente');
  }

  await saveAndShare(wb, fileName);
  return { success: true };
}

export async function exportOrdersToExcel(orders: any[]) {


  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `Orders_Report_${timestamp}.xlsx`;

  const summaryData = [
    ['Rapport des Commandes'],
    ['Généré le:', new Date().toLocaleString()],
    ['Total commandes:', orders.length.toString()],
    [''],
    ['Par statut'],
    ['En attente:', orders.filter(o => o.status === 'pending').length.toString()],
    ['Accepté:', orders.filter(o => o.status === 'accepted').length.toString()],
    ['Livré:', orders.filter(o => o.status === 'delivered').length.toString()],
    ['Annulé:', orders.filter(o => o.status === 'cancelled').length.toString()],
    [''],
    ['Financier'],
    ['Revenu total:', `${orders.filter(o => o.status === 'delivered').reduce((s, o) => s + Number(o.total || 0), 0).toLocaleString()} F CFA`],
  ];

  const ordersForExport = orders.map(o => ({
    'N° Commande': o.order_number,
    'Client': `${o.client?.first_name || ''} ${o.client?.last_name || ''}`,
    'Commerçant': o.merchant?.shop_name || 'N/A',
    'Livreur': o.driver?.user_profiles ? `${o.driver.user_profiles.first_name} ${o.driver.user_profiles.last_name}` : 'N/A',
    'Montant (F CFA)': o.total,
    'Statut': o.status,
    'Paiement': o.payment_method || 'N/A',
    'Statut Paiement': o.payment_status || 'N/A',
    'Date': new Date(o.created_at).toLocaleString(),
  }));

  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

  const wsOrders = XLSX.utils.json_to_sheet(ordersForExport);
  wsOrders['!cols'] = [
    { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
    { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, wsOrders, 'Commandes');

  await saveAndShare(wb, fileName);
  return { success: true };
}

export async function exportBulletinsToExcel(bulletins: any[]) {


  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `Bulletins_Report_${timestamp}.xlsx`;

  const summaryData = [
    ['Historique des Bulletins de Paiement'],
    ['Généré le:', new Date().toLocaleString()],
    ['Total bulletins:', bulletins.length.toString()],
    [''],
    ['Par type'],
    ['Marchands:', bulletins.filter(b => b.recipient_type === 'merchant').length.toString()],
    ['Livreurs:', bulletins.filter(b => b.recipient_type === 'driver').length.toString()],
    [''],
    ['Financier'],
    ['Total versé:', `${bulletins.reduce((s, b) => s + Number(b.amount || 0), 0).toLocaleString()} F CFA`],
  ];

  const bulletinsForExport = bulletins.map(b => ({
    'Bénéficiaire': b.recipient_name || 'Inconnu',
    'Type': b.recipient_type === 'merchant' ? 'Marchand' : 'Livreur',
    'Boutique': b.shop_name || 'N/A',
    'Téléphone': b.user_profiles?.phone || 'N/A',
    'Orange Money': b.orange_money_number || 'N/A',
    'Montant (F)': b.amount,
    'Période': b.period_label || 'N/A',
    'Jours couverts': b.period_dates?.length || 0,
    'Payé le': new Date(b.paid_at).toLocaleString(),
  }));

  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

  const wsBulletins = XLSX.utils.json_to_sheet(bulletinsForExport);
  wsBulletins['!cols'] = [
    { wch: 22 }, { wch: 10 }, { wch: 20 }, { wch: 15 },
    { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, wsBulletins, 'Bulletins');

  await saveAndShare(wb, fileName);
  return { success: true };
}
