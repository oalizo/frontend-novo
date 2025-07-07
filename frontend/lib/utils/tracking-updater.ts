import { getLogistics, updateLogistics, type LogisticsEntry } from "@/lib/api/logistics"
import { getTrackingInfo } from "@/lib/api/tracking"
import { logger } from "./logger"
import { determineLogisticsStatus } from "@/lib/constants/logistics-statuses"
import { toast } from "@/components/ui/use-toast"

// Configuration
const BATCH_SIZE = 20 // Process 20 entries at a time
const DELAY_BETWEEN_BATCHES = 5000 // 5 second delay between batches
const UPDATE_INTERVAL = 15 * 60 * 1000 // Run every 15 minutes
const MAX_RETRIES = 3 // Maximum number of retries for failed updates

let isUpdating = false
let lastUpdateTime: number | null = null

interface UpdateStats {
  total: number
  updated: number
  failed: number
  skipped: number
}

async function processEntry(entry: LogisticsEntry): Promise<boolean> {
  try {
    // Skip conditions
    if (!entry.supplier_tracking_number) {
      logger.debug(`Skipping entry ${entry.id} - No tracking number`);
      return false;
    }
    
    if (entry.shipping_status === 'delivered') {
      logger.debug(`Skipping entry ${entry.id} - Already delivered`);
      return false;
    }

    const trackingInfo = await getTrackingInfo(entry.supplier_tracking_number);
    
    const updates = {
      provider: trackingInfo.provider,
      date_time: trackingInfo.dateTime,
      current_status: trackingInfo.currentStatus,
      shipping_status: trackingInfo.shippingStatus,
      delivered_date: trackingInfo.delivered ? trackingInfo.dateTime : null,
      delivery_info: trackingInfo.deliveryInfo,
      expected_date: trackingInfo.expectedDate,
      url_carrier: trackingInfo.urlCarrier,
      origin_city: trackingInfo.originCity,
      destination_city: trackingInfo.destinationCity
    };

    // Update shipping status based on tracking info
    updates.shipping_status = determineLogisticsStatus(
      trackingInfo.currentStatus,
      entry.latest_ship_date,
      trackingInfo.delivered ? trackingInfo.dateTime : null
    );

    await updateLogistics(entry.id, updates);
    logger.info(`✅ Updated tracking for entry ${entry.id}`);
    return true;
  } catch (error) {
    logger.error(`❌ Error updating entry ${entry.id}:`, error);
    return false;
  }
}

export async function updateAllTrackingNumbers(): Promise<UpdateStats> {
  const stats: UpdateStats = { total: 0, updated: 0, failed: 0, skipped: 0 };
  let page = 1;
  let hasMore = true;
  
  if (isUpdating) {
    logger.info('Update already in progress, skipping...');
    return stats;
  }

  try {
    logger.info('🔄 Starting batch tracking update...');
    isUpdating = true;
    
    while (hasMore) {
      const response = await getLogistics({
        page,
        size: BATCH_SIZE,
        status: 'ordered,to_inventory'
      });

      if (!response?.data?.length) {
        hasMore = false;
        break;
      }

      const entries = response.data.filter(entry => 
        entry.supplier_tracking_number && 
        !entry.shipping_status?.includes('delivered')
      );

      stats.total += entries.length;

      if (entries.length > 0) {
        logger.info(`📦 Processing batch ${page} with ${entries.length} entries`);

        for (const entry of entries) {
          try {
            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
              try {
                const success = await processEntry(entry);
                if (success) {
                  stats.updated++;
                  break;
                } else {
                  stats.skipped++;
                  break;
                }
              } catch (error) {
                if (attempt === MAX_RETRIES) {
                  throw error;
                }
                logger.warn(`⚠️ Retry ${attempt}/${MAX_RETRIES} for entry ${entry.id}`);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              }
            }
          } catch (error) {
            logger.error(`❌ Failed to process entry ${entry.id}:`, error);
            stats.failed++;
          }
        }
      }

      // Move to next page if we have more entries
      if (response.data.length === BATCH_SIZE) {
        page++;
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
      } else {
        hasMore = false;
      }
    }

    logger.info('✨ Batch tracking update completed', stats);
    lastUpdateTime = Date.now();
    return stats;
  } catch (error) {
    logger.error('❌ Error in batch tracking update:', error);
    throw error;
  }
}

let updateInterval: NodeJS.Timeout | null = null;

export function startAutomaticTrackingUpdates() {
  // Clear any existing interval
  if (updateInterval) {
    clearInterval(updateInterval);
  }

  const runUpdate = async () => {
    // Skip if update is in progress
    if (isUpdating) {
      return;
    }

    // Skip if last update was too recent (within last 5 minutes)
    if (lastUpdateTime && Date.now() - lastUpdateTime < 5 * 60 * 1000) {
      return;
    }

    try {
      logger.info('🚀 Starting tracking update...');
      toast({
        title: "Updating Tracking Numbers",
        description: "Background update started..."
      });

      await updateAllTrackingNumbers();
      
      toast({
        title: "Update Complete",
        description: "Tracking numbers have been updated"
      });
    } catch (error) {
      logger.error('❌ Update failed:', error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to update tracking numbers"
      });
    }
  };

  // Run initial update immediately
  runUpdate();

  // Set up interval for recurring updates
  updateInterval = setInterval(runUpdate, UPDATE_INTERVAL);
}