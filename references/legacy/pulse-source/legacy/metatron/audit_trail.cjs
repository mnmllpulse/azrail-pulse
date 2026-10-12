const fs = require('fs');
const path = require('path');

const AUDIT_FILE = path.join(__dirname, 'audit_log.json');

function initializeAuditLog() {
    if (!fs.existsSync(AUDIT_FILE)) {
        fs.writeFileSync(AUDIT_FILE, JSON.stringify([]), 'utf8');
    }
}

function logAction({ action, intent, outcome, cost, error = null }) {
    initializeAuditLog();
    
    try {
        const logContent = fs.readFileSync(AUDIT_FILE, 'utf8');
        const logs = JSON.parse(logContent);
        
        const entry = {
            timestamp: new Date().toISOString(),
            action,
            intent,
            outcome,
            cost: cost || 0,
            error: error ? error.toString() : null
        };
        
        logs.push(entry);
        fs.writeFileSync(AUDIT_FILE, JSON.stringify(logs, null, 2), 'utf8');
    } catch (err) {
        console.error(`[AUDIT TRAIL ERROR]: Failed to write log - ${err.message}`);
    }
}

function getAuditLogs() {
    initializeAuditLog();
    try {
        const logContent = fs.readFileSync(AUDIT_FILE, 'utf8');
        return JSON.parse(logContent);
    } catch (err) {
        console.error(`[AUDIT TRAIL ERROR]: Failed to read logs - ${err.message}`);
        return [];
    }
}

module.exports = { logAction, getAuditLogs };
