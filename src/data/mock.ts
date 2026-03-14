export type UserRole = 'admin' | 'engineer' | 'supervisor';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  phone: string;
  email: string;
  engineerId?: string;
}

export interface Site {
  id: string;
  name: string;
  location: string;
  startDate: string;
  engineerId: string;
}

export interface Task {
  id: string;
  siteId: string;
  title: string;
  description: string;
  assignedTo: string;
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed';
  remarks: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  itemName: string;
  totalQty: number;
  availableQty: number;
  minStockLevel: number;
  unit: string;
}

export interface MaterialUsage {
  id: string;
  taskId: string;
  inventoryId: string;
  qtyUsed: number;
  recordedBy: string;
  recordedAt: string;
}

// Current user (switch to test roles)
export const currentUser: User = {
  id: 'u1',
  name: 'Ahmed Khan',
  role: 'admin',
  phone: '+971501234567',
  email: 'ahmed@buildco.com',
};

export const users: User[] = [
  currentUser,
  { id: 'u2', name: 'Raj Patel', role: 'engineer', phone: '+971502345678', email: 'raj@buildco.com' },
  { id: 'u3', name: 'Omar Farooq', role: 'engineer', phone: '+971503456789', email: 'omar@buildco.com' },
  { id: 'u4', name: 'Hassan Ali', role: 'supervisor', phone: '+971504567890', email: 'hassan@buildco.com', engineerId: 'u2' },
  { id: 'u5', name: 'Karim Nasser', role: 'supervisor', phone: '+971505678901', email: 'karim@buildco.com', engineerId: 'u2' },
  { id: 'u6', name: 'Bilal Sheikh', role: 'supervisor', phone: '+971506789012', email: 'bilal@buildco.com', engineerId: 'u3' },
];

export const sites: Site[] = [
  { id: 's1', name: 'Downtown Plaza', location: 'Dubai Marina', startDate: '2026-01-15', engineerId: 'u2' },
  { id: 's2', name: 'Sunrise Tower', location: 'Business Bay', startDate: '2026-02-01', engineerId: 'u3' },
  { id: 's3', name: 'Green Valley Villas', location: 'Al Barsha', startDate: '2026-03-01', engineerId: 'u2' },
];

export const tasks: Task[] = [
  { id: 't1', siteId: 's1', title: 'Foundation Concrete Pour', description: 'Pour grade 40 concrete for Block A foundation', assignedTo: 'u4', deadline: '2026-03-16', status: 'in_progress', remarks: '', createdAt: '2026-03-10' },
  { id: 't2', siteId: 's1', title: 'Rebar Installation B2', description: 'Install steel rebar for basement level 2', assignedTo: 'u5', deadline: '2026-03-18', status: 'pending', remarks: '', createdAt: '2026-03-11' },
  { id: 't3', siteId: 's2', title: 'Formwork Setup Level 3', description: 'Set up column formwork for level 3', assignedTo: 'u6', deadline: '2026-03-15', status: 'pending', remarks: '', createdAt: '2026-03-09' },
  { id: 't4', siteId: 's1', title: 'Waterproofing Basement', description: 'Apply waterproofing membrane to basement walls', assignedTo: 'u4', deadline: '2026-03-20', status: 'pending', remarks: '', createdAt: '2026-03-12' },
  { id: 't5', siteId: 's2', title: 'Electrical Conduit Routing', description: 'Route electrical conduits for floors 1-3', assignedTo: 'u6', deadline: '2026-03-22', status: 'completed', remarks: 'Completed ahead of schedule', createdAt: '2026-03-05' },
  { id: 't6', siteId: 's3', title: 'Site Clearing', description: 'Clear vegetation and level ground', assignedTo: 'u5', deadline: '2026-03-14', status: 'completed', remarks: '', createdAt: '2026-03-01' },
];

export const inventory: InventoryItem[] = [
  { id: 'i1', itemName: 'Cement (OPC 53)', totalQty: 500, availableQty: 85, minStockLevel: 100, unit: 'bags' },
  { id: 'i2', itemName: 'Steel Rebar 12mm', totalQty: 2000, availableQty: 750, minStockLevel: 500, unit: 'kg' },
  { id: 'i3', itemName: 'Sand (River)', totalQty: 100, availableQty: 45, minStockLevel: 30, unit: 'tons' },
  { id: 'i4', itemName: 'Bricks (Red Clay)', totalQty: 10000, availableQty: 3200, minStockLevel: 2000, unit: 'pcs' },
  { id: 'i5', itemName: 'Plywood 18mm', totalQty: 200, availableQty: 15, minStockLevel: 30, unit: 'sheets' },
  { id: 'i6', itemName: 'PVC Pipe 4"', totalQty: 300, availableQty: 180, minStockLevel: 50, unit: 'pcs' },
];

export const materialUsage: MaterialUsage[] = [
  { id: 'm1', taskId: 't1', inventoryId: 'i1', qtyUsed: 50, recordedBy: 'u4', recordedAt: '2026-03-12' },
  { id: 'm2', taskId: 't1', inventoryId: 'i3', qtyUsed: 10, recordedBy: 'u4', recordedAt: '2026-03-12' },
  { id: 'm3', taskId: 't5', inventoryId: 'i6', qtyUsed: 24, recordedBy: 'u6', recordedAt: '2026-03-08' },
];

// Helper functions
export const getUserById = (id: string) => users.find(u => u.id === id);
export const getSiteById = (id: string) => sites.find(s => s.id === id);
export const getInventoryById = (id: string) => inventory.find(i => i.id === id);
export const getTasksForUser = (userId: string) => tasks.filter(t => t.assignedTo === userId);
export const getTasksForSite = (siteId: string) => tasks.filter(t => t.siteId === siteId);
export const getLowStockItems = () => inventory.filter(i => i.availableQty < i.minStockLevel);
export const getEngineers = () => users.filter(u => u.role === 'engineer');
export const getSupervisors = () => users.filter(u => u.role === 'supervisor');
