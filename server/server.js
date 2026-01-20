const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const dotenv = require("dotenv");

// Configurar dotenv - carrega o .env da pasta pai
dotenv.config({ path: "../.env" });

// Criar app Express
const app = express();

// Configuração básica
app.use(express.json());

// Log de todas as requisições
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Lista de origens permitidas
const allowedOrigins = [
  "https://132-sealogistics.netlify.app",
  "http://localhost:3000",
  "http://localhost:3001",
];

// Configurar CORS
app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requisições sem origin (como Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log("Origem bloqueada:", origin);
        callback(new Error("Origem não permitida pelo CORS"));
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Middleware para adicionar headers CORS em todas as respostas
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

// Configuração otimizada do transporter do Nodemailer
const transporter = nodemailer.createTransport({
  pool: true,
  maxConnections: 1,
  maxMessages: 3,
  rateDelta: 1000,
  rateLimit: 3,
  service: "gmail",
  auth: {
    user: process.env.VITE_EMAIL_USER,
    pass: process.env.VITE_EMAIL_APP_PASSWORD,
  },
});

// Rota raiz
app.get("/", (req, res) => {
  res.json({
    message: "Sea Logistics Email Server",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

// Rota de healthcheck
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      hasEmailConfig: !!process.env.VITE_EMAIL_USER,
    },
  });
});

