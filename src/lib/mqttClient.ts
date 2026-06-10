import mqtt, { MqttClient } from 'mqtt';
import { SensorSnapshot, AlertLevel, SensorParameters } from '@/types/system';

interface MqttSensorData {
  timestamp: string;
  temperatureC: number;
  firePercent: number;
  smokePercent?: number;
  pressureBar: number;
  flowRateLpm: number;
  waterLevelPercent: number;
  alertLevel?: AlertLevel;
}

class MqttSensorClient {
  private client: MqttClient | null = null;
  private latestSensorData: MqttSensorData | null = null;
  private connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private parameters: SensorParameters | null = null;

  /**
   * Initialize MQTT connection
   * Environment variables:
   * - MQTT_BROKER_URL: mqtt://broker.com:1883 or mqtts://broker.com:8883 (required)
   * - MQTT_USERNAME: Username for authentication (optional)
   * - MQTT_PASSWORD: Password for authentication (optional)
   */
  connect(parameters?: SensorParameters) {
    const brokerUrl = process.env.MQTT_BROKER_URL;
    const username = process.env.MQTT_USERNAME;
    const password = process.env.MQTT_PASSWORD;
    
    if (!brokerUrl) {
      console.log('[MQTT] MQTT_BROKER_URL not configured, MQTT disabled');
      return;
    }

    if (this.client) {
      console.log('[MQTT] Already connecting or connected');
      return;
    }

    try {
      this.parameters = parameters || null;
      
      const connectOptions: any = {
        clientId: `hydrant-system-${Date.now()}`,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 10000,
      };

      // Add credentials if provided
      if (username) {
        connectOptions.username = username;
        console.log(`[MQTT] Using authentication (username: ${username})`);
      }
      if (password) {
        connectOptions.password = password;
      }
      
      this.client = mqtt.connect(brokerUrl, connectOptions);

      this.client.on('connect', () => {
        console.log('[MQTT] ✓ Successfully connected to broker:', brokerUrl);
        this.connected = true;
        this.reconnectAttempts = 0;
        console.log('[MQTT] Connection verified, subscribing to topics...');
        this.subscribeToSensors();
      });

      this.client.on('message', (topic: string, message: Buffer) => {
        console.log(`[MQTT] ✓ Message received on topic: ${topic}`);
        this.handleMessage(topic, message);
      });

      this.client.on('disconnect', () => {
        console.log('[MQTT] ⚠ Disconnected from broker');
        this.connected = false;
      });

      this.client.on('error', (error) => {
        console.error('[MQTT] ✗ Connection error:', error);
        this.connected = false;
      });

      this.client.on('reconnect', () => {
        this.reconnectAttempts++;
        console.log(`[MQTT] ↻ Attempting reconnect #${this.reconnectAttempts}...`);
      });
    } catch (error) {
      console.error('[MQTT] ✗ Failed to initialize MQTT client:', error);
      this.client = null;
    }
  }

  /**
   * Subscribe to sensor data topics
   * Topics: hydrant/sensor/01, hydrant/sensor/data, hydrant/status, hydrant/alert, etc.
   * 
   * Supported MQTT formats:
   * - HiveMQ: {flame_raw, flame_pct, gas_raw, smoke_pct, temp, water, fire, relay, ...}
   * - Standard: {temperatureC, firePercent, pressureBar, flowRateLpm, waterLevelPercent}
   */
  private subscribeToSensors() {
    if (!this.client || !this.connected) {
      console.log('[MQTT] ⚠ Client not connected, cannot subscribe');
      return;
    }

    const topics = [
      'hydrant/sensor/#',       // Subscribe to all sensor subtopics
      'hydrant/sensor/01',      // HiveMQ numbered sensor
      'hydrant/sensor/data',    // Standard format
      'hydrant/status',         // System status
      'hydrant/alert',          // Alert level
    ];

    this.client.subscribe(topics, (err) => {
      if (err) {
        console.error('[MQTT] ✗ Subscription error:', err);
      } else {
        console.log('[MQTT] ✓ Subscribed to topics:', topics);
      }
    });
  }

