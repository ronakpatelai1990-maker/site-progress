import { useState } from 'react';
import { format } from 'date-fns';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { useSites, useInventory } from '@/hooks/useSupabaseData';
import { useDailyReports, useDeleteDailyReport } from '@/hooks/useDailyReports';
import type { DailyReport } from '@/hooks/useDailyReports';
import { CreateDailyReportDrawer } from '@/components/CreateDailyReportDrawer';
import { EditDailyReportDrawer } from '@/components/EditDailyReportDrawer';
import { FAB } from '@/components/FAB';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Users, Package, Calendar, ImageIcon, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DailyProgressPage() {
  const { role } = useAuth();
  const { data: sites = [] } = useSites();
  const { data: inventory = [] } = useInventory();
  const { data: reports = [], isLoading } = useDailyReports();
  const [showCreate, setShowCreate] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const canCreate = role === 'admin' || role === 'engineer';

  const getSiteName = (siteId: string) => sites.find(s => s.id === siteId)?.name || 'Unknown';
  const getItemName = (invId: string) => inventory.find(i => i.id === invId)?.item_name || 'Unknown';

  return (
    <AppShell title="Daily Progress" subtitle="Site progress reports">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      ) : reports.length === 0 ? (
        <div className="card-elevated flex flex-col items-center justify-center py-12">
          <ClipboardList className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No reports yet</p>
          {canCreate && <p className="text-xs text-muted-foreground mt-1">Tap + to add today's report</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => {
            const manpower = (report.manpower as { role: string; count: number }[]) || [];
            const materials = (report.materials_used as { inventory_id: string; qty_used: number; unit: string }[]) || [];
            const photos = report.photos || [];
            const totalWorkers = manpower.reduce((sum, m) => sum + m.count, 0);

            return (
              <Card key={report.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{getSiteName(report.site_id)}</CardTitle>
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(report.report_date), 'dd MMM yyyy')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Work Done */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <ClipboardList className="h-3.5 w-3.5 text-accent" />
                      <span className="label-meta">Work Done</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{report.work_description}</p>
                  </div>

                  {/* Manpower */}
                  {manpower.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Users className="h-3.5 w-3.5 text-accent" />
                        <span className="label-meta">Manpower ({totalWorkers} total)</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {manpower.map((m, i) => (
                          <span key={i} className="inline-flex items-center rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                            {m.role}: {m.count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Materials Used */}
                  {materials.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Package className="h-3.5 w-3.5 text-accent" />
                        <span className="label-meta">Materials Used</span>
                      </div>
                      <div className="space-y-1">
                        {materials.map((m, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-1.5">
                            <span className="text-xs text-foreground">{getItemName(m.inventory_id)}</span>
                            <span className="text-xs font-medium tabular-nums text-muted-foreground">{m.qty_used} {m.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Photos */}
                  {photos.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <ImageIcon className="h-3.5 w-3.5 text-accent" />
                        <span className="label-meta">Photos ({photos.length})</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {photos.map((url, i) => (
                          <button
                            key={i}
                            onClick={() => setLightboxUrl(url)}
                            className="aspect-square rounded-lg overflow-hidden bg-secondary"
                          >
                            <img src={url} alt={`Site photo ${i + 1}`} className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {canCreate && <FAB onClick={() => setShowCreate(true)} label="Report" />}

      <CreateDailyReportDrawer
        open={showCreate}
        onOpenChange={setShowCreate}
        sites={sites}
        inventory={inventory}
      />

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt="Site photo" className="max-h-[85vh] max-w-full rounded-lg object-contain" />
        </div>
      )}
    </AppShell>
  );
}
