interface QueueItem {
  id: string
  trackingId: string
  status?: string
  updateFn: (id: string, trackingId: string) => Promise<void>
}

class TrackingQueue {
  private queue: QueueItem[] = []
  private processing: boolean = false
  private lastProcessedTime: Record<string, number> = {}
  private readonly delay: number = 5000 // 5 seconds between items
  private readonly maxRetries: number = 3
  private processingTimeout: NodeJS.Timeout | null = null
  private retryCount: Record<string, number> = {}
  private activeUpdates: Set<string> = new Set()
  private readonly minUpdateInterval: number = 43200000 // 12 hours (no need to check more frequently)
  private readonly processDelay: number = 1000
  private lastFullUpdate: number = 0
  private readonly fullUpdateInterval: number = 43200000 // 12 hours

  async add(item: QueueItem): Promise<void> {
    // Skip delivered items
    if (this.isDelivered(item.status)) {
      return
    }

    // Skip if already being processed
    if (this.activeUpdates.has(item.id)) {
      return
    }

    // Check if item was recently processed
    const lastProcessed = this.lastProcessedTime[item.id] || 0
    if (Date.now() - lastProcessed < this.minUpdateInterval) {
      return
    }

    // Remove existing queue items for this ID
    this.queue = this.queue.filter(i => i.id !== item.id)
    
    this.queue.push(item)
    
    if (!this.processing) {
      this.process()
    }
  }

  // Add method to check if full update is needed
  shouldDoFullUpdate(): boolean {
    return Date.now() - this.lastFullUpdate >= this.fullUpdateInterval
  }

  // Add method to mark full update as complete  
  markFullUpdateComplete(): void {
    this.lastFullUpdate = Date.now()
  }
  private isDelivered(status?: string): boolean {
    if (!status) return false
    const lowercaseStatus = status.toLowerCase()
    return lowercaseStatus.includes('delivered') ||
           lowercaseStatus.includes('completed') ||
           lowercaseStatus.includes('final delivery')
  }

  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) return
    
    this.processing = true
    const item = this.queue[0]

    try {
      // Skip if delivered
      if (this.isDelivered(item.status)) {
        this.queue.shift()
        this.activeUpdates.delete(item.id)
        return
      }

      this.activeUpdates.add(item.id)
      
      await new Promise(resolve => setTimeout(resolve, this.processDelay))
      
      await item.updateFn(item.id, item.trackingId)
      
      delete this.retryCount[item.id]
      this.lastProcessedTime[item.id] = Date.now()
      this.activeUpdates.delete(item.id)
      
      this.queue.shift()
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      // Only log error message, not the full error object
      console.error(`Tracking update failed for ${item.id}: ${errorMessage}`)
      
      this.activeUpdates.delete(item.id)
      this.retryCount[item.id] = (this.retryCount[item.id] || 0) + 1
      
      // Remove from queue if max retries exceeded
      if (this.retryCount[item.id] >= this.maxRetries) {
        console.error(`Max retries exceeded for ${item.id}, removing from queue`)
        delete this.retryCount[item.id]
      }
      
      this.queue.shift()
    } finally {
      this.processing = false
      
      if (this.queue.length > 0) {
        this.processingTimeout = setTimeout(() => this.process(), this.delay)
      }
    }
  }

  clear(): void {
    this.queue = []
    this.processing = false
    this.retryCount = {}
    this.activeUpdates.clear()
    this.lastProcessedTime = {}
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout)
      this.processingTimeout = null
    }
  }
}

export const trackingQueue = new TrackingQueue()