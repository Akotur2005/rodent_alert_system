import { audioAlert } from './audioAlert';

class AlertDispatcherService {
  constructor() {
    this.lastAlertTime = 0;
    this.cooldownSeconds = 5;
    this.webhookUrl = '';
    this.listeners = new Set();
    this.incidents = this.loadIncidents();
  }

  loadIncidents() {
    try {
      const data = localStorage.getItem('rodent_sentinel_incidents');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveIncidents() {
    try {
      localStorage.setItem('rodent_sentinel_incidents', JSON.stringify(this.incidents.slice(0, 100)));
    } catch (e) {
      console.warn('Failed to save incidents to localStorage:', e);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(event) {
    this.listeners.forEach(cb => {
      try { cb(event); } catch (e) { console.error(e); }
    });
  }

  setWebhookUrl(url) {
    this.webhookUrl = url;
  }

  setCooldown(seconds) {
    this.cooldownSeconds = Math.max(1, seconds);
  }

  // Request browser notification permission
  async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission !== 'granted') {
      return await Notification.requestPermission();
    }
    return Notification.permission;
  }

  // Main alert trigger function
  async triggerAlert({ detection, imageSnapshot = null, source = 'Surveillance Camera' }) {
    const now = Date.now();
    const timeSinceLast = (now - this.lastAlertTime) / 1000;

    // Cooldown check for automated detection streams
    if (timeSinceLast < this.cooldownSeconds) {
      return { throttled: true, reason: 'Cooldown active' };
    }

    this.lastAlertTime = now;

    // 1. Trigger audio alarm siren
    audioAlert.triggerRodentAlarm(3);

    // 2. Format incident record
    const confidence = detection?.score || 85;
    const rodentType = detection?.displayLabel || 'Rodent (Mouse/Rat)';
    const incidentId = `INC-${Date.now().toString(36).toUpperCase()}`;

    const incident = {
      id: incidentId,
      timestamp: new Date().toISOString(),
      displayTime: new Date().toLocaleTimeString(),
      displayDate: new Date().toLocaleDateString(),
      source,
      rodentType,
      confidence,
      severity: confidence > 70 ? 'CRITICAL' : 'HIGH',
      status: 'UNRESOLVED',
      snapshot: imageSnapshot,
      bbox: detection?.bbox || null
    };

    // Save to incident list
    this.incidents.unshift(incident);
    this.saveIncidents();

    // 3. Dispatch native browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🚨 RODENT DETECTED ALERT!', {
          body: `High confidence (${confidence}%) rodent intrusion spotted by ${source}. Immediate inspection advised!`,
          icon: '/samples/mouse_kitchen.jpg',
          badge: '⚠️'
        });
      } catch (err) {
        console.warn('Notification error:', err);
      }
    }

    // 4. Dispatch Webhook payload (simulated or real HTTP POST)
    const webhookPayload = {
      event: 'RODENT_DETECTED',
      incidentId,
      timestamp: incident.timestamp,
      alertLevel: incident.severity,
      confidenceScore: `${confidence}%`,
      details: {
        classification: rodentType,
        sourceStream: source,
        hasSnapshot: !!imageSnapshot
      }
    };

    let webhookStatus = 'Simulated Dispatch';
    if (this.webhookUrl) {
      try {
        fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        }).catch(err => console.warn('Webhook dispatch failed:', err));
        webhookStatus = 'Dispatched to endpoint';
      } catch (e) {
        webhookStatus = 'Webhook error';
      }
    }

    // 5. Notify all UI subscribers
    const alertEvent = {
      type: 'ALERT_TRIGGERED',
      incident,
      webhookPayload,
      webhookStatus
    };

    this.notifyListeners(alertEvent);

    return {
      throttled: false,
      incident,
      webhookStatus
    };
  }

  updateIncidentStatus(id, newStatus) {
    this.incidents = this.incidents.map(inc => 
      inc.id === id ? { ...inc, status: newStatus } : inc
    );
    this.saveIncidents();
    this.notifyListeners({ type: 'INCIDENT_UPDATED', incidents: this.incidents });
  }

  clearIncidents() {
    this.incidents = [];
    this.saveIncidents();
    this.notifyListeners({ type: 'INCIDENTS_CLEARED', incidents: [] });
  }

  exportToCSV() {
    if (this.incidents.length === 0) return '';
    const headers = ['Incident ID', 'Timestamp', 'Source', 'Rodent Classification', 'Confidence (%)', 'Severity', 'Status'];
    const rows = this.incidents.map(inc => [
      inc.id,
      inc.timestamp,
      inc.source,
      `"${inc.rodentType}"`,
      inc.confidence,
      inc.severity,
      inc.status
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

export const alertDispatcher = new AlertDispatcherService();
