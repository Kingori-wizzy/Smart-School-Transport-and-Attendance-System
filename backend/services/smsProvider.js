const axios = require('axios');
const logger = require('../utils/logger');

class SMSProvider {
  constructor() {
    this.providers = [];
    this.setupProviders();
  }

  setupProviders() {
    // SMSLeopard configuration
    const smsLeopardEnabled = process.env.SMSLEOPARD_ENABLED === 'true';
    const smsLeopardApiKey = process.env.SMSLEOPARD_API_KEY;
    const smsLeopardSenderId = process.env.SMSLEOPARD_SENDER_ID || 'SmartSchool';
    const smsLeopardBaseUrl = process.env.SMSLEOPARD_BASE_URL || 'https://api.smsleopard.com/v1';
    const smsLeopardPriority = parseInt(process.env.SMSLEOPARD_PRIORITY) || 1;

    // TextBee configuration
    const textBeeEnabled = process.env.TEXTBEE_ENABLED === 'true';
    const textBeeApiKey = process.env.TEXTBEE_API_KEY;
    const textBeeDeviceId = process.env.TEXTBEE_DEVICE_ID;
    const textBeeBaseUrl = process.env.TEXTBEE_BASE_URL || 'https://api.textbee.dev';
    const textBeePriority = parseInt(process.env.TEXTBEE_PRIORITY) || 2;

    // Add SMSLeopard if enabled and configured
    if (smsLeopardEnabled && smsLeopardApiKey) {
      this.providers.push({
        name: 'smsLeopard',
        send: this.sendViaSMSLeopard.bind(this),
        priority: smsLeopardPriority,
        config: {
          apiKey: smsLeopardApiKey,
          senderId: smsLeopardSenderId,
          baseUrl: smsLeopardBaseUrl
        }
      });
      logger.info('SMSLeopard provider initialized');
    }

    // Add TextBee if enabled and configured
    if (textBeeEnabled && textBeeApiKey && textBeeDeviceId) {
      this.providers.push({
        name: 'textBee',
        send: this.sendViaTextBee.bind(this),
        priority: textBeePriority,
        config: {
          apiKey: textBeeApiKey,
          deviceId: textBeeDeviceId,
          baseUrl: textBeeBaseUrl
        }
      });
      logger.info('TextBee provider initialized');
    }

    // Sort by priority (lower number = higher priority)
    this.providers.sort((a, b) => a.priority - b.priority);

    if (this.providers.length === 0) {
      logger.warn('No SMS providers configured. SMS functionality will be disabled.');
    }
  }

  /**
   * Send SMS through primary provider with fallback
   */
  async sendSMS(phone, message, options = {}) {
    const maxRetries = options.maxRetries || parseInt(process.env.SMS_MAX_RETRIES) || 2;
    const retryDelay = options.retryDelay || parseInt(process.env.SMS_RETRY_DELAY) || 1000;

    let lastError = null;
    let totalAttempts = 0;

    if (this.providers.length === 0) {
      logger.error('No SMS providers configured');
      return {
        success: false,
        error: 'No SMS providers configured',
        phone,
        message
      };
    }

    // Try each provider in priority order
    for (const provider of this.providers) {
      let attempts = 0;
      
      while (attempts < maxRetries) {
        totalAttempts++;
        attempts++;
        
        try {
          logger.info(`Attempting to send SMS via ${provider.name} (attempt ${attempts}/${maxRetries})...`);
          
          const result = await provider.send(phone, message);
          
          if (result.success) {
            logger.info(`SMS sent successfully via ${provider.name}`);
            return {
              success: true,
              provider: provider.name,
              messageId: result.messageId,
              cost: result.cost || 0,
              attempts: totalAttempts,
              phone: result.phone || phone
            };
          }
          
          // If provider returns failure but no exception
          throw new Error(result.error || 'Unknown error');
          
        } catch (error) {
          lastError = error;
          logger.error(`${provider.name} attempt ${attempts} failed:`, error.message);
          
          if (attempts < maxRetries) {
            const delay = retryDelay * attempts;
            logger.debug(`Waiting ${delay}ms before retry...`);
            await this.sleep(delay);
          }
        }
      }
      
      logger.warn(`${provider.name} failed after ${maxRetries} attempts, trying next provider...`);
    }

    // All providers failed
    logger.error('All SMS providers failed to send message');
    return {
      success: false,
      error: lastError?.message || 'All providers failed',
      attempts: totalAttempts,
      phone,
      message
    };
  }

