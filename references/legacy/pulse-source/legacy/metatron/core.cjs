const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { executeSafe } = require('./lib/engine.cjs');
const { getAuditLogs } = require('./audit_trail.cjs');
const config = require('./config.json');

const app = express();
app.use(cors());
app.use(express.json());

// Record daemon boot time
const bootTime = Date.now();

// Helper to format duration in HH:MM:SS
function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// 1. Heartbeat Monitoring Endpoint
app.get('/api/metatron/heartbeat', async (req, res) => {
    const now = Date.now();
    const uptimeMs = now - bootTime;
    
    // Perform quick health checks on core components
    let checks = {
        config: false,
        auditTrail: false,
        engine: false,
        manifest: false
    };

    try {
        if (config && config.port) checks.config = true;
    } catch (e) {}

    try {
        const logs = getAuditLogs();
        if (Array.isArray(logs)) checks.auditTrail = true;
    } catch (e) {}

    try {
        const engineCheck = await executeSafe('status', {});
        if (engineCheck && engineCheck.status === 'ONLINE') checks.engine = true;
    } catch (e) {}

    try {
        const manifestPath = path.join(__dirname, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            if (manifest && manifest.system) checks.manifest = true;
        }
    } catch (e) {}

    const isHealthy = Object.values(checks).every(val => val === true);

    res.json({
        status: isHealthy ? 'ONLINE' : 'DEGRADED',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(uptimeMs / 1000),
        uptimeFormatted: formatDuration(uptimeMs),
        system: {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            pid: process.pid
        },
        resources: {
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
        },
        checks
    });
});

// 2. Centralized Status & Analytics Aggregation Endpoint
app.get('/api/metatron/status', (req, res) => {
    try {
        const logs = getAuditLogs();
        const totalCost = logs.reduce((sum, log) => sum + (log.cost || 0), 0);
        
        // Read manifest info if available
        let manifestInfo = { version: '1.0.0', system: 'METATRON OS', history: [] };
        try {
            const manifestPath = path.join(__dirname, 'manifest.json');
            if (fs.existsSync(manifestPath)) {
                manifestInfo = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            }
        } catch (err) {
            console.error(`[METATRON STATUS WARNING]: Failed to load manifest - ${err.message}`);
        }

        // Calculate advanced aggregation metrics
        const syntheses = logs.filter(log => log.action === 'synthesize');
        const successful = syntheses.filter(log => log.outcome === 'SUCCESS');
        const failed = syntheses.filter(log => log.outcome === 'FAILURE');
        
        const metrics = {
            totalSyntheses: syntheses.length,
            successfulSyntheses: successful.length,
            failedSyntheses: failed.length,
            successRate: syntheses.length > 0 ? parseFloat(((successful.length / syntheses.length) * 100).toFixed(2)) : 100.0,
            averageCost: logs.length > 0 ? parseFloat((totalCost / logs.length).toFixed(4)) : 0,
            lastSynthesis: syntheses.length > 0 ? syntheses[syntheses.length - 1] : null
        };

        // Standard response maintains backwards-compatibility with telemetry widgets
        res.json({
            status: 'ok',
            budgetSpent: parseFloat(totalCost.toFixed(4)),
            logsCount: logs.length,
            uptime: formatDuration(Date.now() - bootTime),
            systemInfo: {
                system: manifestInfo.system || 'METATRON OS',
                version: manifestInfo.version || '1.0.0',
                history: manifestInfo.history || []
            },
            config: {
                port: config.port || 3001,
                telemetry: config.telemetry !== undefined ? config.telemetry : true,
                limits: config.limits || {}
            },
            nodesMatrix: {
                totalNodes: 188,
                rings: {
                    core: 32,
                    middle: 64,
                    outer: 92
                },
                status: 'BALANCED'
            },
            metrics
        });
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

// 3. Command Execution Endpoint
app.post('/api/metatron', async (req, res) => {
    const { action, payload } = req.body;
    
    try {
        const result = await executeSafe(action, payload);
        res.json({ status: 'success', data: result });
    } catch (err) {
        console.error(`[METATRON ERROR]: ${err.message}`);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// 4. Alert / Notifications Dispatcher
app.post('/api/metatron/notify', async (req, res) => {
    const { message } = req.body;
    try {
        const { sendTelegramAlert } = require('./notifications/telegram.cjs');
        await sendTelegramAlert(message);
        res.json({ status: 'success' });
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

const PORT = config.port || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`METATRON CORE IS ONLINE ON PORT ${PORT}`);
});
