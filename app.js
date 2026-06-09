// Global Application State
let appState = {
    activeTab: 'tab-table',
    loadedDataset: null,
    chartInstance: null,
    // Conversation history for Azure OpenAI context
    conversationHistory: []
};

// UI Elements
const elements = {
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    welcomeWorkspace: document.getElementById('welcome-workspace'),
    promptInput: document.getElementById('prompt-input'),
    btnSend: document.getElementById('btn-send'),
    btnAttach: document.getElementById('btn-attach'),
    fileInput: document.getElementById('file-input'),
    attachmentPreviewBar: document.getElementById('attachment-preview-bar'),
    messagesContainer: document.getElementById('messages-container'),
    previewTable: document.getElementById('preview-table'),
    tableRowCount: document.getElementById('table-row-count'),
    tableFileName: document.getElementById('table-file-name'),
    btnLoadSample: document.getElementById('btn-load-sample'),
    btnNewChat: document.getElementById('btn-new-chat'),
    btnClearChat: document.getElementById('btn-clear-chat'),
    dropZone: document.getElementById('drop-zone'),
    dragOverlay: document.getElementById('drag-overlay'),
    datasetList: document.getElementById('dataset-list'),
    datasetPlaceholder: document.getElementById('dataset-placeholder'),
    codeBlock: document.getElementById('code-block'),
    promptChips: document.querySelectorAll('.prompt-chip'),
    quickToolCards: document.querySelectorAll('.quick-tool-card'),
    
    // Mobile Elements
    btnHamburger: document.getElementById('btn-hamburger'),
    btnSidebarClose: document.getElementById('btn-sidebar-close'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    btnToggleWorkspace: document.getElementById('btn-toggle-workspace'),
    btnBackToChat: document.getElementById('btn-back-to-chat'),
    sidebar: document.getElementById('sidebar')
};

// ----------------------------------------------------
// Init and Setup Events
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    setupTabSwitching();
    setupPromptInput();
    setupFileUpload();
    setupDragAndDrop();
    setupWorkspaceMockActions();
    setupChatActions();
    setupSuggestedPrompts();
    setupMobileToggles();
});

// ----------------------------------------------------
// Tab Switching System
// ----------------------------------------------------
function setupTabSwitching() {
    elements.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTabId = button.getAttribute('data-tab');
            
            // Update buttons active class
            elements.tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Update content panel active class
            elements.tabContents.forEach(content => {
                if (content.id === targetTabId) {
                    content.classList.add('active');
                    content.classList.remove('hidden');
                } else {
                    content.classList.remove('active');
                    content.classList.add('hidden');
                }
            });
            
            appState.activeTab = targetTabId;
        });
    });
}

function switchToTab(tabId) {
    const button = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (button) {
        button.click();
    }
}

// ----------------------------------------------------
// Prompt Input Logic
// ----------------------------------------------------
function setupPromptInput() {
    elements.promptInput.addEventListener('input', () => {
        // Auto grow height
        elements.promptInput.style.height = 'auto';
        elements.promptInput.style.height = `${elements.promptInput.scrollHeight}px`;
        
        // Enable/Disable send button
        const promptText = elements.promptInput.value.trim();
        elements.btnSend.disabled = promptText === '' && !elements.attachmentPreviewBar.hasChildNodes();
    });

    elements.promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!elements.btnSend.disabled) {
                handleSendPrompt();
            }
        }
    });

    elements.btnSend.addEventListener('click', handleSendPrompt);
}

// ----------------------------------------------------
// Suggested Chips & Quick Tools
// ----------------------------------------------------
function setupSuggestedPrompts() {
    elements.promptChips.forEach(chip => {
        chip.addEventListener('click', () => {
            elements.promptInput.value = chip.textContent.replace(/"/g, '');
            elements.promptInput.style.height = 'auto';
            elements.promptInput.style.height = `${elements.promptInput.scrollHeight}px`;
            elements.btnSend.disabled = false;
            elements.promptInput.focus();
        });
    });

    elements.quickToolCards.forEach(card => {
        card.addEventListener('click', () => {
            let prompt = '';
            if (card.id === 'tool-eda') {
                prompt = 'Realizar análise exploratória (EDA) detalhada';
            } else if (card.id === 'tool-clean') {
                prompt = 'Identificar e propor limpeza de valores nulos ou inconsistências';
            } else if (card.id === 'tool-correlation') {
                prompt = 'Calcular a matriz de correlação das colunas numéricas';
            }
            elements.promptInput.value = prompt;
            elements.promptInput.style.height = 'auto';
            elements.btnSend.disabled = false;
            handleSendPrompt();
        });
    });
}

// ----------------------------------------------------
// File Upload System
// ----------------------------------------------------
function setupFileUpload() {
    elements.btnAttach.addEventListener('click', () => {
        elements.fileInput.click();
    });

    elements.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
}

// Drag & Drop
function setupDragAndDrop() {
    ['dragenter', 'dragover'].forEach(eventName => {
        elements.dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            elements.dragOverlay.style.display = 'flex';
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        elements.dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            elements.dragOverlay.style.display = 'none';
        }, false);
    });

    elements.dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    }, false);
}

