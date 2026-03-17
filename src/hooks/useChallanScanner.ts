import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { InventoryItem } from '@/hooks/useSupabaseData';

export interface ChallanItem {
  item_name: string;
  matched_inventory_id: string | null;
  matched_inventory_name: string | null;
  quantity: number;
  unit: string;
  rate: number | null;
  amount: number | null;
  // UI state
  selected: boolean;
}

export interface ChallanData {
  challan_no: string | null;
  supplier_name: string | null;
  date: string | null;
  vehicle_no: string | null;
  items: ChallanItem[];
}

export function useChallanScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [challanData, setChallanData] = useState<ChallanData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scanChallan = async (file: File, inventory: InventoryItem[]) => {
    setIsScanning(true);
    setError(null);
    setChallanData(null);

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);
      const mimeType = file.type || 'image/jpeg';

      const existingItems = inventory.map(i => ({
        id: i.id,
        item_name: i.item_name,
        unit: i.unit,
      }));

      const { data, error: fnError } = await supabase.functions.invoke('read-challan', {
        body: { imageBase64: base64, mimeType, existingItems },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to scan challan');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const items: ChallanItem[] = (data.items || []).map((item: any) => ({
        ...item,
        selected: !!item.matched_inventory_id,
      }));

      setChallanData({
        challan_no: data.challan_no || null,
        supplier_name: data.supplier_name || null,
        date: data.date || null,
        vehicle_no: data.vehicle_no || null,
        items,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to scan challan');
    } finally {
      setIsScanning(false);
    }
  };

  const reset = () => {
    setChallanData(null);
    setError(null);
    setIsScanning(false);
  };

  return { scanChallan, isScanning, challanData, setChallanData, error, reset };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove "data:...;base64," prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
