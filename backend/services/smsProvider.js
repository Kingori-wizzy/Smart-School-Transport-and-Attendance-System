const axios = require('axios');
const config = require('../config/smsConfig');

class SMSProvider {
  constructor() {
    this.providers = [];
    this.setupProviders();
  }

  setupProviders() {
    // Initialize providers based on config
    if (config.smsLeopard.enabled) {
      this.providers.push({
        name: 'smsLeopard',
        send: this.sendViaSMSLeopard.bind(this),
        priority: config.smsLeopard.priority
      });
    }

    if (config.textBee.enabled) {
      this.providers.push({
        name: 'textBee',
        send: this.sendViaTextBee.bind(this),
        priority: config.textBee.priority
      });
    }

    // Sort by priority (lower number = higher priority)
    this.providers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Send SMS through primary provider with fallback
   */
  async sendSMS(phone, message, options = {}) {
    const { 
      maxRetries = config.strategy.maxRetries,
      retryDelay = config.strategy.retryDelay,
      requireDelivery = false
    } = options;

    let lastError = null;
    let attempts = 0;

    // Try each provider in priority order
    for (const provider of this.providers) {
      attempts = 0;
      
      while (attempts < maxRetries) {
        try {
          console.log(`📱 Attempting to send SMS via ${provider.name} (attempt ${attempts + 1})...`);
          
          const result = await provider.send(phone, message);
          
          if (result.success) {
            console.log(`✅ SMS sent successfully via ${provider.name}`);
            return {
              success: true,
              provider: provider.name,
              messageId: result.messageId,
              cost: result.cost || 0,
              attempts: attempts + 1
            };
          }
          
          // If provider returns failure but no exception
          throw new Error(result.error || 'Unknown error');
          
        } catch (error) {
          lastError = error;
          attempts++;
          console.log(`❌ ${provider.name} attempt ${attempts} failed:`, error.message);
          
          if (attempts < maxRetries) {
            await this.sleep(retryDelay * attempts); // Exponential backoff
          }
        }
      }
      
      console.log(`⚠️ ${provider.name} failed after ${maxRetries} attempts, trying next provider...`);
    }

    // All providers failed
    console.error('❌ All SMS providers failed to send message');
    return {
      success: false,
      error: lastError?.message || 'All providers failed',
      attempts
    };
  }

  /**
   * Send via SMSLeopard (Primary - Kenyan provider)
   */
  async sendViaSMSLeopard(phone, message) {
    try {
      // Format phone number (remove 0, add 254)
      const formattedPhone = this.formatPhoneNumber(phone);
      
      const response = await axios.post(
        `${config.smsLeopard.baseUrl}/sms/send`,
        {
          destination: formattedPhone,
          message: message,
          sender_id: config.smsLeopard.senderId,
          schedule_time: null, // Send immediately
          callback_url: process.env.SMS_WEBHOOK_URL // For delivery reports
        },
        {
          headers: {
            'Authorization': `Bearer ${config.smsLeopard.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      if (response.data && response.data.status === 'success') {
        return {
          success: true,
          messageId: response.data.message_id || response.data.id,
          cost: response.data.cost || 0.5, // Approximate cost per SMS in KES
          details: response.data
        };
      } else {
        throw new Error(response.data?.message || 'Unknown error');
      }

    } catch (error) {
      console.error('SMSLeopard error details:', error.response?.data || error.message);
      throw new Error(`SMSLeopard: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Send via TextBee (Fallback - Free)
   */
  async sendViaTextBee(phone, message) {
    try {
      const formattedPhone = this.formatPhoneNumber(phone, 'textbee');
      
      const response = await axios.post(
        `${config.textBee.baseUrl}/gateway/devices/${config.textBee.deviceId}/send-sms`,
        {
          recipients: [formattedPhone],
          message: message,
          priority: 'high',
          schedule: null
        },
        {
          headers: {
            'x-api-key': config.textBee.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      if (response.data && response.data.success) {
        return {
          success: true,
          messageId: response.data.messageId || response.data.id,
          cost: 0, // Free!
          details: response.data
        };
      } else {
        throw new Error(response.data?.error || 'Unknown error');
      }

    } catch (error) {
      console.error('TextBee error details:', error.response?.data || error.message);
      throw new Error(`TextBee: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Format phone number to international format
   */
  formatPhoneNumber(phone, provider = 'smsleopard') {
    // Remove any non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('0')) {
      // 0712345678 -> 254712345678
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('7')) {
      // 712345678 -> 254712345678
      cleaned = '254' + cleaned;
    } else if (cleaned.startsWith('2547')) {
      // Already correct format
      // Do nothing
    } else if (cleaned.startsWith('+254')) {
      // +254712345678 -> 254712345678
      cleaned = cleaned.substring(1);
    }
    
    // Ensure minimum length
    if (cleaned.length < 12) {
      console.warn(`Phone number ${phone} seems too short after formatting`);
    }
    
    return cleaned;
  }

  /**
   * Check provider health
   */
  async checkProviderHealth(providerName) {
    try {
      if (providerName === 'smsLeopard') {
        const response = await axios.get(
          `${config.smsLeopard.baseUrl}/health`,
          {
            headers: {
              'Authorization': `Bearer ${config.smsLeopard.apiKey}`
            },
            timeout: 5000
          }
        );
        return response.status === 200;
      }
      
      if (providerName === 'textBee') {
        const response = await axios.get(
          `${config.textBee.baseUrl}/gateway/devices/${config.textBee.deviceId}/status`,
          {
            headers: {
              'x-api-key': config.textBee.apiKey
            },
            timeout: 5000
          }
        );
        return response.data && response.data.connected;
      }
      
      return false;
    } catch (error) {
      console.error(`${providerName} health check failed:`, error.message);
      return false;
    }
  }

  /**
   * Get provider statistics
   */
  async getStats() {
    const stats = {};
    
    for (const provider of this.providers) {
      try {
        if (provider.name === 'smsLeopard') {
          const response = await axios.get(
            `${config.smsLeopard.baseUrl}/account/balance`,
            {
              headers: {
                'Authorization': `Bearer ${config.smsLeopard.apiKey}`
              }
            }
          );
          stats.smsLeopard = {
            balance: response.data.balance,
            currency: 'KES',
            health: await this.checkProviderHealth('smsLeopard')
          };
        }
        
        if (provider.name === 'textBee') {
          stats.textBee = {
            health: await this.checkProviderHealth('textBee'),
            type: 'free'
          };
        }
      } catch (error) {
        stats[provider.name] = {
          error: error.message,
          health: false
        };
      }
    }
    
    return stats;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new SMSProvider();