function handleFileSelect(file) {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
        addSystemMessageToChat(`Erro: Formato de arquivo não suportado. Apenas .csv ou .json são permitidos.`, true);
        return;
    }

    // Update Stage File Preview in Prompt box
    elements.attachmentPreviewBar.innerHTML = `
        <div class="attached-file-chip" id="staged-file" data-name="${file.name}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            <span>${file.name}</span>
            <button class="btn-remove-dataset" onclick="clearStagedFile()">&times;</button>
        </div>
    `;
    elements.attachmentPreviewBar.style.display = 'flex';
    elements.btnSend.disabled = false;

    // Load file reader
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        let parsed = null;
        if (file.name.endsWith('.csv')) {
            parsed = parseCSV(content);
        } else {
            parsed = parseJSON(content);
        }

        if (parsed) {
            parsed.name = file.name;
            parsed.size = formatBytes(file.size);
            // Stash in temporary load state (will commit once sent/prompt fired)
            appState.pendingDataset = parsed;
        }
    };
    reader.readAsText(file);
}

function clearStagedFile() {
    elements.attachmentPreviewBar.innerHTML = '';
    elements.attachmentPreviewBar.style.display = 'none';
    elements.fileInput.value = '';
    appState.pendingDataset = null;
    elements.btnSend.disabled = elements.promptInput.value.trim() === '';
}

// ----------------------------------------------------
// Data Parsing utilities
// ----------------------------------------------------
function parseCSV(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return null;
    
    // Quick CSV header and row parse
    const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, ''));
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/^["']|["']$/g, ''));
        if (values.length === headers.length) {
            rows.push(values);
        }
    }
    return { headers, rows };
}

function parseJSON(text) {
    try {
        const obj = JSON.parse(text);
        if (Array.isArray(obj) && obj.length > 0) {
            const headers = Object.keys(obj[0]);
            const rows = obj.map(item => headers.map(h => String(item[h] !== undefined ? item[h] : '')));
            return { headers, rows };
        } else if (typeof obj === 'object') {
            const headers = ['Métrica', 'Valor'];
            const rows = Object.entries(obj).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)]);
            return { headers, rows };
        }
    } catch (err) {
        console.error(err);
        return null;
    }
    return null;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ----------------------------------------------------
// Active Dataset Updates (UI)
// ----------------------------------------------------
function commitDataset(dataset) {
    appState.loadedDataset = dataset;
    
    // Hide welcome workspace
    elements.welcomeWorkspace.classList.add('hidden');
    
    // Show Table Tab contents
    elements.tabContents.forEach(tc => {
        if (tc.id === 'tab-table') {
            tc.classList.remove('hidden');
            tc.classList.add('active');
        }
    });
    switchToTab('tab-table');

    // Populate Sidebar loaded dataset list
    elements.datasetPlaceholder.style.display = 'none';
    elements.datasetList.innerHTML = `
        <li class="dataset-item">
            <span class="dataset-info">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" stroke-width="2" style="flex-shrink:0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                <div>
                    <div class="dataset-name" title="${dataset.name}">${dataset.name}</div>
                    <div class="dataset-size">${dataset.size || 'Tamanho desconhecido'}</div>
                </div>
            </span>
            <button class="btn-remove-dataset" id="btn-unload-data" title="Remover Dados">&times;</button>
        </li>
    `;
    
    document.getElementById('btn-unload-data').addEventListener('click', unloadDataset);

    // Populate Table View
    populateTable(dataset);
    
    // Draw Dynamic Chart
    generateChart(dataset);
    
    // Generate Python Code
    generateCode(dataset);

    // Auto switch to workspace view on mobile
    document.body.classList.add('show-workspace');
}

