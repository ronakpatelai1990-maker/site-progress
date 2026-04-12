import * as XLSX from 'xlsx';
import type { DailyReport, DailyReportMaterialRow, DailyReportWorkRow } from '@/hooks/useDailyReports';

interface SiteMap {
  [id: string]: string;
}

export function exportReportsToExcel(reports: DailyReport[], siteNames: SiteMap, filename = 'daily-reports.xlsx') {
  const wb = XLSX.utils.book_new();

  const summaryRows = reports.map(r => ({
    Date: r.report_date,
    Site: siteNames[r.site_id] || r.site_id,
    Weather: r.weather || '',
    Temperature: r.temperature ?? '',
    'Work Start': r.work_start_time || '',
    'Work End': r.work_end_time || '',
    'Total Workers': r.total_workers ?? '',
    Status: r.status || 'draft',
    'Submitted By': r.submitted_by_name || '',
    'Tomorrow Plan': r.tomorrow_plan || '',
    'Expected Workers': r.expected_workers ?? '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary');

  const workRows: any[] = [];
  reports.forEach(r => {
    const items = (r.work_rows || []) as DailyReportWorkRow[];
    items.forEach(w => {
      workRows.push({
        Date: r.report_date,
        Site: siteNames[r.site_id] || r.site_id,
        Description: w.description,
        Location: w.location,
        Quantity: w.quantity ?? '',
        Unit: w.unit,
        Status: w.status,
        'Assigned To': w.assigned_to,
      });
    });
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(workRows.length ? workRows : [{ Note: 'No work entries' }]),
    'Work Completed'
  );

  const matRows: any[] = [];
  reports.forEach(r => {
    const mats = (r.material_rows || []) as DailyReportMaterialRow[];
    mats.forEach(m => {
      matRows.push({
        Date: r.report_date,
        Site: siteNames[r.site_id] || r.site_id,
        Material: m.material_name,
        'Qty Used': m.quantity_used ?? '',
        Unit: m.unit,
        'Remaining Stock': m.remaining_stock ?? '',
      });
    });
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(matRows.length ? matRows : [{ Note: 'No materials used' }]),
    'Materials Used'
  );

  const issueRows = reports.map(r => ({
    Date: r.report_date,
    Site: siteNames[r.site_id] || r.site_id,
    Issues: r.issues || '',
    'Safety Observations': r.safety_notes || '',
    'Visitor Notes': r.visitor_notes || '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(issueRows.length ? issueRows : [{ Note: 'No issues' }]), 'Issues');

  XLSX.writeFile(wb, filename);
}

export function exportSingleReport(report: DailyReport, siteName: string) {
  exportReportsToExcel([report], { [report.site_id]: siteName }, `report-${siteName.replace(/\s+/g, '-')}-${report.report_date}.xlsx`);
}