  /**
   * Handle incoming MQTT messages
   * Expected formats:
   * - hydrant/sensor/data: {temperatureC, firePercent, pressureBar, flowRateLpm, waterLevelPercent, timestamp}
   * - HiveMQ sensor: {flame_pct, smoke_pct, temp, water, fire, fire_warn, fire_crit, ...}
   */
  private handleMessage(topic: string, message: Buffer) {
    try {
      let messageText = message.toString();
      
      // Sanitize NaN and Infinity values before JSON parsing
      const hasNaN = messageText.includes('nan') || messageText.includes('NaN');
      const hasInf = messageText.includes('Infinity');
      
      if (hasNaN || hasInf) {
        console.log('[MQTT] ⚠ Sanitizing invalid JSON values (NaN/Infinity) from topic:', topic);
        messageText = messageText.replace(/:\s*nan/gi, ': 0');
        messageText = messageText.replace(/:\s*Infinity/gi, ': 999999');
        messageText = messageText.replace(/:\s*-Infinity/gi, ': -999999');
      }
      
      const payload = JSON.parse(messageText);
      
      console.log(`[MQTT] ✓ Message received on topic: ${topic}`, payload);
      
      // Check if this is a complete sensor snapshot (standard format)
      if (topic === 'hydrant/sensor/data' || topic === 'hydrant/sensor') {
        if (payload.temperatureC !== undefined && payload.firePercent !== undefined) {
          this.latestSensorData = {
            timestamp: payload.timestamp || new Date().toISOString(),
            temperatureC: payload.temperatureC,
            firePercent: payload.firePercent,
            smokePercent: payload.smokePercent,
            pressureBar: payload.pressureBar ?? (payload.smokePercent !== undefined ? payload.smokePercent / 100 : undefined) ?? 4,
            flowRateLpm: payload.flowRateLpm ?? 0,
            waterLevelPercent: payload.waterLevelPercent ?? 100,
            alertLevel: payload.alertLevel,
          };
          console.log('[MQTT] ✓ Updated from standard format:', this.latestSensorData);
          return;
        }
      }
      
      // Handle HiveMQ sensor format: {flame_pct, smoke_pct, temp, water, fire, ...}
      if (payload.flame_pct !== undefined || payload.smoke_pct !== undefined || payload.temp !== undefined) {
        this.latestSensorData = {
          timestamp: payload.timestamp || new Date().toISOString(),
          temperatureC: payload.temp ?? 31,
          firePercent: payload.flame_pct ?? 10,
          pressureBar: (payload.smoke_pct ?? 0) / 100,  // Convert percentage to 0-1 range
          flowRateLpm: payload.relay ? 120 : 0,  // Use relay status to infer flow
          waterLevelPercent: payload.water ? 100 : 0,  // Water level based on water sensor
          alertLevel: payload.fire_crit ? 'KEBAKARAN' : (payload.fire_warn ? 'POTENSI_KEBAKARAN' : 'NORMAL'),
        };
        console.log('[MQTT] ✓ Updated from HiveMQ format:', this.latestSensorData);
        return;
      }
      
      // Fallback to individual sensor handling
      if (!this.latestSensorData) {
        this.latestSensorData = {
          timestamp: new Date().toISOString(),
          temperatureC: 31,
          firePercent: 10,
          pressureBar: 4,
          flowRateLpm: 0,
          waterLevelPercent: 100,
        };
      }

      // Parse individual sensor values from subtopics
      if (topic.includes('temperature')) {
        this.latestSensorData.temperatureC = payload.value ?? payload;
      } else if (topic.includes('fire') || topic.includes('flame')) {
        this.latestSensorData.firePercent = payload.value ?? payload;
      } else if (topic.includes('smoke') || topic.includes('gas')) {
        this.latestSensorData.pressureBar = (payload.value ?? payload) / 100;
      } else if (topic.includes('pressure')) {
        this.latestSensorData.pressureBar = payload.value ?? payload;
      } else if (topic.includes('water')) {
        this.latestSensorData.waterLevelPercent = payload.value ?? payload;
      } else if (topic.includes('flow')) {
        this.latestSensorData.flowRateLpm = payload.value ?? payload;
      } else if (topic.includes('alert')) {
        this.latestSensorData.alertLevel = payload.level ?? payload;
      }

      // Always update timestamp
      this.latestSensorData.timestamp = payload.timestamp || new Date().toISOString();

      console.log(`[MQTT] Updated sensor data after parsing topic "${topic}":`, this.latestSensorData);
    } catch (error) {
      console.error(`[MQTT] Failed to parse message from ${topic}:`, error);
    }
  }

  /**
   * Get latest sensor data from MQTT
   * Returns null if no data received yet
   */
  getLatestSensorData(): MqttSensorData | null {
    if (this.latestSensorData) {
      console.log('[MQTT] Returning sensor data:', this.latestSensorData);
    } else {
      console.log('[MQTT] No sensor data available yet');
    }
    return this.latestSensorData;
  }

  /**
   * Check if MQTT is connected
   */
  isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  /**
   * Disconnect MQTT client
   */
  disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.connected = false;
      console.log('[MQTT] Disconnected');
    }
  }
}

// Singleton instance
const globalForMqtt = globalThis as unknown as {
  mqttClient?: MqttSensorClient;
};

if (!globalForMqtt.mqttClient) {
  globalForMqtt.mqttClient = new MqttSensorClient();
}

export const mqttClient = globalForMqtt.mqttClient;

/**
 * Initialize MQTT on server startup
 * Call this from your main service initialization
 */
export function initializeMqtt(parameters?: SensorParameters) {
  if (process.env.MQTT_BROKER_URL) {
    mqttClient.connect(parameters);
  }
}