function unloadDataset() {
    appState.loadedDataset = null;
    elements.datasetList.innerHTML = `
        <li class="dataset-item placeholder-dataset" id="dataset-placeholder">
            <span class="dataset-info" style="color: var(--text-muted); font-style: italic;">
                Nenhum arquivo anexado
            </span>
        </li>
    `;
    
    // Clean preview table
    elements.previewTable.querySelector('thead').innerHTML = '';
    elements.previewTable.querySelector('tbody').innerHTML = '';
    elements.tableRowCount.textContent = 'Linhas: 0 | Colunas: 0';
    elements.tableFileName.textContent = 'Nenhum arquivo ativo';
    
    // Clean Code
    elements.codeBlock.textContent = '# Aguardando dados para gerar script...';

    // Destroy Chart
    if (appState.chartInstance) {
        appState.chartInstance.destroy();
        appState.chartInstance = null;
    }

    // Show Welcome Panel again
    elements.tabContents.forEach(tc => tc.classList.add('hidden'));
    elements.welcomeWorkspace.classList.remove('hidden');
    elements.tabButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="tab-table"]').classList.add('active');
}

function populateTable(dataset) {
    const thead = elements.previewTable.querySelector('thead');
    const tbody = elements.previewTable.querySelector('tbody');
    
    // Build Headers
    let headerHtml = '<tr>';
    dataset.headers.forEach(h => {
        headerHtml += `<th>${h}</th>`;
    });
    headerHtml += '</tr>';
    thead.innerHTML = headerHtml;

    // Build Rows (cap at 100 for performance)
    let bodyHtml = '';
    const visibleRows = dataset.rows.slice(0, 100);
    visibleRows.forEach(row => {
        bodyHtml += '<tr>';
        row.forEach(val => {
            bodyHtml += `<td>${val}</td>`;
        });
        bodyHtml += '</tr>';
    });
    tbody.innerHTML = bodyHtml;

    // Set count labels
    elements.tableRowCount.textContent = `Linhas: ${dataset.rows.length} | Colunas: ${dataset.headers.length}`;
    elements.tableFileName.textContent = dataset.name;
}

// ----------------------------------------------------
// Chart.js Generation
// ----------------------------------------------------
function generateChart(dataset) {
    if (appState.chartInstance) {
        appState.chartInstance.destroy();
    }

    const ctx = document.getElementById('mainChart').getContext('2d');
    
    // Analyze headers to identify numeric columns
    const numericColIndices = [];
    dataset.headers.forEach((h, idx) => {
        // Sample first row value to check if numeric
        if (dataset.rows.length > 0) {
            const val = parseFloat(dataset.rows[0][idx]);
            if (!isNaN(val) && isFinite(dataset.rows[0][idx])) {
                numericColIndices.push(idx);
            }
        }
    });

    let chartType = 'line';
    let labels = [];
    let datasets = [];

    // Let's customize for our standard sample data specifically if loaded
    const isSampleData = dataset.name === 'sample_data.csv';

    if (isSampleData) {
        // Date, Region, Sales, AdSpend, Clicks, ConversionRate
        labels = dataset.rows.map(r => r[0]); // Dates
        const salesData = dataset.rows.map(r => parseFloat(r[2]));
        const adSpendData = dataset.rows.map(r => parseFloat(r[3]));
        
        document.getElementById('chart-main-title').textContent = 'Análise de Investimento vs Vendas';
        document.getElementById('chart-sub-title').textContent = 'Comparativo de Faturamento e Gastos com Anúncios (Marketing)';

        datasets = [
            {
                label: 'Faturamento (Vendas)',
                data: salesData,
                borderColor: '#ffcc00',
                backgroundColor: 'rgba(255, 204, 0, 0.1)',
                borderWidth: 3,
                tension: 0.3,
                yAxisID: 'ySales',
                fill: true
            },
            {
                label: 'Investimento em Anúncios (Marketing)',
                data: adSpendData,
                borderColor: '#60a5fa',
                backgroundColor: 'transparent',
                borderWidth: 2.5,
                borderDash: [5, 5],
                tension: 0.2,
                yAxisID: 'ySpend'
            }
        ];

        appState.chartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#f8fafc', font: { family: 'Outfit' } }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
                    },
                    ySales: {
                        position: 'left',
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#ffcc00', font: { family: 'Outfit' } },
                        title: { display: true, text: 'Vendas ($)', color: '#ffcc00' }
                    },
                    ySpend: {
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: { color: '#60a5fa', font: { family: 'Outfit' } },
                        title: { display: true, text: 'Investimento ($)', color: '#60a5fa' }
                    }
                }
            }
        });
    } else {
        // Fallback chart: plot first numeric column or just simple bar
        if (numericColIndices.length > 0) {
            const numIdx = numericColIndices[0];
            const colName = dataset.headers[numIdx];
            
            // X labels: use first column (often ID, Date, or Name)
            labels = dataset.rows.slice(0, 20).map(r => r[0]); 
            const dataVals = dataset.rows.slice(0, 20).map(r => parseFloat(r[numIdx]));

            document.getElementById('chart-main-title').textContent = `Métrica: ${colName}`;
            document.getElementById('chart-sub-title').textContent = `Distribuição dos primeiros 20 registros`;

            datasets = [{
                label: colName,
                data: dataVals,
                backgroundColor: 'rgba(255, 204, 0, 0.6)',
                borderColor: '#ffcc00',
                borderWidth: 1
            }];

            chartType = 'bar';
            
            appState.chartInstance = new Chart(ctx, {
                type: chartType,
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#f8fafc' } }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            ticks: { color: '#94a3b8' }
                        },
                        y: {
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            ticks: { color: '#94a3b8' }
                        }
                    }
                }
            });
        } else {
            // No numeric columns, display static visual fallback
            document.getElementById('chart-main-title').textContent = 'Nenhuma Coluna Numérica Encontrada';
            document.getElementById('chart-sub-title').textContent = 'A plotagem automática precisa de colunas de números';
        }
    }
}

