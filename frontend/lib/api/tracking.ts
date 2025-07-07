"use client"

import axios from 'axios'

interface TrackingLocation {
  city: string
  state: string
  country?: string
  zip?: string
}

interface TrackingUpdate {
  date_time: string
  location: TrackingLocation
  status: string
  delivered: boolean
}

interface TrackingResponse {
  response: {
    provider: string
    package_responses: Array<{
      tracking_number: string
      updates: TrackingUpdate[]
      expected: {
        delivery?: string
        expected?: string
      }
      url: string
      origin?: {
        location: TrackingLocation
      }
      destination?: {
        location: TrackingLocation
      }
    }>
  }
}

const TRACKING_API_KEY = "zZ3YlMlswd5ZjeA1YYOkKYdlW"

export async function getTrackingInfo(trackingNumber: string) {
  if (!trackingNumber?.trim()) {
    return {
      provider: '',
      dateTime: null,
      currentStatus: '',
      shippingStatus: '',
      delivered: false,
      deliveryInfo: '',
      expectedDate: null,
      urlCarrier: null,
      originCity: '',
      destinationCity: ''
    }
  }
  
  console.log('🔍 Fetching tracking info for:', trackingNumber)

  try {
    const url = `https://hellopackage.app/api/package?number=${trackingNumber}&type=excel&key=${TRACKING_API_KEY}&history=true`
    console.log('📡 API Request URL:', url)
    
    const { data } = await axios.get<TrackingResponse>(url)
    console.log('📦 Raw API Response:', JSON.stringify(data, null, 2))
    
    const packageResponse = data?.response?.package_responses?.[0]
    if (!packageResponse || !packageResponse.updates?.length) {
      return {
        provider: 'Unknown',
        dateTime: null,
        currentStatus: 'Pending',
        shipping_status: 'pending',
        delivered: false,
        deliveryInfo: 'No tracking information available',
        expectedDate: null,
        urlCarrier: null,
        originCity: 'Unknown',
        destinationCity: 'Unknown'
      }
    }

    const latestUpdate = packageResponse.updates[0]

    // Keep original shipping status from API
    const shipping_status = latestUpdate.delivered ? 'delivered' : 'pending'

    const trackingInfo = {
      provider: data.response.provider,
      dateTime: latestUpdate.date_time,
      currentStatus: latestUpdate.status,
      shipping_status,
      delivered: latestUpdate.delivered,
      deliveryInfo: latestUpdate.location.city,
      expectedDate: packageResponse.expected?.expected || null,
      urlCarrier: packageResponse.url,
      originCity: packageResponse.origin?.location?.city || '',
      destinationCity: packageResponse.destination?.location?.city || ''
    }

    console.log('✅ Processed tracking info:', trackingInfo)
    return trackingInfo
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tracking information'
    console.error('❌ Error fetching tracking info:', errorMessage)
    
    if (axios.isAxiosError(error)) {
      console.error('🌐 API Error Details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      })
      
      if (error.response?.status === 404) {
        throw new Error('Tracking number not found')
      }
      
      if (error.response?.status === 429) {
        throw new Error('Too many requests. Please try again later.')
      }
    }
    throw new Error(errorMessage)
  }
}