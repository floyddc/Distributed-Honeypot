const mqtt = require('mqtt');
const axios = require('axios');
const chalk = require('chalk');
const { io } = require('socket.io-client');

const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883';
const COLLECTOR_URL = process.env.COLLECTOR_URL || 'http://localhost:3000';

const HONEYPOTS = [
  { id: 'node1', port: 3001 },
  { id: 'node2', port: 2222 },
  { id: 'node3', port: 3003 }
];

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  console.log('Starting MQTT heartbeat/collector_status test for multiple honeypots');

  for (const hp of HONEYPOTS) {
    console.log(`\n=== Testing ${hp.id} (port ${hp.port}) ===`);

    const socket = io(COLLECTOR_URL, { reconnection: false });
    await new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error('Socket connect timeout')), 5000);
      socket.on('connect', () => { clearTimeout(t); res(); });
      socket.on('connect_error', err => { clearTimeout(t); rej(err); });
    });

    const statusEvents = [];
    const statusHandler = (data) => {
      if (data && data.honeypotId === hp.id) {
        statusEvents.push(data);
        console.log('Received honeypot_status_change:', data);
      }
    };
    socket.on('honeypot_status_change', statusHandler);

    const client = mqtt.connect(MQTT_URL, { reconnectPeriod: 0 });
    await new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error('MQTT connect timeout')), 5000);
      client.on('connect', () => { clearTimeout(t); res(); });
      client.on('error', err => { clearTimeout(t); rej(err); });
    });
    console.log('Connected to MQTT broker at', MQTT_URL);

    let collectorStatusReceived = false;
    client.subscribe(`honeypot/${hp.id}/collector_status`, { qos: 1 }, (err) => {
      if (err) console.warn('Subscribe error', err.message || err);
    });
    const mqttHandler = (topic, msg) => {
      try {
        const payload = JSON.parse(msg.toString());
        if (topic === `honeypot/${hp.id}/collector_status`) {
          collectorStatusReceived = true;
          console.log('MQTT collector_status received for', hp.id, payload);
        }
      } catch (e) {}
    };
    client.on('message', mqttHandler);

    const statusMsg = { honeypotId: hp.id, status: 'online', port: hp.port, timestamp: new Date().toISOString() };
    const hbMsg = { honeypotId: hp.id, port: hp.port, status: 'online', timestamp: new Date().toISOString() };

    function publishAsync(client, topic, payload, opts) {
      return new Promise((resolve) => {
        client.publish(topic, payload, opts, (err) => resolve(err));
      });
    }

    const publishResults = await Promise.all([
      publishAsync(client, `honeypot/${hp.id}/status`, JSON.stringify(statusMsg), { qos: 1, retain: true }),
      publishAsync(client, `honeypot/${hp.id}/heartbeat`, JSON.stringify(hbMsg), { qos: 1, retain: false })
    ]);

    publishResults.forEach((err) => {
      if (err) console.error('Publish error', err);
    });
    console.log('Published status and heartbeat for', hp.id);

    const deadline = Date.now() + 6000;
    let apiOk = false;
    while (Date.now() < deadline) {
      if (statusEvents.length > 0) {
        apiOk = true; 
        break;
      }

      // Check API
      try {
        const res = await axios.get(`${COLLECTOR_URL}/api/honeypots`);
        const found = res.data.find(h => h.honeypotId === hp.id);
        if (found && found.status === 'online') {
          const lastSeen = new Date(found.lastSeen);
          if (!isNaN(lastSeen.getTime()) && (Date.now() - lastSeen.getTime()) < 15000) {
            apiOk = true;
            console.log('API reports recent lastSeen for', hp.id, found.lastSeen);
            break;
          }
        }
      } catch (e) {
      }

      await wait(300);
    }

    try { client.removeListener('message', mqttHandler); } catch (e) {}
    try { client.end(true); } catch (e) {}
    try { socket.off('honeypot_status_change', statusHandler); } catch (e) {}
    try { socket.disconnect(); } catch (e) {}

    if (!apiOk) {
      console.error(chalk.red(`TEST FAILED for ${hp.id}: Collector did not record heartbeat/status via API or emit status change`));
      if (!collectorStatusReceived) console.error(`Also did not receive collector_status MQTT message for ${hp.id}`);
      process.exit(1);
    }

    console.log(`TEST PASSED for ${hp.id}: heartbeat/status processed`);

    await wait(300);
  }

  console.log(chalk.green('\nALL TESTS PASSED: heartbeat/status processed for all honeypots'));
  process.exit(0);

})();
