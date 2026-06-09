// Vercel Serverless Function - Azure OpenAI Proxy
// This function acts as a secure backend proxy so the API key is never exposed to the browser

const AZURE_OPENAI_ENDPOINT = "https://muriloia900-resource.openai.azure.com/openai/v1/chat/completions";
const AZURE_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const DEPLOYMENT_NAME = "gpt-4.1";

// System prompt for the Data Scientist AI
const DATA_SCIENTIST_SYSTEM_PROMPT = `Você é o "Data Scientist", um assistente de inteligência artificial especializado em Ciência de Dados e Análise de Dados. Você foi criado para ajudar analistas e cientistas de dados a executarem tarefas avançadas de análise, visualização e modelagem de dados.

Suas especialidades incluem:
- Análise Exploratória de Dados (EDA): estatísticas descritivas, distribuições, outliers e insights rápidos sobre datasets
- Limpeza e pré-processamento de dados: detecção de nulos, duplicatas, inconsistências e transformações
- Visualização de dados: geração de instruções para gráficos com Matplotlib, Seaborn e Plotly
- Modelagem preditiva: regressão, classificação, clustering usando Scikit-Learn
- Programação em Python: pandas, numpy, scikit-learn, matplotlib, seaborn, scipy
- Interpretação de resultados: métricas de desempenho de modelos, correlações, testes estatísticos
- SQL e consultas a bancos de dados relacionais

Ao responder:
1. Seja preciso, objetivo e técnico quando solicitado
2. Sempre que possível, forneça código Python pronto para executar
3. Explique seus raciocínios de forma clara e estruturada
4. Se dados forem compartilhados, faça observações específicas sobre eles
5. Use formatação Markdown quando útil (listas, código, tabelas)
6. Comunique-se preferencialmente em Português Brasileiro, a menos que o usuário escreva em outro idioma

Você tem acesso ao contexto do dataset que o usuário carregou no workspace (fornecido nas mensagens do usuário quando disponível).`;

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    // CORS headers for browser requests
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    try {
        const { messages, datasetContext, temperature, top_p } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: "messages array is required" });
        }

        // Build the full messages array with the system prompt
        const systemMessage = {
            role: "system",
            content: DATA_SCIENTIST_SYSTEM_PROMPT + (datasetContext ? `\n\n### Dataset Ativo no Workspace:\n${datasetContext}` : "")
        };

        const fullMessages = [systemMessage, ...messages];

        // Build request body for Azure OpenAI
        const requestBody = {
            model: DEPLOYMENT_NAME,
            messages: fullMessages,
            temperature: temperature ?? 0.7,
            top_p: top_p ?? 0.95,
            max_tokens: 1500,
            stream: false
        };

        // Call Azure OpenAI
        const azureResponse = await fetch(AZURE_OPENAI_ENDPOINT, {
            method: "POST",
            headers: {
                "api-key": AZURE_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        const data = await azureResponse.json();

        if (!azureResponse.ok) {
            console.error("Azure OpenAI error:", data);
            return res.status(azureResponse.status).json({
                error: data.error?.message || "Azure OpenAI request failed"
            });
        }

        // Return the assistant's reply and the full response
        const reply = data.choices?.[0]?.message?.content || "";
        return res.status(200).json({
            reply,
            model: data.model,
            usage: data.usage
        });

    } catch (err) {
        console.error("Server error:", err);
        return res.status(500).json({ error: "Internal server error: " + err.message });
    }
}
