const mqtt = require('mqtt');
const Honeypot = require('./models/Honeypot');

module.exports = (io) => {
  const client = mqtt.connect('mqtt://mosquitto:1883', {
    reconnectPeriod: 1000
  });

  client.on('connect', async () => {
    client.subscribe('honeypot/+/#', { qos: 1 });
    console.log('[MQTT] Subscribed honeypot/+/#');

    // Requets nodes to flush buffer
    const flushBufferMessage = { action: 'flush_buffer' };
    client.publish('honeypot/sync', JSON.stringify(flushBufferMessage), { qos: 1, retain: true });
    console.log('[MQTT] Sent flush_buffer command:', flushBufferMessage);

    // Publish collector status (online/offline)
    try {
      const honeypots = await Honeypot.find().select('honeypotId');
      const msg = { collectorStatus: 'online', timestamp: new Date().toISOString() };
      honeypots.forEach(hp => {
        client.publish(`honeypot/${hp.honeypotId}/collector_status`, JSON.stringify(msg), { qos: 1, retain: true });
      });
    } catch (err) {
      console.error('[MQTT] Error publishing initial collector status', err);
    }
  });

  client.on('message', async (topic, message) => {
    let payload;
    try {
      payload = JSON.parse(message.toString());
    } catch {
      return;
    }

    const parts = topic.split('/');
    const honeypotId = parts[1];
    const kind = parts[2];

    if (!honeypotId || !kind) return;

    payload.honeypotId ||= honeypotId;
    console.log(`[MQTT] Received ${kind} from ${honeypotId}`, payload);

    // Manage only status/heartbeat messages
    if (kind === 'status' || kind === 'heartbeat') {
      try {
        await Honeypot.findOneAndUpdate(
          { honeypotId },
          {
            honeypotId,
            status: payload.status || 'online',
            port: payload.port,
            lastSeen: new Date()
          },
          { upsert: true }
        );

        io.emit('honeypot_status_change', {
          honeypotId,
          status: payload.status || 'online',
          port: payload.port,
          timestamp: new Date().toISOString()
        });

        console.log(`[MQTT] Updated honeypot ${honeypotId} status via MQTT`);
      } catch (err) {
        console.error('[MQTT] Error updating honeypot status', err);
      }
    }
  });

  client.on('error', (err) => {
    console.error('[MQTT]', err && err.message ? err.message : err);
  });

  return {
    rawClient: client
  };
};