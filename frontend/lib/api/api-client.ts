import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://167.114.223.83:3007/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})