// Rota para enviar email
app.post("/send-email", async (req, res) => {
  try {
    console.log("=== INICIANDO ENVIO DE EMAIL ===");
    console.log("Corpo da requisição:", req.body);
    const { to, subject, html } = req.body;

    const mailOptions = {
      from: {
        name: "Sea Logistics",
        address: process.env.VITE_EMAIL_USER,
      },
      to,
      subject,
      html,
      headers: {
        Precedence: "bulk",
        "X-Auto-Response-Suppress": "All",
        "Auto-Submitted": "auto-generated",
      },
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email enviado com sucesso:", info.messageId);
    console.log("=== EMAIL ENVIADO COM SUCESSO ===");

    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("=== ERRO AO ENVIAR EMAIL ===");
    console.error("Detalhes do erro:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rota para verificar conexão
app.get("/api/verify-email", async (req, res) => {
  try {
    console.log("=== VERIFICANDO CONEXÃO DE EMAIL ===");
    await transporter.verify();
    console.log("=== CONEXÃO VERIFICADA COM SUCESSO ===");
    res.json({ success: true });
  } catch (error) {
    console.error("=== ERRO AO VERIFICAR CONEXÃO ===");
    console.error("Detalhes do erro:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rota para trocar código de autorização por token (Excel Integration)
app.post("/api/excel/token", async (req, res) => {
  try {
    console.log("=== TROCANDO CÓDIGO POR TOKEN ===");
    const { code, code_verifier } = req.body;

    // Debug: verificar se o client_secret está sendo carregado
    const debugClientSecret =
      process.env.AZURE_CLIENT_SECRET || "TEMPORARY_SECRET_FOR_TESTING";
    console.log("Client Secret carregado:", debugClientSecret ? "SIM" : "NÃO");
    console.log(
      "Client Secret (primeiros 10 chars):",
      debugClientSecret.substring(0, 10) + "..."
    );

    if (!code) {
      return res
        .status(400)
        .json({ success: false, error: "Código de autorização não fornecido" });
    }

    if (!code_verifier) {
      return res
        .status(400)
        .json({ success: false, error: "Code verifier não fornecido" });
    }

    // Troca real do código por token usando Microsoft Graph API
    const tokenUrl =
      "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    const clientId =
      process.env.REACT_APP_AZURE_CLIENT_ID ||
      "21f52d49-5e17-4d39-b05c-8a3f355ecbc9";
    const clientSecret =
      process.env.AZURE_CLIENT_SECRET || "TEMPORARY_SECRET_FOR_TESTING";
    const redirectUri =
      process.env.NODE_ENV === "production"
        ? "https://132-sealogistics.netlify.app/auth/callback"
        : "http://localhost:3000/auth/callback";
    // Debug: Log das configurações
    console.log("=== DEBUG REDIRECT URI ===");
    console.log("Client ID:", clientId);
    console.log("Redirect URI no backend:", redirectUri);
    console.log("Código recebido:", code ? "SIM" : "NÃO");
    console.log("Code verifier recebido:", code_verifier ? "SIM" : "NÃO");
    console.log(
      "Code verifier (primeiros 10 chars):",
      code_verifier ? code_verifier.substring(0, 10) + "..." : "N/A"
    );
    console.log(
      "Client Secret configurado:",
      process.env.AZURE_CLIENT_SECRET ? "SIM" : "NÃO (usando fallback)"
    );
    console.log("Environment:", process.env.NODE_ENV || "development");

    const tokenData = {
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope:
        "https://graph.microsoft.com/Files.ReadWrite https://graph.microsoft.com/Sites.ReadWrite.All https://graph.microsoft.com/User.Read",
      code_verifier: code_verifier,
    };

    console.log("Enviando requisição para Microsoft Graph...");
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(tokenData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(
        "Erro na resposta do Microsoft Graph:",
        response.status,
        errorData
      );
      return res.status(400).json({
        success: false,
        error: `Erro na autenticação: ${response.status} - ${errorData}`,
      });
    }

    const tokenResponse = await response.json();
    console.log("=== TOKEN REAL OBTIDO COM SUCESSO ===");
    console.log("Token type:", tokenResponse.token_type);
    console.log("Expires in:", tokenResponse.expires_in);

    res.json(tokenResponse);
  } catch (error) {
    console.error("=== ERRO AO TROCAR CÓDIGO POR TOKEN ===");
    console.error("Detalhes do erro:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rota para webhook do Excel (receber notificações de mudanças)
app.post("/api/excel/webhook", async (req, res) => {
  try {
    console.log("=== WEBHOOK EXCEL RECEBIDO ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Headers:", req.headers);
    console.log("Body:", req.body);

    // Validação básica do webhook
    const { validationToken, resource, changeType } = req.body;

    // Se for uma validação de webhook, retorna o token
    if (validationToken) {
      console.log("Validação de webhook recebida");
      return res.status(200).send(validationToken);
    }

    // Processa notificação de mudança
    if (resource && changeType === "updated") {
      console.log("Mudança detectada no Excel:", resource);

      // Aqui você pode implementar lógica para:
      // 1. Notificar clientes conectados via WebSocket
      // 2. Atualizar cache de dados
      // 3. Disparar sincronização automática

      // Por enquanto, apenas logamos
      console.log("Excel foi atualizado - sincronização necessária");
    }

    res.json({
      success: true,
      message: "Webhook processado com sucesso",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("=== ERRO AO PROCESSAR WEBHOOK ===");
    console.error("Detalhes do erro:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rota para obter dados atualizados do Excel
app.get(
  "/api/excel/data/:workbookId/:worksheetId/:tableId",
  async (req, res) => {
    try {
      console.log("=== SOLICITAÇÃO DE DADOS DO EXCEL ===");
      const { workbookId, worksheetId, tableId } = req.params;

      console.log("Parâmetros:", { workbookId, worksheetId, tableId });

      // Aqui você implementaria a lógica para buscar dados do Excel
      // Por enquanto, retorna dados mock
      const mockData = [
        {
          id: "1",
          cliente: "Nova Empresa",
          tipo: "AÉREO",
          shipper: "teste",
          pol: "Guarulhos (GRU), Brasil",
          pod: "JFK (JFK), Nova York, EUA",
          etdOrigem: "2025-08-14",
          etaDestino: "2025-08-29",
          quantBox: "1",
          numeroBl: "BL12345",
          armador: "Maersk",
          booking: "BK1234 INV1234",
        },
      ];

      res.json({
        success: true,
        data: mockData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("=== ERRO AO OBTER DADOS DO EXCEL ===");
      console.error("Detalhes do erro:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ==========================================
// ROTAS WHATSAPP BUSINESS API
// ==========================================

// Rota para enviar mensagem WhatsApp
app.post("/api/whatsapp/send-message", async (req, res) => {
  try {
    console.log("=== ENVIANDO MENSAGEM WHATSAPP ===");
    const { to, message, template } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros "to" e "message" são obrigatórios',
      });
    }

    console.log("Enviando para:", to);
    console.log("Mensagem:", message.substring(0, 100) + "...");

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      return res.status(500).json({
        success: false,
        error: "Credenciais do WhatsApp não configuradas no servidor",
      });
    }

    const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    const body = template
      ? {
          messaging_product: "whatsapp",
          to: to,
          type: "template",
          template: {
            name: template.name,
            language: {
              code: template.language || "pt_BR",
            },
            components: [
              {
                type: "body",
                parameters: template.parameters.map((param) => ({
                  type: "text",
                  text: param,
                })),
              },
            ],
          },
        }
      : {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: to,
          type: "text",
          text: {
            preview_url: true,
            body: message,
          },
        };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Erro da WhatsApp API:", responseData);
      return res.status(response.status).json({
        success: false,
        error: responseData.error?.message || "Erro ao enviar mensagem",
        details: responseData,
      });
    }

    console.log("=== MENSAGEM WHATSAPP ENVIADA COM SUCESSO ===");
    console.log("Message ID:", responseData.messages?.[0]?.id);

    res.json({
      success: true,
      messageId: responseData.messages?.[0]?.id,
      response: responseData,
    });
  } catch (error) {
    console.error("=== ERRO AO ENVIAR MENSAGEM WHATSAPP ===");
    console.error("Detalhes do erro:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Webhook para receber mensagens e status (POST)
app.post("/api/whatsapp/webhook", async (req, res) => {
  try {
    console.log("=== WEBHOOK WHATSAPP RECEBIDO ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Body:", JSON.stringify(req.body, null, 2));

    const { entry } = req.body;

    if (!entry || !Array.isArray(entry)) {
      return res.sendStatus(200);
    }

    for (const item of entry) {
      const changes = item.changes || [];

      for (const change of changes) {
        const value = change.value;

        if (value.messages && Array.isArray(value.messages)) {
          for (const msg of value.messages) {
            console.log("Mensagem recebida:", {
              from: msg.from,
              type: msg.type,
              text: msg.text?.body,
              timestamp: msg.timestamp,
            });

            // Aqui você pode implementar lógica de resposta automática
            // Por exemplo: rastreamento automático ao receber um número de booking
            // const booking = msg.text?.body;
            // const shipmentData = await buscarPorBooking(booking);
            // await enviarRastreamento(msg.from, shipmentData);
          }
        }

        // Status de mensagem (enviada, entregue, lida)
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const status of value.statuses) {
            console.log("Status de mensagem:", {
              id: status.id,
              status: status.status,
              timestamp: status.timestamp,
              recipient: status.recipient_id,
            });
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("=== ERRO AO PROCESSAR WEBHOOK WHATSAPP ===");
    console.error("Detalhes do erro:", error);
    res.sendStatus(500);
  }
});

// Verificação do Webhook (GET)
app.get("/api/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("=== VERIFICAÇÃO DE WEBHOOK WHATSAPP ===");
  console.log("Mode:", mode);
  console.log("Token recebido:", token);

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("Webhook verificado com sucesso!");
    res.status(200).send(challenge);
  } else {
    console.error("Falha na verificação do webhook");
    res.sendStatus(403);
  }
});

// Rota para verificar status de mensagem
app.get("/api/whatsapp/message-status/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;
    console.log("=== VERIFICANDO STATUS DE MENSAGEM ===");
    console.log("Message ID:", messageId);

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";

    const url = `https://graph.facebook.com/${apiVersion}/${messageId}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data.error?.message || "Erro ao verificar status",
      });
    }

    res.json({
      success: true,
      status: data,
    });
  } catch (error) {
    console.error("=== ERRO AO VERIFICAR STATUS ===");
    console.error("Detalhes do erro:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Rota para verificar configuração do WhatsApp
app.get("/api/whatsapp/verify", (req, res) => {
  const hasConfig = !!(
    process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN
  );

  res.json({
    success: hasConfig,
    configured: hasConfig,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID
      ? "***" + process.env.WHATSAPP_PHONE_NUMBER_ID.slice(-4)
      : null,
    message: hasConfig ? "WhatsApp configurado" : "WhatsApp não configurado",
  });
});

// Configuração da porta
const port = process.env.PORT || 3001;

// Iniciar o servidor
app.listen(port, "0.0.0.0", () => {
  console.log("==================================");
  console.log(`Servidor rodando na porta ${port}`);
  console.log("Origens permitidas:", allowedOrigins);
  console.log("==================================");
});