// ----------------------------------------------------
// Python Code Generation (Mock)
// ----------------------------------------------------
function generateCode(dataset) {
    const isSample = dataset.name === 'sample_data.csv';
    let codeStr = '';

    if (isSample) {
        codeStr = `<span class="py-keyword">import</span> pandas <span class="py-keyword">as</span> pd
<span class="py-keyword">import</span> matplotlib.pyplot <span class="py-keyword">as</span> plt
<span class="py-keyword">import</span> seaborn <span class="py-keyword">as</span> sns
<span class="py-keyword">from</span> sklearn.linear_model <span class="py-keyword">import</span> LinearRegression
<span class="py-keyword">from</span> sklearn.model_selection <span class="py-keyword">import</span> train_test_split

<span class="py-comment"># 1. Carregar o arquivo enviado no workspace</span>
df = pd.read_csv(<span class="py-string">'sample_data.csv'</span>)

<span class="py-comment"># 2. Estatísticas Descritivas Básicas</span>
print(<span class="py-string">"--- Resumo Estatístico ---"</span>)
print(df.describe())

<span class="py-comment"># 3. Modelagem Preditiva (Regressão de Marketing)</span>
<span class="py-comment"># X: Investimento em Marketing (AdSpend), y: Faturamento Total (Sales)</span>
X = df[[<span class="py-string">'AdSpend'</span>]]
y = df[<span class="py-string">'Sales'</span>]

<span class="py-comment"># Separação de treino/teste</span>
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=<span class="py-number">0.2</span>, random_state=<span class="py-number">42</span>)

<span class="py-comment"># Treinar Modelo de Regressão Linear</span>
model = LinearRegression()
model.fit(X_train, y_train)

<span class="py-comment"># Predições e Coeficientes</span>
score = model.score(X_test, y_test)
print(f<span class="py-string">"Coeficiente R² de Validação: {score:.4f}"</span>)
print(f<span class="py-string">"Fórmula: Vendas = {model.coef_[0]:.2f} * Marketing + {model.intercept_:.2f}"</span>)

<span class="py-comment"># 4. Plotar correlação e salvar</span>
plt.figure(figsize=(<span class="py-number">8</span>, <span class="py-number">6</span>))
sns.heatmap(df[[<span class="py-string">'Sales'</span>, <span class="py-string">'AdSpend'</span>, <span class="py-string">'Clicks'</span>, <span class="py-string">'ConversionRate'</span>]].corr(), annot=<span class="py-keyword">True</span>, cmap=<span class="py-string">'viridis'</span>)
plt.title(<span class="py-string">'Matriz de Correlação das Métricas'</span>)
plt.savefig(<span class="py-string">'correlation_matrix.png'</span>)
print(<span class="py-string">"Gráfico salvo com sucesso!"</span>)
`;
    } else {
        const columnsFormatted = dataset.headers.map(h => `'${h}'`).join(', ');
        codeStr = `<span class="py-keyword">import</span> pandas <span class="py-keyword">as</span> pd

<span class="py-comment"># 1. Carregar arquivo customizado</span>
df = pd.read_csv(<span class="py-string">'${dataset.name}'</span>)

<span class="py-comment"># 2. Informações estruturais das colunas</span>
print(<span class="py-string">"Dataset carregado com sucesso."</span>)
print(f<span class="py-string">"Linhas: {df.shape[0]} | Colunas: {df.shape[1]}"</span>)
print(<span class="py-string">"Colunas encontradas: [${columnsFormatted}]"</span>)

<span class="py-comment"># 3. Mostrar tipos de dados</span>
print(df.dtypes)

<span class="py-comment"># 4. Exibir as primeiras 5 linhas</span>
print(df.head())
`;
    }

    elements.codeBlock.innerHTML = codeStr;
}

