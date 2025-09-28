import { useState, useEffect, useCallback } from 'react';

export interface Slot {
  _id?: string;
  date: string;
  time: string;
  duration: number;
  service: string;
}

interface SlotsResponse {
  slots: Slot[];
}

interface UseSlotsReturn {
  slots: Slot[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSlots(): UseSlotsReturn {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/slots', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SlotsResponse = await response.json();
      
      if (!Array.isArray(data.slots)) {
        throw new Error('Invalid response format: slots is not an array');
      }

      setSlots(data.slots);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch slots';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  return { slots, loading, error, refetch: fetchSlots };
}
