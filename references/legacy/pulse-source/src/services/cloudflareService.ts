import axios from 'axios';

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

export class CloudflareService {
  private static async getHeaders() {
    // In a real app, these would come from the backend or secure storage
    // For this applet, we'll assume the backend handles the sensitive parts
    // and the client just calls the proxy routes I'll create later.
    return {
      'Content-Type': 'application/json',
    };
  }

  static async fetchDomains() {
    try {
      const response = await axios.get('/api/cloudflare/zones');
      return response.data.result;
    } catch (error) {
      console.error('Failed to fetch domains:', error);
      throw error;
    }
  }

  static async fetchWorkers() {
    try {
      const response = await axios.get('/api/cloudflare/workers');
      return response.data.result;
    } catch (error) {
      console.error('Failed to fetch workers:', error);
      throw error;
    }
  }

  static async fetchArchives() {
    try {
      const response = await axios.get('/api/archive/list');
      return response.data.archives;
    } catch (error) {
      console.error('Failed to fetch archives:', error);
      throw error;
    }
  }

  static async uploadToArchive(data: any) {
    try {
      const response = await axios.post('/api/metatron/swarm/synthesis', data);
      return response.data;
    } catch (error) {
      console.error('Failed to upload archive:', error);
      throw error;
    }
  }
}
