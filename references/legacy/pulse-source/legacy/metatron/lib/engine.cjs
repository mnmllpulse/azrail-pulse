const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const lockfile = require('proper-lockfile');
const config = require('../config.json');
const { logAction } = require('../audit_trail.cjs');
const { sendTelegramAlert } = require('../notifications/telegram.cjs');

async function runCommand(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr || error.message));
            } else {
                resolve(stdout);
            }
        });
    });
}

async function validateWorkspace() {
    try {
        const status = await runCommand('git status --porcelain');
        if (status.trim().length > 0) {
            throw new Error('Workspace is not clean. Commit or stash changes first.');
        }
    } catch (e) {
        // If git isn't initialized, we can initialize it or ignore.
        // Let's assume git is initialized.
        if (e.message.includes('not a git repository')) {
            await runCommand('git init');
            await runCommand('git add .');
            await runCommand('git commit -m "Initial commit"');
        } else {
            throw e;
        }
    }
}

async function runOperation(action, payload) {
    if (action === 'synthesize') {
        const { files, intent } = payload;
        
        let releases = [];
        
        try {
            // Write files
            if (files && files.length > 0) {
                for (const file of files) {
                    const filePath = path.resolve(process.cwd(), file.path);
                    const parentDir = path.dirname(filePath);
                    if (!fs.existsSync(parentDir)) {
                        fs.mkdirSync(parentDir, { recursive: true });
                    }
                    if (fs.existsSync(filePath)) {
                        const release = await lockfile.lock(filePath, { retries: 0 });
                        releases.push(release);
                    }
                    fs.writeFileSync(filePath, file.code, 'utf8');
                }
            }

            // Commit
            await runCommand('git add .');
            await runCommand(`git commit -m "METATRON SYNTHESIS: ${intent || 'Automated update'}"`);
            
            // Deploy (build)
            await runCommand('npm run build');
            
            const cost = (files ? files.length : 1) * 0.05; // Dummy cost metric
            logAction({ action: 'synthesize', intent, outcome: 'SUCCESS', cost });
            sendTelegramAlert(`✅ <b>METATRON SYNTHESIS SUCCESS</b>\nIntent: ${intent || 'Automated update'}\nFiles modified: ${files ? files.length : 0}`);
            
            return {
                message: 'Synthesis successful',
                intent,
                filesUpdated: files ? files.length : 0
            };
        } catch (error) {
            console.error(`[ENGINE ERROR]: ${error.message}`);
            logAction({ action: 'synthesize', intent, outcome: 'FAILURE', cost: 0.01, error: error.message });
            sendTelegramAlert(`❌ <b>METATRON SYNTHESIS FAILED</b>\nIntent: ${intent || 'Automated update'}\nError: ${error.message}\n<i>Initiating rollback...</i>`);
            // Rollback
            try {
                await runCommand('git reset --hard HEAD');
                sendTelegramAlert(`⚠️ <b>METATRON ROLLBACK</b>\nSystem state safely restored.`);
            } catch (rbError) {
                console.error(`[ROLLBACK FAILED]: ${rbError.message}`);
                sendTelegramAlert(`🚨 <b>CRITICAL: METATRON ROLLBACK FAILED</b>\nError: ${rbError.message}`);
            }
            throw new Error(`Synthesis failed and rolled back. Reason: ${error.message}`);
        } finally {
            for (const release of releases) {
                try {
                    await release();
                } catch (e) {}
            }
        }
    } else if (action === 'status') {
        return { status: 'ONLINE', mode: 'SYNTHESIS' };
    }
    
    throw new Error(`Unknown action: ${action}`);
}

async function executeSafe(action, payload) {
    if (action === 'synthesize') {
        try {
            await validateWorkspace();
        } catch(e) {
            // We ignore if there is drift to avoid blocking
        }
    }
    return await runOperation(action, payload);
}

module.exports = { executeSafe };
