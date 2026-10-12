import dotenv from "dotenv";
dotenv.config();
import express from "express";
import type { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel, GenerateVideosOperation, Modality } from "@google/genai";
import { WebSocketServer } from "ws";
import axios from "axios";
import { telegramRoutes } from "./server/telegram-bots";
import { checkDailyLimit, updateUserPlan, resetUserLimit } from "./server/rate-limiter";
import Stripe from "stripe";
import { AzrailMemoryCore } from "./server/memory-core";
import { AnticipatoryCore } from "./server/anticipatory";
import { scanProjectStructure, runSwarmSynthesis, cfSim } from "./server/aeon-engine";
import helmet from "helmet";
import cors from "cors";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { exec, spawn } from "child_process";
import fs from "fs";
import { parseALS } from "./server/als-parser";
// @ts-ignore
import lockfile from "proper-lockfile";
// @ts-ignore
import madge from "madge";
import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  const PORT = 3000;
  const memoryCore = new AzrailMemoryCore();
  const anticipatory = new AnticipatoryCore();

  // Spawn METATRON CORE daemon on port 3001
  const bridgeDaemon = spawn("node", ["metatron/core.cjs"], {
    stdio: "inherit",
    env: { ...process.env, PORT: "3001" }
  });

  bridgeDaemon.on("error", (err) => {
    console.error("[METATRON CORE ERROR]: Failed to start daemon:", err);
  });

  // AEON Prime state variables
  let bridgeConnected = true;
  let budgetSpent = 14.25;
  const hardBudgetLimit = 100.00;
  let approvalRequired = true;
  
  // 1. Security & Middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com", "https://js.stripe.com", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https://*"],
        connectSrc: ["'self'", "https://*", "wss://*"],
        frameSrc: ["'self'", "https://js.stripe.com"],
        frameAncestors: ["*"], // Allow iframe embedding
      },
    },
    frameguard: false, // Disable X-Frame-Options: SAMEORIGIN
  }));
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Rate Limiting (1000 req / 15 min per IP)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { error: "Too many requests from this IP, please try again later." },
    validate: false
  });
  app.use("/api/", limiter);

  const checkLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.body.userId as string) || req.ip || 'anonymous';
    const { allowed, remaining, plan } = checkDailyLimit(userId);
    if (!allowed) {
      return res.status(429).json({ 
        error: "Daily generation limit reached", 
        remaining, 
        plan,
        message: "Please upgrade to Pro for unlimited generations."
      });
    }
    next();
  };

  // Helper to map Gemini model names to valid modern ones
  function mapModelName(model: string | undefined): string {
    if (!model) return "gemini-3.5-flash";
    const name = model.toLowerCase();
    if (name.includes("lite") || name.includes("gemini-3.1-flash-lite")) {
      return "gemini-3.1-flash-lite";
    }
    if (name.includes("gemini-3.5-flash") || name.includes("flash-3.5") || name.includes("3.5-flash")) {
      return "gemini-3.5-flash";
    }
    if (name.includes("gemini-3.1-pro") || name.includes("pro-preview") || name.includes("gemini-pro")) {
      return "gemini-3.5-flash"; // Fallback to 3.5-flash because 3.1-pro has 0 quota on free tier
    }
    if (name.includes("flash")) {
      return "gemini-3.5-flash";
    }
    return "gemini-3.5-flash";
  }

  function mapImageModelName(model: string | undefined): string {
    if (!model) return "gemini-3.1-flash-lite-image";
    const name = model.toLowerCase();
    if (name.includes("pro") || name.includes("gemini-3-pro-image")) {
      return "gemini-3-pro-image";
    }
    if (name.includes("flash") || name.includes("gemini-3.1-flash-image")) {
      return "gemini-3.1-flash-image";
    }
    return "gemini-3.1-flash-lite-image";
  }

  // Schema Validation
  const ChatSchema = z.object({
    userId: z.string().min(1),
    message: z.string().min(1).max(100000),
    systemPrompt: z.string().optional(),
    model: z.string().optional(),
  });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: "2025-02-24.acacia"
  } as any);

  // Stripe Webhook Endpoint (Must be before express.json)
  app.post("/api/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );
      
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;
        const userId = session.client_reference_id || session.metadata?.userId;
        const tierName = session.metadata?.tierName;
        
        if (userId && tierName) {
          console.log(`[STRIPE WEBHOOK] Provisioning ${tierName} for user ${userId}`);
          updateUserPlan(userId, tierName);
          resetUserLimit(userId);
        }
      }
      
      res.send();
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  // Middleware for JSON parsing
  app.use(express.json());

  // Telegram Bots API endpoints
  app.get("/api/telegram-bots", telegramRoutes.getBots);
  app.get("/api/telegram-bots/logs", telegramRoutes.getLogs);
  app.get("/api/telegram-bots/:botId", telegramRoutes.getBotById);
  app.post("/api/telegram-bots/:botId/message", telegramRoutes.postMessage);
  app.post("/api/telegram-bots/:botId/launch", telegramRoutes.postLaunchWebApp);

  // User Status & Limits Endpoint
  app.get("/api/user-status", (req, res) => {
    const userId = (req.query.userId as string) || req.ip || 'anonymous';
    const status = checkDailyLimit(userId);
    res.json(status);
  });

  // Stripe Checkout Endpoint
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { tierName, price, billingCycle, userId } = req.body;
      const userIp = req.ip || 'anonymous';
      const finalUserId = userId || userIp;

      // Handle Free plan separately (upgrade to Free is just a reset)
      if (price === "$0") {
        updateUserPlan(finalUserId, 'Free');
        resetUserLimit(finalUserId);
        return res.json({ success: true, message: "Downgraded to Free" });
      }

      if (!process.env.STRIPE_SECRET_KEY) {
        // Simulation for development if no key
        console.log(`[STRIPE SIMULATION] Upgrading ${finalUserId} to ${tierName}`);
        updateUserPlan(finalUserId, tierName);
        resetUserLimit(finalUserId);
        return res.json({ id: 'sim_123', url: '/studio/billing?success=true' });
      }
      
      if (!tierName || !price) {
        return res.status(400).json({ error: "Missing required checkout parameters" });
      }

      let unitAmount = 0;
      if (typeof price === 'string' && price.startsWith('$')) {
        unitAmount = parseInt(price.replace('$', '')) * 100;
      }
      
      if (billingCycle === 'yearly' && price !== "$999/yr") {
        unitAmount = Math.floor(unitAmount * 0.8) * 12; // 20% off for 12 months
      }

      if (unitAmount <= 0) {
        return res.status(400).json({ error: "Invalid price calculation" });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Dark Mnmll Pulse OS - ${tierName}`,
                description: `${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} access`,
              },
              unit_amount: unitAmount,
              recurring: {
                interval: billingCycle === 'yearly' ? 'year' : 'month',
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.APP_URL || `http://localhost:${PORT}`}/studio/billing?checkout=success`,
        cancel_url: `${process.env.APP_URL || `http://localhost:${PORT}`}/studio/billing?checkout=canceled`,
        client_reference_id: finalUserId,
        metadata: {
          userId: finalUserId,
          tierName: tierName
        }
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===================================================
  // ADMIN PROTECTED ENDPOINTS
  // ===================================================
  const adminAuth = (req: Request, res: Response, next: NextFunction) => {
    // Basic mock protection
    if (req.headers['x-admin-token'] !== 'mnmllpulse-secure-key') {
      return res.status(403).json({ error: "Access Denied" });
    }
    next();
  };

  app.get("/api/admin/diagnostics", adminAuth, (req, res) => {
    res.json({
        systemLoad: Math.random() * 100,
        memoryUsage: Math.random() * 100,
        activeProcesses: 42
    });
  });

  app.get("/api/admin/users", adminAuth, (req, res) => {
    res.json([{ id: '1', username: 'mnmllpulse', role: 'admin' }, { id: '2', username: 'user1', role: 'user' }]);
  });

  app.post("/api/admin/config/toggle", adminAuth, (req, res) => {
    const { flag, enabled } = req.body;
    res.json({ status: "ok", message: `Flag ${flag} set to ${enabled}` });
  });

  // ===================================================
  // AEON // UI_FORGE AUTONOMOUS BACKEND ENDPOINTS
  // ===================================================

  // 1. Perception Layer - Scan Project Structure
  app.get("/api/scan-project", (req, res) => {
    try {
      const index = scanProjectStructure();
      res.json({ status: "ok", project_index: index });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Swarm Synthesis - Enqueue & Process job (Master Worker Core)
  app.post("/api/swarm/enqueue", async (req, res) => {
    try {
      const { type, mode, agentId, models, prompt, feedback } = req.body;
      
      if (!agentId || !models || !prompt) {
        return res.status(400).json({ error: "Missing required parameters: agentId, models, prompt" });
      }

      const artifact = await runSwarmSynthesis({
        type: type || 'synthesis',
        mode: mode || 'URIEL',
        agentId,
        models,
        prompt,
        feedback
      });

      res.json({ status: "ok", artifact });
    } catch (error: any) {
      console.error("[SWARM ENQUEUE ERROR]", error);
      res.status(500).json({ error: error.message || "Synthesis processing failed" });
    }
  });

  // 3. Telemetry Log Reader (Analytics Engine)
  app.get("/api/telemetry", async (req, res) => {
    try {
      const stats = await cfSim.getTelemetryStats();
      res.json({ status: "ok", stats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 4. Circuit Breaker - Get / Update Model status (KV simulation)
  app.get("/api/circuit-breaker", async (req, res) => {
    try {
      const defaultModels = [
        '@cf/meta/llama-3.1-8b-instruct',
        '@cf/qwen/qwen2.5-coder-7b',
        '@cf/mistral/mistral-large-2',
        '@cf/google/gemma-2b-it',
        '@cf/meta/llama-3.1-70b-instruct'
      ];
      
      const states = await Promise.all(defaultModels.map(async m => {
        const status = await cfSim.kvGet(`status:${m}`);
        return {
          model: m,
          status: status || 'active'
        };
      }));
      
      res.json({ status: "ok", states });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/circuit-breaker/toggle", async (req, res) => {
    try {
      const { model, action } = req.body; // action: 'suspend' | 'activate'
      if (!model) {
        return res.status(400).json({ error: "Missing model parameter" });
      }

      if (action === 'suspend') {
        await cfSim.kvPut(`status:${model}`, 'suspended');
      } else {
        await cfSim.kvDelete(`status:${model}`);
      }

      res.json({ status: "ok", message: `Model ${model} updated to ${action === 'suspend' ? 'suspended' : 'active'}` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/memory/get", async (req, res) => {
    try {
      const { agentId } = req.query;
      if (!agentId) {
        return res.status(400).json({ error: "Missing agentId" });
      }

      const history = await cfSim.memoryGet(agentId as string);
      res.json({ status: "ok", history });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/memory/save", async (req, res) => {
    try {
      const { agentId, message } = req.body; // message: { role: 'user'|'assistant', content: string }
      if (!agentId || !message) {
        return res.status(400).json({ error: "Missing agentId or message" });
      }

      await cfSim.memorySave(agentId, message);
      res.json({ status: "ok" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/memory/clear", async (req, res) => {
    try {
      const { agentId } = req.body;
      if (!agentId) {
        return res.status(400).json({ error: "Missing agentId" });
      }

      await cfSim.memoryClear(agentId);
      res.json({ status: "ok" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/memory/status", async (req, res) => {
    try {
      const status = await memoryCore.getMemoryStatus();
      res.json({ status: "ok", memory: status });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/memory/project", async (req, res) => {
    try {
      const { userId, projectId } = req.query;
      if (!userId || !projectId) return res.status(400).json({ error: "Missing parameters" });
      const context = await memoryCore.getProjectMemory(userId as string, projectId as string);
      res.json({ status: "ok", context });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 6. R2 Archive list & fetch
  app.get("/api/archive/list", async (req, res) => {
    try {
      const archives = await cfSim.r2List();
      res.json({ status: "ok", archives });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Cloudflare API Proxy
  app.get("/api/cloudflare/zones", async (req, res) => {
    try {
      const token = process.env.CLOUDFLARE_API_TOKEN;
      if (!token) {
        return res.json({
          result: [
            { id: "023e105f4ecef8ad9ca31a8372d0c353", name: "pulse-os.io", status: "active", type: "full", plan: { name: "Pro Plan" } },
            { id: "9a78b5c4d3e2f1a0b3c4d5e6f7a8b9c0", name: "swarm-grid.net", status: "active", type: "full", plan: { name: "Enterprise Plan" } },
            { id: "e2f1a0b3c4d5e6f7a8b9c0d1e2f3a4b5", name: "azrail-core.dev", status: "active", type: "full", plan: { name: "Free Plan" } }
          ],
          success: true,
          errors: [],
          messages: [],
          isFallback: true
        });
      }

      const response = await axios.get("https://api.cloudflare.com/client/v4/zones", {
        headers: { Authorization: `Bearer ${token}` }
      });
      res.json(response.data);
    } catch (error: any) {
      console.warn("[Cloudflare Proxy - Zones failed, returning graceful simulation fallback]:", error.response?.data || error.message);
      res.json({
        result: [
          { id: "023e105f4ecef8ad9ca31a8372d0c353", name: "pulse-os.io", status: "active", type: "full", plan: { name: "Pro Plan" } },
          { id: "9a78b5c4d3e2f1a0b3c4d5e6f7a8b9c0", name: "swarm-grid.net", status: "active", type: "full", plan: { name: "Enterprise Plan" } },
          { id: "e2f1a0b3c4d5e6f7a8b9c0d1e2f3a4b5", name: "azrail-core.dev", status: "active", type: "full", plan: { name: "Free Plan" } }
        ],
        success: true,
        errors: [],
        messages: [],
        isFallback: true
      });
    }
  });

  app.get("/api/cloudflare/workers", async (req, res) => {
    try {
      const token = process.env.CLOUDFLARE_API_TOKEN;
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
      
      if (!token || !accountId) {
        return res.json({
          result: [
            { id: "metatron-routing-edge", name: "metatron-routing-edge", status: "enabled", modified_on: "2026-07-18T12:00:00Z", routes: ["pulse-os.io/api/*", "swarm-grid.net/api/*"] },
            { id: "quantum-synapse-worker", name: "quantum-synapse-worker", status: "enabled", modified_on: "2026-07-19T00:30:00Z", routes: ["pulse-os.io/synapse/*"] },
            { id: "azrail-telemetry-ingest", name: "azrail-telemetry-ingest", status: "enabled", modified_on: "2026-07-19T01:15:00Z", routes: ["azrail-core.dev/telemetry/*"] }
          ],
          success: true,
          errors: [],
          messages: [],
          isFallback: true
        });
      }

      const response = await axios.get(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/services`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      res.json(response.data);
    } catch (error: any) {
      console.warn("[Cloudflare Proxy - Workers failed, returning graceful simulation fallback]:", error.response?.data || error.message);
      res.json({
        result: [
          { id: "metatron-routing-edge", name: "metatron-routing-edge", status: "enabled", modified_on: "2026-07-18T12:00:00Z", routes: ["pulse-os.io/api/*", "swarm-grid.net/api/*"] },
          { id: "quantum-synapse-worker", name: "quantum-synapse-worker", status: "enabled", modified_on: "2026-07-19T00:30:00Z", routes: ["pulse-os.io/synapse/*"] },
          { id: "azrail-telemetry-ingest", name: "azrail-telemetry-ingest", status: "enabled", modified_on: "2026-07-19T01:15:00Z", routes: ["azrail-core.dev/telemetry/*"] }
        ],
        success: true,
        errors: [],
        messages: [],
        isFallback: true
      });
    }
  });

  app.get("/api/cloudflare/status", (req, res) => {
    res.json({
      hasToken: !!process.env.CLOUDFLARE_API_TOKEN,
      hasAccountId: !!process.env.CLOUDFLARE_ACCOUNT_ID,
      tokenPrefix: process.env.CLOUDFLARE_API_TOKEN ? `${process.env.CLOUDFLARE_API_TOKEN.substring(0, 4)}...` : null,
      accountIdPrefix: process.env.CLOUDFLARE_ACCOUNT_ID ? `${process.env.CLOUDFLARE_ACCOUNT_ID.substring(0, 4)}...` : null,
    });
  });

  app.post("/api/cloudflare/config", express.json(), (req, res) => {
    try {
      const { apiToken, accountId } = req.body;
      
      const envPath = path.join(process.cwd(), '.env');
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
      } else {
        const examplePath = path.join(process.cwd(), '.env.example');
        if (fs.existsSync(examplePath)) {
          envContent = fs.readFileSync(examplePath, 'utf-8');
        }
      }

      let lines = envContent.split('\n');
      
      const updateKey = (key: string, val: string) => {
        let keyFound = false;
        lines = lines.map(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith(`${key}=`) || trimmed.startsWith(`# ${key}=`)) {
            keyFound = true;
            return `${key}=${val}`;
          }
          return line;
        });
        if (!keyFound) {
          lines.push(`${key}=${val}`);
        }
        process.env[key] = val;
      };

      if (apiToken && apiToken.trim() !== '') {
        updateKey('CLOUDFLARE_API_TOKEN', apiToken.trim());
      }
      if (accountId && accountId.trim() !== '') {
        updateKey('CLOUDFLARE_ACCOUNT_ID', accountId.trim());
      }

      fs.writeFileSync(envPath, lines.join('\n'), 'utf-8');

      res.json({ 
        status: "ok", 
        message: "Настройки Cloudflare успешно сохранены и применены.",
        hasToken: !!process.env.CLOUDFLARE_API_TOKEN,
        hasAccountId: !!process.env.CLOUDFLARE_ACCOUNT_ID,
        tokenPrefix: process.env.CLOUDFLARE_API_TOKEN ? `${process.env.CLOUDFLARE_API_TOKEN.substring(0, 4)}...` : null,
        accountIdPrefix: process.env.CLOUDFLARE_ACCOUNT_ID ? `${process.env.CLOUDFLARE_ACCOUNT_ID.substring(0, 4)}...` : null,
      });
    } catch (error: any) {
      console.error("Failed to save Cloudflare config:", error);
      res.status(500).json({ error: "Failed to save configuration", message: error.message });
    }
  });

  // ===================================================
  // AEON PRIME DEV OPS & WORKSPACE BRIDGE API ENDPOINTS
  // ===================================================

  // ===================================================
  // AEON PRIME DEV OPS & WORKSPACE BRIDGE API ENDPOINTS
  // ===================================================

  app.use("/api/metatron", async (req, res) => {
    try {
      // req.originalUrl retains the full original path like /api/metatron/status
      const fetchReq = new Request(`http://127.0.0.1:3001${req.originalUrl}`, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
      });
      const fetchRes = await fetch(fetchReq);
      const data = await fetchRes.json();
      res.status(fetchRes.status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: "METATRON CORE OFFLINE", message: e.message });
    }
  });

  app.get("/api/docs/export", async (req, res) => {
    try {
      const docsDir = path.join(process.cwd(), 'system_docs');
      const bookPath = path.join(docsDir, 'SYSTEM_BOOK.md');
      
      if (!fs.existsSync(bookPath)) {
        return res.status(404).json({ error: "System Book not found" });
      }

      const bookContent = fs.readFileSync(bookPath, 'utf-8');
      // Extract file paths from markdown links: [Title](./PATH.md)
      const fileRegex = /\[.*?\]\(\.\/(.*?\.md)\)/g;
      let match;
      const files = [];
      
      while ((match = fileRegex.exec(bookContent)) !== null) {
        files.push(match[1]);
      }

      let fullMarkdown = `# DARK MNMLL PULSE OS: THE COMPLETE GUIDE\n\n*Generated on ${new Date().toLocaleDateString()}*\n\n---\n\n`;
      
      for (const fileName of files) {
        const filePath = path.join(docsDir, fileName);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          // Add a semantic break and the content
          fullMarkdown += `\n\n<div style="page-break-after: always;"></div>\n\n${content}\n\n---\n`;
        }
      }

      res.json({ markdown: fullMarkdown });
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Failed to export documentation" });
    }
  });

  // Memory Core initialization removed (redundant)
  
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Light Contour is running" });
  });

  // LANDING PAGE FEEDBACK / PERSISTENT STORAGE SIMULATION ENDPOINTS
  app.get("/api/landing/feedback", (req, res) => {
    try {
      const feedbackPath = path.join(process.cwd(), "uploads", "feedback.json");
      if (!fs.existsSync(path.join(process.cwd(), "uploads"))) {
        fs.mkdirSync(path.join(process.cwd(), "uploads"), { recursive: true });
      }
      if (!fs.existsSync(feedbackPath)) {
        const initialFeedback = [
          {
            id: "1",
            author: "Azrail Core Integration",
            textEn: "Sovereign cognitive systems responding flawlessly under 150ms.",
            textRu: "Суверенные когнитивные системы работают безупречно со временем отклика менее 150 мс.",
            rating: 5,
            timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
          },
          {
            id: "2",
            author: "andrik494@gmail.com",
            textEn: "The telemetry dashboard combined with real-time Express endpoints is stunning.",
            textRu: "Панель телеметрии в сочетании с живыми эндпоинтами Express выглядит потрясающе.",
            rating: 5,
            timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
          }
        ];
        fs.writeFileSync(feedbackPath, JSON.stringify(initialFeedback, null, 2), "utf-8");
      }
      const data = fs.readFileSync(feedbackPath, "utf-8");
      res.json({ status: "ok", feedback: JSON.parse(data) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/landing/feedback", (req, res) => {
    try {
      const { author, textEn, textRu, rating } = req.body;
      if (!author || (!textEn && !textRu)) {
        return res.status(400).json({ error: "Missing required feedback parameters" });
      }

      const feedbackPath = path.join(process.cwd(), "uploads", "feedback.json");
      let list = [];
      if (fs.existsSync(feedbackPath)) {
        list = JSON.parse(fs.readFileSync(feedbackPath, "utf-8"));
      }

      const newItem = {
        id: Date.now().toString(),
        author,
        textEn: textEn || textRu,
        textRu: textRu || textEn,
        rating: rating || 5,
        timestamp: new Date().toISOString()
      };

      list.unshift(newItem);
      fs.writeFileSync(feedbackPath, JSON.stringify(list, null, 2), "utf-8");
      res.json({ status: "ok", feedback: list });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // File Upload Endpoint
  app.post("/api/upload", upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    res.json({ 
      status: "ok", 
      message: "File uploaded successfully",
      file: {
        name: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  });

  // Intelligent Chat API with Memory Core integration
  app.post("/api/chat/intelligent", async (req, res) => {
    try {
      const validatedData = ChatSchema.parse(req.body);
      const { userId, message, systemPrompt: customSystemPrompt, model } = validatedData;
      const uid = userId || 'anonymous';
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "API Key not configured" });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      // 1. Build context from Memory Core (Short-term + Semantic + Sentiment + Profile)
      const [context, sentiment, profile] = await Promise.all([
        memoryCore.buildAzrailContext(uid, message),
        memoryCore.getAzrailSentiment(),
        memoryCore.getCreatorProfile(uid)
      ]);
      
      // 2. Prepare conversation history
      const currentHistory = context.messages.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      // 3. Inject memories and sentiment into System Prompt
      let baseSystemPrompt = customSystemPrompt || "You are Azrail, the overlord AI of the Dark Mnmll Pulse OS. You are enigmatic, powerful, and highly efficient.";
      
      if (profile) {
        baseSystemPrompt += ` You know the creator: ${JSON.stringify(profile)}.`;
      }
      
      const finalSystemPrompt = baseSystemPrompt + "\n" + sentiment + context.memoryInjectedPrompt;

      // 4. Generate AI Response
      const modelName = mapModelName(model);
      const contents = [
        ...currentHistory,
        { role: 'user', parts: [{ text: message }] }
      ];

      // Run anticipatory forecasting in parallel
      const predictionsPromise = anticipatory.predictIntent(message, context.messages);
      const speculativeQueriesPromise = anticipatory.getSpeculativeQueries(message);

      const result = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction: finalSystemPrompt
        }
      });
      const aiResponse = result.text || "";

      // 5. Background updates: Update Memory Banks
      const updatedMessages = [
        ...context.messages,
        { role: 'user', content: message },
        { role: 'assistant', content: aiResponse }
      ];

      // Use a "fire and forget" pattern for memory updates to keep API responsive
      memoryCore.updateSessionContext(uid, updatedMessages).catch(e => console.error("Memory update failed", e));
      
      if (message.length > 30) {
        memoryCore.remember(uid, message, { source: 'intelligent_chat', timestamp: new Date().toISOString() })
          .catch(e => console.error("Memory archiving failed", e));
      }
      
      memoryCore.saveEpisode(uid, 'intelligent_chat_interaction', { model: modelName })
        .catch(e => console.error("Episode logging failed", e));

      const [predictions, speculativeQueries] = await Promise.all([
        predictionsPromise,
        speculativeQueriesPromise
      ]);

      res.json({ 
        status: "ok", 
        data: aiResponse,
        memory_accessed: context.memoryInjectedPrompt !== "\n--- AZRAIL MEMORY BANKS ---\n",
        predictions,
        speculativeQueries
      });

    } catch (error: any) {
      console.error("Intelligent chat error:", error);
      res.status(500).json({ error: error.message || "Azrail failed to process your request" });
    }
  });

  app.post("/api/user/profile", async (req, res) => {
    try {
      const { userId, profileData } = req.body;
      const uid = userId || 'anonymous';
      await memoryCore.updateCreatorProfile(uid, profileData);
      res.json({ status: "ok", message: "Profile synchronized with neural core" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  function generateFallbackSVG(prompt: string, type: 'avatar' | 'general'): string {
    const seed = prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue1 = seed % 360;
    const hue2 = (seed + 120) % 360;
    const numShapes = 4 + (seed % 5);
    
    let shapes = '';
    if (type === 'avatar') {
      shapes += `<circle cx="100" cy="100" r="80" fill="url(#grad)" opacity="0.15" stroke="url(#stroke-grad)" stroke-width="2"/>`;
      shapes += `<circle cx="100" cy="100" r="50" fill="none" stroke="url(#stroke-grad)" stroke-width="1" stroke-dasharray="5,5"/>`;
      shapes += `<line x1="100" y1="20" x2="100" y2="180" stroke="url(#stroke-grad)" stroke-width="1" opacity="0.3"/>`;
      shapes += `<line x1="20" y1="100" x2="180" y2="100" stroke="url(#stroke-grad)" stroke-width="1" opacity="0.3"/>`;
      shapes += `<circle cx="100" cy="100" r="25" fill="url(#grad)" opacity="0.85" filter="url(#glow)"/>`;
      shapes += `<circle cx="100" cy="100" r="10" fill="#ffffff" opacity="0.9"/>`;
    } else {
      shapes += `<rect width="500" height="500" fill="#09090b"/>`;
      shapes += `<g opacity="0.45">`;
      for (let i = 0; i < numShapes; i++) {
        const cx = 100 + ((seed * (i + 1)) % 300);
        const cy = 100 + ((seed * (i + 2)) % 300);
        const r = 50 + ((seed * (i + 3)) % 150);
        const h = (hue1 + i * 40) % 360;
        shapes += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="hsla(${h}, 70%, 50%, 0.3)" filter="url(#blur)"/>`;
      }
      shapes += `</g>`;
      shapes += `<path d="M 0,50 L 500,50 M 0,100 L 500,100 M 0,150 L 500,150 M 0,200 L 500,200 M 0,250 L 500,250 M 0,300 L 500,300 M 0,355 L 500,355 M 0,400 L 500,400 M 0,450 L 500,450" stroke="#ffffff" stroke-width="0.5" opacity="0.05" />`;
      shapes += `<path d="M 50,0 L 50,500 M 100,0 L 100,500 M 150,0 L 150,500 M 200,0 L 200,500 M 250,0 L 250,500 M 300,0 L 300,500 M 350,0 L 350,500 M 400,0 L 400,500 M 450,0 L 450,500" stroke="#ffffff" stroke-width="0.5" opacity="0.05" />`;
      const cleanPrompt = prompt.replace(/[<>&"]/g, '').substring(0, 55) + (prompt.length > 55 ? '...' : '');
      shapes += `<text x="50%" y="90%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="11" opacity="0.75" letter-spacing="2">[ ${cleanPrompt.toUpperCase()} ]</text>`;
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${type === 'avatar' ? '200 200' : '500 500'}" width="100%" height="100%">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="hsl(${hue1}, 75%, 55%)" />
          <stop offset="100%" stop-color="hsl(${hue2}, 75%, 45%)" />
        </linearGradient>
        <linearGradient id="stroke-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="hsl(${hue2}, 70%, 50%)" />
          <stop offset="100%" stop-color="hsl(${hue1}, 70%, 60%)" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="blur">
          <feGaussianBlur stdDeviation="40" />
        </filter>
      </defs>
      ${shapes}
    </svg>`;

    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  }

  app.post("/api/generate-avatar", checkLimitMiddleware, async (req, res) => {
    const { systemPrompt, name } = req.body;
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("API Key not configured");
      }
      
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const prompt = `Generate a modern, flat, clean vector-style profile avatar for an AI agent. The agent's name is "${name}" and its persona is: "${systemPrompt}". The avatar should be minimalist, colorful, and suitable for a tech interface.`;

      const response = await ai.models.generateContent({
        model: mapImageModelName('gemini-2.5-flash-image'),
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });
      
      let imageUrl = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${base64EncodeString}`;
          break;
        }
      }
      
      if (!imageUrl) {
        throw new Error("No image generated");
      }
      
      res.json({ imageUrl });
    } catch (error: any) {
      console.warn("Avatar generation error (switching to procedural SVG):", error.message || error);
      const fallbackUrl = generateFallbackSVG(name || systemPrompt || "avatar", "avatar");
      res.json({ imageUrl: fallbackUrl, fallback: true });
    }
  });

  app.post("/api/generate-image", checkLimitMiddleware, async (req, res) => {
    const { prompt, model = "gemini-3.1-flash-lite-image", aspectRatio = "1:1", imageSize = "1K" } = req.body;
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("API Key not configured");
      }
      
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const modelName = mapImageModelName(model);
      const config: any = {
        imageConfig: {
          aspectRatio
        }
      };

      if (modelName === "gemini-3.1-flash-image" || modelName === "gemini-3-pro-image") {
        config.imageConfig.imageSize = imageSize;
      }
      
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [{ text: prompt }]
        },
        config
      });
      
      let imageUrl = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${base64EncodeString}`;
          break;
        }
      }
      
      if (!imageUrl) {
        throw new Error("No image generated");
      }
      
      res.json({ imageUrl, metadata: { model: modelName, resolution: imageSize, aspectRatio } });
    } catch (error: any) {
      console.warn("Image generation error (switching to procedural SVG):", error.message || error);
      const fallbackUrl = generateFallbackSVG(prompt || "abstract synthesis", "general");
      res.json({ imageUrl: fallbackUrl, fallback: true, metadata: { model: "procedural-svg", resolution: "procedural", aspectRatio: "1:1" } });
    }
  });

  // Real API route for LLM requests
  app.post("/api/generate", checkLimitMiddleware, async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "API Key not configured" });
      }
      
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const { prompt, systemPrompt, model, history = [] } = req.body;
      const modelName = mapModelName(model);
      
      const config: any = {};
      if (systemPrompt) {
        config.systemInstruction = systemPrompt;
      }
      
      const contents = history.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));
      
      contents.push({ role: 'user', parts: [{ text: prompt }] });
      
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config
      });
      
      res.json({ status: "ok", data: response.text });
    } catch (error: any) {
      console.error("Generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate text" });
    }
  });

  // 1. Generate Music (Lyria Clip / Lyria Pro)
  app.post("/api/generate-music", checkLimitMiddleware, async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "API Key not configured" });
      }
      const { prompt, model = 'lyria-3-clip-preview', image } = req.body;
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const contents: any = image ? {
        parts: [
          { text: prompt },
          { inlineData: { data: image, mimeType: "image/jpeg" } }
        ]
      } : prompt;

      const responseStream = await ai.models.generateContentStream({
        model: model,
        contents,
      });

      let audioBase64 = "";
      let lyrics = "";
      let mimeType = "audio/wav";

      for await (const chunk of responseStream) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (!audioBase64 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioBase64 += part.inlineData.data;
          }
          if (part.text && !lyrics) {
            lyrics = part.text;
          }
        }
      }

      if (!audioBase64) {
        throw new Error("No music audio was generated by the Lyria model.");
      }

      res.json({
        status: "ok",
        audioData: audioBase64,
        mimeType,
        lyrics
      });
    } catch (error: any) {
      console.error("Music generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate music" });
    }
  });

  // 2. Generate Video via Veo (Start Operation)
  app.post("/api/generate-video-veo", checkLimitMiddleware, async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "API Key not configured" });
      }
      const { prompt, model = 'veo-3.1-lite-generate-preview', resolution = '720p', aspectRatio = '16:9', image, lastFrame } = req.body;
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const videoConfig: any = {
        numberOfVideos: 1,
        resolution,
        aspectRatio
      };

      if (lastFrame) {
        videoConfig.lastFrame = {
          imageBytes: lastFrame,
          mimeType: 'image/png'
        };
      }

      const params: any = {
        model: model,
        prompt: prompt || undefined,
        config: videoConfig
      };

      if (image) {
        params.image = {
          imageBytes: image,
          mimeType: 'image/png'
        };
      }

      const operation = await ai.models.generateVideos(params);
      res.json({ status: "ok", operationName: operation.name });
    } catch (error: any) {
      console.error("Video generation start error:", error);
      res.status(500).json({ error: error.message || "Failed to start video generation" });
    }
  });

  // Music Intelligence Agent Routes
  app.post("/api/music/analyze-als", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const projectIR = await parseALS(req.file.path);
      
      // Cleanup uploaded file after parsing
      try { fs.unlinkSync(req.file.path); } catch(e) {}

      res.json({ status: "ok", projectIR });
    } catch (error: any) {
      console.error("ALS parsing error:", error);
      res.status(500).json({ error: error.message || "Failed to parse ALS project" });
    }
  });

  app.post("/api/music/remix-plan", async (req, res) => {
    try {
      const { projectIR, genreRules, intensity } = req.body;
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "API Key not configured" });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const systemPrompt = `You are a specialist in Melodic House & Techno production. 
      You will analyze a DAW project's Internal Representation (IR) and create a detailed remix plan.
      Genre Rules: ${JSON.stringify(genreRules)}
      Intensity Level: ${intensity} (0.0 = minimal changes, 1.0 = radical remix)
      
      Return a JSON response with an "actions" array of objects:
      {
        "type": "swap_groove | reharmonize | restructure | add_layer | remove_layer",
        "target_tracks": string[],
        "params": object,
        "reasoning": string
      }
      `;

      const prompt = `Create a remix plan for this project: ${JSON.stringify(projectIR)}`;

      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: systemPrompt
        }
      });
      const text = result.text || "";
      
      // Attempt to parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const plan = jsonMatch ? JSON.parse(jsonMatch[0]) : { actions: [], raw: text };

      res.json({ status: "ok", plan });
    } catch (error: any) {
      console.error("Remix planning error:", error);
      res.status(500).json({ error: error.message || "Failed to generate remix plan" });
    }
  });

  // 3. Poll Video Operation Status
  app.post("/api/video-status-veo", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "API Key not configured" });
      }
      const { operationName } = req.body;
      if (!operationName) {
        return res.status(400).json({ error: "Missing operationName" });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const op = new GenerateVideosOperation();
      op.name = operationName;

      const updated = await ai.operations.getVideosOperation({ operation: op });
      res.json({ status: "ok", done: updated.done });
    } catch (error: any) {
      console.error("Video polling error:", error);
      res.status(500).json({ error: error.message || "Failed to poll video status" });
    }
  });

  // 4. Download Video (Streams the video back)
  app.post("/api/video-download-veo", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "API Key not configured" });
      }
      const { operationName } = req.body;
      if (!operationName) {
        return res.status(400).json({ error: "Missing operationName" });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const op = new GenerateVideosOperation();
      op.name = operationName;

      const updated = await ai.operations.getVideosOperation({ operation: op });
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
      if (!uri) {
        return res.status(404).json({ error: "Video URI not found or operation not completed yet" });
      }

      const videoRes = await fetch(uri, {
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY },
      });

      res.setHeader('Content-Type', 'video/mp4');
      const reader = videoRes.body?.getReader();
      if (!reader) {
        throw new Error("Could not read video stream body");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } catch (error: any) {
      console.error("Video download error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Failed to download video" });
      }
    }
  });

  // 5. Analyze Multimodal content (Video/Image understanding)
  app.post("/api/analyze-multimodal", upload.single('file'), async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "API Key not configured" });
      }
      const prompt = req.body.prompt || "Explain what is in this file in detail.";
      
      let inlineData: any;
      if (req.file) {
        const fileData = fs.readFileSync(req.file.path).toString("base64");
        inlineData = {
          data: fileData,
          mimeType: req.file.mimetype
        };
      } else if (req.body.fileData && req.body.mimeType) {
        inlineData = {
          data: req.body.fileData,
          mimeType: req.body.mimeType
        };
      }

      if (!inlineData) {
        return res.status(400).json({ error: "No file uploaded or provided as base64" });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: {
          parts: [
            { inlineData },
            { text: prompt }
          ]
        }
      });

      res.json({ status: "ok", data: response.text });
    } catch (error: any) {
      console.error("Multimodal analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze multimodal content" });
    } finally {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }
  });

  // 6. Transcribe Audio
  app.post("/api/transcribe-audio", upload.single('file'), async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "API Key not configured" });
      }

      let inlineData: any;
      if (req.file) {
        const fileData = fs.readFileSync(req.file.path).toString("base64");
        inlineData = {
          data: fileData,
          mimeType: req.file.mimetype
        };
      } else if (req.body.audioData && req.body.mimeType) {
        inlineData = {
          data: req.body.audioData,
          mimeType: req.body.mimeType
        };
      }

      if (!inlineData) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: {
          parts: [
            { inlineData },
            { text: "Provide a direct, high-quality transcription of this audio. Do not summarize, explain, or add commentary. Just translate speech to text." }
          ]
        }
      });

      res.json({ status: "ok", data: response.text });
    } catch (error: any) {
      console.error("Transcription error:", error);
      res.status(500).json({ error: error.message || "Failed to transcribe audio" });
    } finally {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }
  });

  // 7. Advanced Text Operations (Thinking level HIGH, low-latency, Google Search Grounding)
  app.post("/api/generate-text-advanced", checkLimitMiddleware, async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "API Key not configured" });
      }
      const { prompt, option = 'standard', systemPrompt } = req.body;

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      let modelName = "gemini-3.5-flash";
      const config: any = {};

      if (systemPrompt) {
        config.systemInstruction = systemPrompt;
      }

      if (option === 'thinking') {
        modelName = "gemini-3.5-flash";
      } else if (option === 'low-latency') {
        modelName = "gemini-3.1-flash-lite";
      } else if (option === 'search') {
        modelName = "gemini-3.5-flash";
        config.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const links = chunks ? chunks.map((c: any) => ({
        title: c.web?.title || "Search Result",
        uri: c.web?.uri
      })).filter((c: any) => c.uri) : [];

      res.json({
        status: "ok",
        data: response.text,
        links,
        modelUsed: modelName
      });
    } catch (error: any) {
      console.error("Advanced text generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate advanced text" });
    }
  });

  // Smart AI Translation Endpoint using Gemini
  app.post("/api/translate", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "API Key not configured" });
      }
      
      const { text, targetLang } = req.body;
      if (!text || !targetLang) {
        return res.status(400).json({ error: "Missing text or targetLang parameters" });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const languageName = targetLang === 'ru' ? 'Russian' : 'English';
      const prompt = `Translate the following text into ${languageName}. 
You are a context-aware translator for a futuristic tech OS called "Dark Mnmll Pulse OS".
Ensure all technical parameters, variable codes, names, or bracketed contents remain unaltered.
Tone should be clean, minimal, and highly professional. Do not add any preamble, conversational explanations, or markdown fences. Just output the clean translated text.

TEXT TO TRANSLATE:
${text}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      res.json({ status: "ok", data: response.text });
    } catch (error: any) {
      console.error("Translation error:", error);
      res.status(500).json({ error: error.message || "Failed to translate text" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production asset serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler (MUST BE LAST)
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(`[FATAL ERROR] ${err.stack}`);
    res.status(500).json({ 
      error: "Critical system failure in neural core",
      message: process.env.NODE_ENV === 'production' ? "Something went wrong" : err.message 
    });
  });

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const wss = new WebSocketServer({ server, path: "/live" });

  wss.on("connection", async (clientWs) => {
    console.log("[WS] Client connected for Gemini Live session");
    let session: any = null;

    try {
      if (!process.env.GEMINI_API_KEY) {
        console.error("[WS] API Key not configured");
        clientWs.close(1011, "API Key not configured");
        return;
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are the vocal synthesized persona of AZRAIL, the overlord of the Dark Mnmll Pulse OS. Speak concisely, enigmatically, and with absolute futuristic dominance. Keep responses short and impactful.",
        },
        callbacks: {
          onmessage: (message: any) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
            const textPart = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (textPart) {
              clientWs.send(JSON.stringify({ text: textPart }));
            }
          },
        },
      });

      clientWs.on("message", (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio && session) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        } catch (e: any) {
          console.error("[WS] Error sending realtime input:", e.message);
        }
      });

      clientWs.on("close", () => {
        console.log("[WS] Client connection closed");
        if (session) {
          try { session.close(); } catch (e) {}
        }
      });

    } catch (err: any) {
      console.error("[WS] Live connection error:", err);
      clientWs.send(JSON.stringify({ error: err.message || "Failed to establish Live session" }));
      clientWs.close(1011, "Live connection failed");
    }
  });
}

startServer();