  /**
   * Send via SMSLeopard (Primary - Kenyan provider)
   */
  async sendViaSMSLeopard(phone, message) {
    const provider = this.providers.find(p => p.name === 'smsLeopard');
    if (!provider) {
      throw new Error('SMSLeopard provider not configured');
    }

    const config = provider.config;
    
    try {
      // Format phone number to international format
      const formattedPhone = this.formatPhoneNumber(phone);
      
      logger.debug(`Sending SMS via SMSLeopard to ${formattedPhone}`);
      
      const response = await axios.post(
        `${config.baseUrl}/sms/send`,
        {
          apiKey: config.apiKey,
          to: formattedPhone,
          message: message,
          from: config.senderId
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.data && response.data.success) {
        return {
          success: true,
          messageId: response.data.messageId || response.data.id || `sl_${Date.now()}`,
          cost: response.data.cost || 0.5,
          phone: formattedPhone,
          provider: 'smsLeopard'
        };
      } else {
        throw new Error(response.data?.message || 'Unknown error from SMSLeopard');
      }

    } catch (error) {
      logger.error('SMSLeopard error:', error.response?.data || error.message);
      throw new Error(`SMSLeopard: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Send via TextBee (Fallback - Free)
   */
  async sendViaTextBee(phone, message) {
    const provider = this.providers.find(p => p.name === 'textBee');
    if (!provider) {
      throw new Error('TextBee provider not configured');
    }

    const config = provider.config;
    
    try {
      // Format phone number for TextBee
      const formattedPhone = this.formatPhoneNumber(phone, 'textbee');
      
      logger.debug(`Sending SMS via TextBee to ${formattedPhone}`);
      
      const response = await axios.post(
        `${config.baseUrl}/gateway/devices/${config.deviceId}/send-sms`,
        {
          recipients: [formattedPhone],
          message: message,
          priority: 'normal'
        },
        {
          headers: {
            'x-api-key': config.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      if (response.data && (response.data.success || response.data.status === 'sent')) {
        return {
          success: true,
          messageId: response.data.messageId || response.data.id || `tb_${Date.now()}`,
          cost: 0,
          phone: formattedPhone,
          provider: 'textBee'
        };
      } else {
        throw new Error(response.data?.error || 'Unknown error from TextBee');
      }

    } catch (error) {
      logger.error('TextBee error:', error.response?.data || error.message);
      throw new Error(`TextBee: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Format phone number to international format
   */
  formatPhoneNumber(phone, provider = 'smsleopard') {
    // Remove any non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle different formats for Kenya numbers
    if (cleaned.length === 9) {
      // 712345678 -> 254712345678
      cleaned = '254' + cleaned;
    } else if (cleaned.length === 10 && cleaned.startsWith('0')) {
      // 0712345678 -> 254712345678
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.length === 12 && cleaned.startsWith('254')) {
      // Already correct format
      // Do nothing
    } else if (cleaned.length === 13 && cleaned.startsWith('254')) {
      // Already correct format
      // Do nothing
    } else if (cleaned.startsWith('+254')) {
      // +254712345678 -> 254712345678
      cleaned = cleaned.substring(1);
    } else if (cleaned.length === 12 && !cleaned.startsWith('254')) {
      // Assume it's a 12-digit number that needs 254 prefix
      cleaned = '254' + cleaned;
    }
    
    // Validate minimum length
    if (cleaned.length < 10) {
      logger.warn(`Phone number ${phone} seems too short after formatting: ${cleaned}`);
    }
    
    return cleaned;
  }

  /**
   * Check provider health
   */
  async checkProviderHealth(providerName) {
    try {
      if (providerName === 'smsLeopard') {
        const provider = this.providers.find(p => p.name === 'smsLeopard');
        if (!provider) return false;
        
        const response = await axios.get(
          `${provider.config.baseUrl}/account/balance`,
          {
            headers: {
              'Authorization': `Bearer ${provider.config.apiKey}`
            },
            timeout: 5000
          }
        );
        return response.status === 200 && response.data !== null;
      }
      
      if (providerName === 'textBee') {
        const provider = this.providers.find(p => p.name === 'textBee');
        if (!provider) return false;
        
        const response = await axios.get(
          `${provider.config.baseUrl}/gateway/devices/${provider.config.deviceId}/status`,
          {
            headers: {
              'x-api-key': provider.config.apiKey
            },
            timeout: 5000
          }
        );
        return response.data && (response.data.connected || response.data.status === 'online');
      }
      
      return false;
    } catch (error) {
      logger.error(`${providerName} health check failed:`, error.message);
      return false;
    }
  }

  /**
   * Get provider balance
   */
  async getProviderBalance(providerName) {
    try {
      if (providerName === 'smsLeopard') {
        const provider = this.providers.find(p => p.name === 'smsLeopard');
        if (!provider) return null;
        
        const response = await axios.get(
          `${provider.config.baseUrl}/account/balance`,
          {
            headers: {
              'Authorization': `Bearer ${provider.config.apiKey}`
            },
            timeout: 10000
          }
        );
        
        return {
          balance: response.data.balance || response.data.credits || 0,
          currency: response.data.currency || 'KES',
          provider: 'smsLeopard'
        };
      }
      
      if (providerName === 'textBee') {
        return {
          balance: 'Free',
          currency: 'N/A',
          type: 'free',
          limit: '100 SMS/day',
          provider: 'textBee'
        };
      }
      
      return null;
    } catch (error) {
      logger.error(`Error fetching ${providerName} balance:`, error.message);
      return {
        error: error.message,
        provider: providerName
      };
    }
  }

  /**
   * Get provider statistics
   */
  async getStats() {
    const stats = {};
    
    for (const provider of this.providers) {
      try {
        const health = await this.checkProviderHealth(provider.name);
        
        if (provider.name === 'smsLeopard') {
          const balance = await this.getProviderBalance('smsLeopard');
          stats.smsLeopard = {
            health: health,
            enabled: true,
            priority: provider.priority,
            ...(balance && !balance.error ? { balance: balance.balance } : {}),
            ...(balance && balance.error ? { error: balance.error } : {})
          };
        }
        
        if (provider.name === 'textBee') {
          stats.textBee = {
            health: health,
            enabled: true,
            priority: provider.priority,
            type: 'free'
          };
        }
      } catch (error) {
        stats[provider.name] = {
          error: error.message,
          health: false,
          enabled: true
        };
      }
    }
    
    return stats;
  }

  /**
   * Send bulk SMS to multiple recipients
   */
  async sendBulkSMS(recipients, message, options = {}) {
    const results = [];
    const maxBatchSize = options.batchSize || 50;
    
    for (let i = 0; i < recipients.length; i += maxBatchSize) {
      const batch = recipients.slice(i, i + maxBatchSize);
      const batchPromises = batch.map(recipient => 
        this.sendSMS(recipient.phone, message, options)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : r.reason));
      
      // Small delay between batches to avoid rate limiting
      if (i + maxBatchSize < recipients.length) {
        await this.sleep(500);
      }
    }
    
    const summary = {
      total: recipients.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results
    };
    
    return summary;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new SMSProvider();