// Copy Code Button
elements.btnCopyCode.addEventListener('click', () => {
    // Strip HTML tags for clean text copy
    const cleanText = elements.codeBlock.textContent;
    navigator.clipboard.writeText(cleanText).then(() => {
        const oldText = elements.btnCopyCode.textContent;
        elements.btnCopyCode.textContent = 'Copiado!';
        elements.btnCopyCode.style.borderColor = 'var(--success)';
        elements.btnCopyCode.style.color = 'var(--success)';
        setTimeout(() => {
            elements.btnCopyCode.textContent = oldText;
            elements.btnCopyCode.style.borderColor = '';
            elements.btnCopyCode.style.color = '';
        }, 1500);
    });
});

// ----------------------------------------------------
// Welcome Panel Button - Load Sample
// ----------------------------------------------------
function setupWorkspaceMockActions() {
    elements.btnLoadSample.addEventListener('click', () => {
        // Fetch sample file content
        fetch('sample_data.csv')
            .then(res => {
                if (!res.ok) throw new Error("Could not load local file");
                return res.text();
            })
            .then(csvText => {
                const parsed = parseCSV(csvText);
                if (parsed) {
                    parsed.name = 'sample_data.csv';
                    parsed.size = '342 Bytes';
                    
                    // Simulate loading process in chat
                    simulateAISteps('Carregar dataset sample_data.csv', parsed);
                }
            })
            .catch(err => {
                console.error("Local fetch failed, running simulated hardcoded fallback", err);
                // Hardcoded fallback in case server setup has MIME/fetch issues
                const fallbackCsv = `Date,Region,Sales,AdSpend,Clicks,ConversionRate
2026-05-01,North,15200,1200,850,0.045
2026-05-02,South,18400,1500,980,0.048
2026-05-03,East,22100,1800,1200,0.052
2026-05-04,West,14100,1100,740,0.041
2026-05-05,North,16800,1300,910,0.046`;
                const parsed = parseCSV(fallbackCsv);
                parsed.name = 'sample_data.csv';
                parsed.size = '185 Bytes';
                simulateAISteps('Carregar dataset sample_data.csv', parsed);
            });
    });
}

// ----------------------------------------------------
// Chat & AI Interaction Logic
// ----------------------------------------------------
function handleSendPrompt() {
    const promptText = elements.promptInput.value.trim();
    const stagedFile = appState.pendingDataset;

    if (promptText === '' && !stagedFile) return;

    // 1. Add User Message
    addUserMessageToChat(promptText, stagedFile);

    // 2. Clear staging state & input
    const committedFile = stagedFile;
    clearStagedFile();
    elements.promptInput.value = '';
    elements.promptInput.style.height = 'auto';
    elements.btnSend.disabled = true;

    // 3. Add user message to conversation history
    let userContent = promptText || 'Carregando arquivo de dados para análise.';
    if (committedFile) {
        userContent = `${userContent}\n\n[Arquivo: ${committedFile.name} | Colunas: ${committedFile.headers.join(', ')} | Linhas: ${committedFile.rows.length}]`;
    }
    appState.conversationHistory.push({ role: 'user', content: userContent });

    // 4. Trigger AI processing animation + real Azure call
    runAzureAISteps(promptText, committedFile);
}

function addUserMessageToChat(text, file) {
    let fileHtml = '';
    if (file) {
        fileHtml = `
            <div class="attached-file-chip" style="margin-bottom: 8px; width: fit-content;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                <span>${file.name} (${file.size})</span>
            </div>
        `;
    }

    const messageHtml = `
        <div class="message-wrapper user">
            <div class="msg-avatar">M</div>
            <div class="message-bubble">
                ${fileHtml}
                <p>${escapeHtml(text)}</p>
            </div>
        </div>
    `;
    elements.messagesContainer.insertAdjacentHTML('beforeend', messageHtml);
    scrollToBottom();
}

function addSystemMessageToChat(text, isError = false) {
    const color = isError ? 'var(--error)' : 'var(--accent-color)';
    const messageHtml = `
        <div class="message-wrapper assistant">
            <div class="msg-avatar">DS</div>
            <div class="message-bubble" style="border-color: ${color};">
                <p style="color: ${color}; font-weight: 600;">Notificação do Sistema</p>
                <p>${escapeHtml(text)}</p>
            </div>
        </div>
    `;
    elements.messagesContainer.insertAdjacentHTML('beforeend', messageHtml);
    scrollToBottom();
}

