import axios from 'axios';
import { logger } from '../utils/logger';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://167.114.223.83:3007/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Check if order exists with same ASIN
export async function checkOrderExists(
  orderId: string,
  asin?: string
): Promise<{
  exists: boolean;
  hasSameAsin: boolean;
}> {
  try {
    const { data } = await api.get(`/logistics/exists/${orderId}/${asin}`);

    logger.debug('Order check response:', data);

    return {
      exists: data.exists || false,
      hasSameAsin: data.hasSameAsin || false,
    };
  } catch (error) {
    logger.error('Error checking order existence:', error);
    throw new Error('Failed to check order existence');
  }
}

export interface LogisticsEntry {
  id: number;
  purchase_date: string;
  store: string;
  supplier_order_id: string;
  asin: string;
  quantity_sold: number;
  title: string;
  order_id: string;
  latest_ship_date: string;
  order_status: string;
  handling_omd: string;
  dead_line: string | null;
  supplier_tracking_number: string;
  provider: string;
  date_time: string | null;
  current_status: string | null;
  shipping_status: string | null;
  delivered_date: string | null;
  delivery_info: string;
  expected_date: string | null;
  url_carrier: string | null;
  origin_city: string;
  destination_city: string;
  notes: string | null;
  ship_estimate: number;
  received_date: string | null;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

export interface LogisticsResponse {
  data: LogisticsEntry[];
  total: number;
}

export interface LogisticsStats {
  total_entries: number;
  delivered_count: number;
  in_transit_count: number;
  pending_count: number;
  delayed_count: number;
}

export interface LogisticsParams {
  page?: number;
  size?: number;
  search?: string;
  status?: string;
  store?: string;
  dateFrom?: string;
  dateTo?: string;
  hasTracking?: string;
  archived?: boolean;
}

export async function getLogistics(
  params: LogisticsParams
): Promise<LogisticsResponse> {
  try {
    // Determine the correct endpoint based on archived status
    const endpoint = params.archived ? '/logistics/archived' : '/logistics'
    
    // Remove archived from query params since it's in the endpoint path
    const queryParams = {
      ...params,
      archived: undefined
    }
    
    const { data } = await api.get<LogisticsResponse>(endpoint, { params: queryParams })
    return data;
  } catch (error) {
    logger.error('Error fetching logistics:', error);
    throw error;
  }
}

export async function searchLogistics(
  params: Omit<LogisticsParams, 'archived'>
): Promise<LogisticsResponse> {
  try {
    const { data } = await api.get<LogisticsResponse>('/search', { params })
    return data
  } catch (error) {
    logger.error('Error searching logistics:', error)
    throw error
  }
}

export async function createLogisticsEntry(
  entry: Omit<LogisticsEntry, 'id' | 'created_at' | 'updated_at'>
): Promise<LogisticsEntry> {
  logger.info('📥 Received logistics entry request:', entry)
  
  try {
    const validation = await checkOrderExists(entry.order_id, entry.asin)
    logger.info('Order existence check result:', validation)
    
    if (validation.exists) {
      if (validation.hasSameAsin) {
        throw new Error('Order with same ASIN already exists in logistics')
      }
    }

    // Create entry with forced status and null values
    const entryData = {
      ...entry,
      order_status: 'ordered',
      handling_omd: null,
      dead_line: null,
      ship_estimate: 0,
      date_time: null,
      current_status: null,
      shipping_status: null,
      delivered_date: null,
      expected_date: null,
      url_carrier: null,
      notes: entry.notes || null,
    };

    const { data } = await api.post<LogisticsEntry>('/logistics', entryData);
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw error;
  }
}

export async function updateLogistics(
  id: number,
  updates: Partial<LogisticsEntry>
): Promise<LogisticsEntry> {
  try {
    const { data } = await api.put<LogisticsEntry>(`/logistics/${id}`, updates);
    return data;
  } catch (error) {
    console.error('Error updating logistics:', error);
    throw error;
  }
}

export async function deleteLogistics(id: number): Promise<void> {
  try {
    await api.delete(`/logistics/${id}`);
  } catch (error) {
    console.error('Error deleting logistics:', error);
    throw error;
  }
}

export async function archiveLogistics(id: number): Promise<void> {
  try {
    await api.post(`/logistics/${id}/archive`);
  } catch (error) {
    console.error('Error archiving logistics:', error);
    throw error;
  }
}

export async function restoreLogistics(id: number): Promise<void> {
  try {
    await api.post(`/logistics/${id}/restore`);
  } catch (error) {
    console.error('Error restoring logistics:', error);
    throw error;
  }
}

export async function getLogisticsStats(
  params: Omit<LogisticsParams, 'page' | 'size'>
): Promise<LogisticsStats> {
  try {
    const endpoint = params.archived
      ? '/logistics/archived/stats'
      : '/logistics/stats';
    const { data } = await api.get<LogisticsStats>(endpoint, { params });
    return data;
  } catch (error) {
    console.error('Error fetching logistics stats:', error);
    throw error;
  }
}