import * as XLSX from 'xlsx';
import type { DailyReport, WorkCompletedRow } from '@/hooks/useDailyReports';

interface SiteMap { [id: string]: string }
interface InvMap { [id: string]: string }

export function exportReportsToExcel(
  reports: DailyReport[],
  siteNames: SiteMap,
  invNames: InvMap,
  filename = 'daily-reports.xlsx'
) {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryRows = reports.map(r => ({
    Date: r.report_date,
    Site: siteNames[r.site_id] || r.site_id,
    Weather: r.weather || '',
    Workers: r.workers_count || 0,
    'Work Hours': r.work_hours || 8,
    Status: r.status || 'draft',
    'Work Description': r.work_description || '',
    Issues: r.issues || '',
    "Tomorrow's Plan": r.tomorrow_plan || '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary');

  // Work Completed sheet
  const workRows: any[] = [];
  reports.forEach(r => {
    const items = (r.work_completed as WorkCompletedRow[]) || [];
    items.forEach(w => {
      workRows.push({
        Date: r.report_date,
        Site: siteNames[r.site_id] || r.site_id,
        Description: w.description,
        Location: w.location,
        '% Complete': w.percentage,
      });
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(workRows.length ? workRows : [{ Note: 'No work entries' }]), 'Work Completed');

  // Materials Used sheet
  const matRows: any[] = [];
  reports.forEach(r => {
    const mats = (r.materials_used as { inventory_id: string; qty_used: number; unit: string }[]) || [];
    mats.forEach(m => {
      matRows.push({
        Date: r.report_date,
        Site: siteNames[r.site_id] || r.site_id,
        Item: invNames[m.inventory_id] || m.inventory_id,
        'Qty Used': m.qty_used,
        Unit: m.unit,
      });
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(matRows.length ? matRows : [{ Note: 'No materials used' }]), 'Materials Used');

  // Issues sheet
  const issueRows = reports
    .filter(r => r.issues?.trim())
    .map(r => ({
      Date: r.report_date,
      Site: siteNames[r.site_id] || r.site_id,
      Issues: r.issues,
    }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(issueRows.length ? issueRows : [{ Note: 'No issues reported' }]), 'Issues');

  XLSX.writeFile(wb, filename);
}

export function exportSingleReport(
  report: DailyReport,
  siteName: string,
  invNames: InvMap
) {
  exportReportsToExcel(
    [report],
    { [report.site_id]: siteName },
    invNames,
    `report-${siteName.replace(/\s+/g, '-')}-${report.report_date}.xlsx`
  );
}