// ----------------------------------------------------
// Azure OpenAI Real Integration
// ----------------------------------------------------
async function runAzureAISteps(promptText, fileToCommit) {
    const isEda = promptText.toLowerCase().includes('eda') || promptText.toLowerCase().includes('exploratória') || promptText.toLowerCase().includes('exploratoria');
    const isClean = promptText.toLowerCase().includes('limpar') || promptText.toLowerCase().includes('nulo') || promptText.toLowerCase().includes('limpeza');
    const isCorrelation = promptText.toLowerCase().includes('correlação') || promptText.toLowerCase().includes('correlacao') || promptText.toLowerCase().includes('correl');

    const stepContainerId = 'steps-' + Date.now();
    const spinnerSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`;

    // Inject the animated message bubble
    const messageHtml = `
        <div class="message-wrapper assistant">
            <div class="msg-avatar">DS</div>
            <div class="message-bubble">
                <p><strong>Processando Solicitação de Análise</strong></p>
                <div class="analysis-steps" id="${stepContainerId}">
                    <div class="analysis-step running" id="${stepContainerId}-1">
                        ${spinnerSvg}
                        <span>Carregando e validando estrutura de dados...</span>
                    </div>
                </div>
                <div class="ai-final-text hidden" id="${stepContainerId}-text"></div>
            </div>
        </div>
    `;
    elements.messagesContainer.insertAdjacentHTML('beforeend', messageHtml);
    scrollToBottom();

    const container = document.getElementById(stepContainerId);

    // --- STEP 1: Commit dataset if provided (instant) ---
    if (fileToCommit) {
        commitDataset(fileToCommit);
    } else if (!appState.loadedDataset) {
        loadSampleSilent();
    }

    await delay(600);
    markStepCompleted(stepContainerId + '-1');
    addAnalysisStep(container, stepContainerId + '-2', 'Consultando o modelo Azure OpenAI (gpt-4.1)...');
    scrollToBottom();

    // --- STEP 2: Fire the real Azure OpenAI request in parallel ---
    // Build a compact dataset context summary string for the system prompt
    let datasetContext = null;
    if (appState.loadedDataset) {
        const ds = appState.loadedDataset;
        const sampleRows = ds.rows.slice(0, 5).map(r => r.join(', ')).join('\n');
        datasetContext = `Nome: ${ds.name}\nColunas (${ds.headers.length}): ${ds.headers.join(', ')}\nLinhas totais: ${ds.rows.length}\nPrimeiras 5 linhas:\n${sampleRows}`;
    }

    const azurePromise = callAzureOpenAI(appState.conversationHistory, datasetContext);

    await delay(900);
    markStepCompleted(stepContainerId + '-2');
    addAnalysisStep(container, stepContainerId + '-3', 'Renderizando visualizações interativas...');
    scrollToBottom();

    // Re-render chart based on prompt context
    if (appState.loadedDataset) {
        if (isCorrelation) {
            generateCorrelationHeatmapMock();
        } else if (isClean) {
            generateCleanScatterMock();
        } else {
            generateChart(appState.loadedDataset);
        }
    }

    await delay(700);
    markStepCompleted(stepContainerId + '-3');
    addAnalysisStep(container, stepContainerId + '-4', 'Recebendo resposta do modelo...');
    scrollToBottom();

    // --- STEP 3: Await the real Azure response ---
    const azureResult = await azurePromise;

    markStepCompleted(stepContainerId + '-4');

    const textBox = document.getElementById(stepContainerId + '-text');
    const responseText = azureResult.reply || azureResult.error || 'Sem resposta do modelo.';

    // Add assistant message to conversation history
    if (azureResult.reply) {
        appState.conversationHistory.push({ role: 'assistant', content: azureResult.reply });
    }

    // Render the Markdown-like response from the model
    textBox.innerHTML = renderMarkdown(responseText);
    textBox.classList.remove('hidden');

    // Optionally switch tabs based on keywords in the real response
    const replyLower = responseText.toLowerCase();
    if (isCorrelation || isClean || isEda || replyLower.includes('gráfico') || replyLower.includes('grafico')) {
        switchToTab('tab-charts');
    } else if (replyLower.includes('código') || replyLower.includes('python') || replyLower.includes('import pandas')) {
        switchToTab('tab-code');
    }

    // Auto-generate Python code if the response contains code
    if (appState.loadedDataset) {
        generateCode(appState.loadedDataset);
    }

    // Auto switch to workspace view on mobile
    document.body.classList.add('show-workspace');
    scrollToBottom();
}

// Helper: delay utility
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: call the Vercel serverless proxy to Azure OpenAI
async function callAzureOpenAI(messages, datasetContext) {
    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages,
                datasetContext,
                temperature: 0.7,
                top_p: 0.95
            })
        });

        if (!res.ok) {
            const errData = await res.json();
            return { error: `Erro da API (${res.status}): ${errData.error || 'Falha desconhecida'}` };
        }

        return await res.json();
    } catch (err) {
        return { error: `Erro de conexão: ${err.message}` };
    }
}

// Helper: minimal Markdown renderer (bold, italics, code, bullets, newlines)
function renderMarkdown(text) {
    if (!text) return '';
    let html = escapeHtml(text)
        // Code blocks ```lang\n...\n```
        .replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) => `<pre style="background:rgba(0,0,0,0.3);padding:12px;border-radius:8px;overflow-x:auto;margin:8px 0;"><code style="font-family:var(--font-mono);font-size:12px;color:#a7f3d0;white-space:pre;">${code.trim()}</code></pre>`)
        // Inline code `..`
        .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:2px 5px;border-radius:4px;font-family:var(--font-mono);font-size:12px;color:#ffcc00;">$1</code>')
        // Bold **...**
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic *...*
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Bullet - ...
        .replace(/^[-•] (.+)$/gm, '<li style="margin-left:16px;margin-bottom:4px;">$1</li>')
        // Numbered list 1. ...
        .replace(/^\d+\. (.+)$/gm, '<li style="margin-left:16px;margin-bottom:4px;">$1</li>')
        // Wrap consecutive <li> in <ul>
        .replace(/((<li[^>]*>.*<\/li>\n?)+)/g, '<ul style="margin:8px 0;">$1</ul>')
        // Headers ### ...
        .replace(/^### (.+)$/gm, '<h4 style="color:var(--accent-color);margin:12px 0 4px;">$1</h4>')
        .replace(/^## (.+)$/gm, '<h3 style="color:var(--accent-color);margin:12px 0 6px;">$1</h3>')
        // Newlines → paragraphs
        .replace(/\n\n+/g, '</p><p style="margin-top:10px;">')
        .replace(/\n/g, '<br>');
    return `<p>${html}</p>`;
}

function addAnalysisStep(container, id, text) {
    const html = `
        <div class="analysis-step running" id="${id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
            <span>${escapeHtml(text)}</span>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    scrollToBottom();
}

