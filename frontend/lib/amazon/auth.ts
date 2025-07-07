import axios from 'axios';
import { AMAZON_CONFIG } from './config';

export async function getAccessToken(): Promise<string> {
  try {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting delay
    
    const response = await axios.post('https://api.amazon.com/auth/o2/token', {
      grant_type: 'refresh_token',
      refresh_token: AMAZON_CONFIG.REFRESH_TOKEN,
      client_id: AMAZON_CONFIG.CLIENT_ID,
      client_secret: AMAZON_CONFIG.CLIENT_SECRET
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}