function markStepCompleted(stepId) {
    const stepEl = document.getElementById(stepId);
    if (stepEl) {
        stepEl.classList.remove('running');
        stepEl.classList.add('completed');
        stepEl.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>${stepEl.querySelector('span').textContent}</span>
        `;
    }
}

// getSimulatedTextResponse removed — real answers now come from Azure OpenAI gpt-4.1

// Helper to load sample data without chat spam (used internally if user prompts without dataset)
function loadSampleSilent() {
    const fallbackCsv = `Date,Region,Sales,AdSpend,Clicks,ConversionRate
2026-05-01,North,15200,1200,850,0.045
2026-05-02,South,18400,1500,980,0.048
2026-05-03,East,22100,1800,1200,0.052
2026-05-04,West,14100,1100,740,0.041
2026-05-05,North,16800,1300,910,0.046
2026-05-06,South,19500,1600,1050,0.049
2026-05-07,East,24000,2000,1350,0.055
2026-05-08,West,15900,1250,810,0.043
2026-05-09,North,17200,1400,940,0.047
2026-05-10,South,21000,1700,1120,0.051
2026-05-11,East,25500,2100,1420,0.057
2026-05-12,West,16500,1300,860,0.044`;
    const parsed = parseCSV(fallbackCsv);
    parsed.name = 'sample_data.csv';
    parsed.size = '342 Bytes';
    commitDataset(parsed);
}

// ----------------------------------------------------
// Specialized Chart Mocks based on query
// ----------------------------------------------------
function generateCorrelationHeatmapMock() {
    if (appState.chartInstance) appState.chartInstance.destroy();
    
    const ctx = document.getElementById('mainChart').getContext('2d');
    
    document.getElementById('chart-main-title').textContent = 'Matriz de Correlação Linear (Pearson)';
    document.getElementById('chart-sub-title').textContent = 'Representação de força de relação de variáveis numéricas';

    // Mock Heatmap using a Grouped Bar chart representing correlation values for Sales, AdSpend, Clicks, ConvRate
    appState.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Sales (Vendas)', 'AdSpend (Mkt)', 'Clicks (Cliques)', 'ConversionRate'],
            datasets: [
                {
                    label: 'Sales (Vendas)',
                    data: [1, 0.98, 0.97, 0.44],
                    backgroundColor: 'rgba(255, 204, 0, 0.8)'
                },
                {
                    label: 'AdSpend (Mkt)',
                    data: [0.98, 1, 0.96, 0.38],
                    backgroundColor: 'rgba(96, 165, 250, 0.8)'
                },
                {
                    label: 'Clicks (Cliques)',
                    data: [0.97, 0.96, 1, 0.52],
                    backgroundColor: 'rgba(16, 185, 129, 0.8)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#f8fafc' } }
            },
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
                y: { min: -1, max: 1, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

function generateCleanScatterMock() {
    if (appState.chartInstance) appState.chartInstance.destroy();
    
    const ctx = document.getElementById('mainChart').getContext('2d');
    
    document.getElementById('chart-main-title').textContent = 'Distribuição de Faturamento por Investimento';
    document.getElementById('chart-sub-title').textContent = 'Análise de dispersão de resíduos para detecção de anomalias (Sem outliers extremos)';

    const scatterPoints = appState.loadedDataset.rows.map(r => {
        return { x: parseFloat(r[3]), y: parseFloat(r[2]) }; // x: AdSpend, y: Sales
    });

    appState.chartInstance = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Pontos Observados',
                data: scatterPoints,
                backgroundColor: '#ffcc00',
                borderColor: '#ffffff',
                borderWidth: 1,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#f8fafc' } }
            },
            scales: {
                x: { 
                    title: { display: true, text: 'Investimento em Anúncios (USD)', color: '#94a3b8' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }, 
                    ticks: { color: '#94a3b8' } 
                },
                y: { 
                    title: { display: true, text: 'Faturamento Total (USD)', color: '#94a3b8' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }, 
                    ticks: { color: '#94a3b8' } 
                }
            }
        }
    });
}

// ----------------------------------------------------
// Chat Thread management & cleaning
// ----------------------------------------------------
function setupChatActions() {
    elements.btnNewChat.addEventListener('click', () => {
        // Reset conversation history for a fresh context
        appState.conversationHistory = [];
        unloadDataset();
        elements.messagesContainer.innerHTML = `
            <div class="message-wrapper assistant">
                <div class="msg-avatar">DS</div>
                <div class="message-bubble">
                    <p>Novo espaço de conversa iniciado. Como eu, seu <strong>Data Scientist</strong> (powered by Azure OpenAI <strong>gpt-4.1</strong>), posso ajudar você agora?</p>
                    <p>Anexe novos datasets ou comece a formular perguntas de análise.</p>
                </div>
            </div>
        `;
        document.body.classList.remove('show-workspace');
    });

    elements.btnClearChat.addEventListener('click', () => {
        // Also reset conversation history
        appState.conversationHistory = [];
        elements.messagesContainer.innerHTML = `
            <div class="message-wrapper assistant">
                <div class="msg-avatar">DS</div>
                <div class="message-bubble">
                    <p>O histórico de conversas foi limpo. O contexto com o modelo foi reiniciado.</p>
                </div>
            </div>
        `;
    });
}

// ----------------------------------------------------
// Utility Functions
// ----------------------------------------------------
function scrollToBottom() {
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

function escapeHtml(string) {
    return String(string)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ----------------------------------------------------
// Mobile UI Handlers
// ----------------------------------------------------
function setupMobileToggles() {
    // Open Sidebar drawer
    if (elements.btnHamburger) {
        elements.btnHamburger.addEventListener('click', () => {
            document.body.classList.add('sidebar-open');
        });
    }

    // Close Sidebar drawer
    if (elements.btnSidebarClose) {
        elements.btnSidebarClose.addEventListener('click', () => {
            document.body.classList.remove('sidebar-open');
        });
    }

    // Close Sidebar on backdrop click
    if (elements.sidebarOverlay) {
        elements.sidebarOverlay.addEventListener('click', () => {
            document.body.classList.remove('sidebar-open');
        });
    }

    // Open Workspace panel on mobile
    if (elements.btnToggleWorkspace) {
        elements.btnToggleWorkspace.addEventListener('click', () => {
            document.body.classList.add('show-workspace');
        });
    }

    // Return to Chat panel on mobile
    if (elements.btnBackToChat) {
        elements.btnBackToChat.addEventListener('click', () => {
            document.body.classList.remove('show-workspace');
        });
    }

    // Close sidebar drawer if a history item is clicked on mobile
    const historyItems = document.querySelectorAll('.history-item');
    historyItems.forEach(item => {
        item.addEventListener('click', () => {
            document.body.classList.remove('sidebar-open');
        });
    });
}
