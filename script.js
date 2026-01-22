// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function showLoading() {
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('pt-BR');
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function showNotification(message, type = 'success') {
    alert(message); // Pode ser substituído por uma notificação mais elegante
}

// ============================================
// AUTENTICAÇÃO E LOGIN
// ============================================

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showNotification('Por favor, preencha todos os campos', 'error');
        return;
    }

    showLoading();

    try {
        // Fazer login com Firebase Auth
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Buscar dados do usuário no database
        const userSnapshot = await usersRef.child(user.uid).once('value');
        const userData = userSnapshot.val();

        if (!userData) {
            throw new Error('Usuário não encontrado no banco de dados');
        }

        currentUser = {
            uid: user.uid,
            email: user.email,
            ...userData
        };

        // Redirecionar baseado no role
        if (userData.role === 'admin') {
            showScreen('adminScreen');
            loadAdminData();
        } else {
            showScreen('resellerScreen');
            loadResellerData();
        }

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro no login:', error);
        showNotification('E-mail ou senha incorretos', 'error');
    }
}

function logout() {
    auth.signOut().then(() => {
        currentUser = null;
        showScreen('loginScreen');
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
    });
}

// Monitorar estado de autenticação
auth.onAuthStateChanged(async (user) => {
    if (user && !currentUser) {
        showLoading();
        try {
            const userSnapshot = await usersRef.child(user.uid).once('value');
            const userData = userSnapshot.val();
            
            if (userData) {
                currentUser = {
                    uid: user.uid,
                    email: user.email,
                    ...userData
                };

                if (userData.role === 'admin') {
                    showScreen('adminScreen');
                    loadAdminData();
                } else {
                    showScreen('resellerScreen');
                    loadResellerData();
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
        }
        hideLoading();
    }
});

// ============================================
// NAVEGAÇÃO DE TABS
// ============================================

function switchTab(tabName) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');

    if (tabName === 'sales') {
        loadProducts();
        loadSoldProducts();
    } else if (tabName === 'payments') {
        loadPayments();
    } else if (tabName === 'clients') {
        loadClients();
    } else if (tabName === 'goals') {
        loadGoalsForm();
    } else if (tabName === 'dashboard') {
        updateDashboard();
    }
}

function switchAdminTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (typeof event !== 'undefined' && event && event.target && event.target.classList && event.target.classList.contains('tab-btn')) {
        event.target.classList.add('active');
    } else {
        const btn = document.querySelector(`button[onclick="switchAdminTab('${tabName}')"]`);
        if (btn) btn.classList.add('active');
    }

    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (tabName === 'dashboard') {
        document.getElementById('adminDashboard').classList.add('active');
        loadAdminDashboard();
        loadPendingSettlements(); // Carregar solicitações de acerto
    } else if (tabName === 'products') {
        // Aba de produtos desativada
        // document.getElementById('adminProducts').classList.add('active');
        // loadAdminProducts();
    } else if (tabName === 'resellers') {
        document.getElementById('adminResellers').classList.add('active');
        loadResellers();
    } else if (tabName === 'orders') {
        document.getElementById('adminOrders').classList.add('active');
        loadOrders();
    }
}

// ============================================
// ADMIN - DASHBOARD & GRÁFICOS
// ============================================

let adminChart = null;
let adminCategoryChart = null;
let dashboardData = { sales: [], resellers: [] };

async function loadAdminDashboard() {
    showLoading();

    try {
        const [salesSnapshot, resellersSnapshot, productsSnapshot] = await Promise.all([
            salesRef.once('value'),
            usersRef.orderByChild('role').equalTo('reseller').once('value'),
            productsRef.once('value')
        ]);

        // Atualizar filtro de revendedoras
        const filterSelect = document.getElementById('dashboardResellerFilter');
        const currentFilter = filterSelect.value;
        
        const resellers = [];
        resellersSnapshot.forEach(child => {
            resellers.push({ id: child.key, ...child.val() });
        });

        let options = '<option value="">Todas as Revendedoras</option>';
        resellers.forEach(r => {
            options += `<option value="${r.id}" ${r.id === currentFilter ? 'selected' : ''}>${r.name}</option>`;
        });
        filterSelect.innerHTML = options;

        const sales = [];
        salesSnapshot.forEach((child) => {
            sales.push(child.val());
        });

        // Mapear categorias dos produtos
        const productCategories = {};
        productsSnapshot.forEach(child => {
            const p = child.val();
            productCategories[child.key] = p.category || 'Sem Categoria';
        });

        // Filtrar vendas se houver revendedora selecionada
        const filteredSales = currentFilter ? sales.filter(s => s.resellerId === currentFilter) : sales;

        // Calcular totais gerais
        const totalValue = filteredSales.reduce((sum, sale) => sum + sale.price, 0);
        document.getElementById('adminTotalSales').textContent = formatCurrency(totalValue);
        document.getElementById('adminTotalCount').textContent = filteredSales.length;

        // Processar dados para o gráfico de Barras (Agrupar por mês)
        const salesByMonth = {};
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        // Inicializar últimos 6 meses
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = `${months[d.getMonth()]}/${d.getFullYear().toString().substr(2)}`;
            salesByMonth[key] = 0;
        }

        filteredSales.forEach(sale => {
            const date = new Date(sale.date);
            const key = `${months[date.getMonth()]}/${date.getFullYear().toString().substr(2)}`;
            if (salesByMonth.hasOwnProperty(key)) {
                salesByMonth[key] += sale.price;
            }
        });

        renderSalesChart(Object.keys(salesByMonth), Object.values(salesByMonth));

        // Processar dados para o gráfico de Pizza (Agrupar por Categoria)
        const salesByCategory = {};
        filteredSales.forEach(sale => {
            // Usa o ID do produto na venda para achar a categoria no mapa de produtos
            const category = productCategories[sale.productId] || 'Outros';
            salesByCategory[category] = (salesByCategory[category] || 0) + sale.price;
        });

        renderCategoryChart(Object.keys(salesByCategory), Object.values(salesByCategory));

        dashboardData = { sales, resellers };
        renderResellerRanking(sales, resellers);
        loadPendingSettlements(); // Carregar solicitações de acerto

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar dashboard:', error);
    }
}

function renderSalesChart(labels, data) {
    const ctx = document.getElementById('salesChart').getContext('2d');

    // Destruir gráfico anterior se existir para evitar sobreposição
    if (adminChart) {
        adminChart.destroy();
    }

    adminChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Vendas Mensais (R$)',
                data: data,
                backgroundColor: '#2c1810',
                borderColor: '#2c1810',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Desempenho de Vendas (Últimos 6 Meses)'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value;
                        }
                    }
                }
            }
        }
    });
}

function renderCategoryChart(labels, data) {
    const ctx = document.getElementById('categoryChart').getContext('2d');

    if (adminCategoryChart) {
        adminCategoryChart.destroy();
    }

    // Paleta de cores baseada no tema (Marrons, Dourados, Cremes)
    const colors = [
        '#2c1810', // Marrom Escuro
        '#d4a574', // Dourado
        '#8b5e3c', // Marrom Médio
        '#e5c19d', // Bege Escuro
        '#5d4037', // Café
        '#a1887f'  // Taupe
    ];

    adminCategoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'right' },
                title: {
                    display: true,
                    text: 'Vendas por Categoria (R$)'
                }
            }
        }
    });
}

function renderResellerRanking(sales, resellers) {
    let container = document.getElementById('adminRankingContainer');
    
    if (!container) {
        const dashboard = document.getElementById('adminDashboard');
        if (dashboard) {
            container = document.createElement('div');
            container.id = 'adminRankingContainer';
            container.style.marginTop = '20px';
            container.style.padding = '20px';
            container.style.backgroundColor = 'white';
            container.style.borderRadius = '8px';
            container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            dashboard.appendChild(container);
        } else {
            return;
        }
    }

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
            <h3 style="margin: 0; color: #2c1810;">🏆 Ranking (Top 5)</h3>
            <select onchange="updateRankingList(this.value)" style="padding: 5px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9em; background: white;">
                <option value="current">Este Mês</option>
                <option value="last">Mês Passado</option>
                <option value="all">Geral</option>
            </select>
        </div>
        <div id="rankingListContainer" style="display: flex; flex-direction: column; gap: 10px;"></div>
    `;

    updateRankingList('current');
}

function updateRankingList(period) {
    const container = document.getElementById('rankingListContainer');
    if (!container) return;

    const { sales, resellers } = dashboardData;
    if (!sales || !resellers) return;

    let filteredSales = sales;
    const now = new Date();

    if (period === 'current') {
        filteredSales = sales.filter(s => {
            const d = new Date(s.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
    } else if (period === 'last') {
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        filteredSales = sales.filter(s => {
            const d = new Date(s.date);
            return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
        });
    }

    const resellerMap = {};
    resellers.forEach(r => {
        resellerMap[r.id] = { name: r.name, total: 0, count: 0 };
    });

    filteredSales.forEach(s => {
        if (resellerMap[s.resellerId]) {
            resellerMap[s.resellerId].total += (Number(s.price) || 0);
            resellerMap[s.resellerId].count++;
        }
    });

    const ranking = Object.values(resellerMap)
        .filter(r => r.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    if (ranking.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 15px; color: #666;">Nenhuma venda neste período.</div>';
        return;
    }

    container.innerHTML = ranking.map((r, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
        const isTop = index === 0;
        
        return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: ${isTop ? '#fffde7' : '#f8f9fa'}; border-radius: 6px; border: 1px solid ${isTop ? '#fbc02d' : '#eee'};">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.2em; font-weight: bold; width: 30px; text-align: center;">${medal}</span>
                    <div>
                        <div style="font-weight: 600; color: #333;">${r.name}</div>
                        <div style="font-size: 0.8em; color: #666;">${r.count} vendas</div>
                    </div>
                </div>
                <div style="font-weight: bold; color: #2c1810; font-size: 1.1em;">${formatCurrency(r.total)}</div>
            </div>
        `;
    }).join('');
}

// ============================================
// ADMIN - GESTÃO DE ACERTOS (DEVOLUÇÕES)
// ============================================

async function loadPendingSettlements() {
    const container = document.getElementById('adminSettlementsContainer');
    
    // Criar container se não existir
    if (!container) {
        const dashboard = document.getElementById('adminDashboard');
        const div = document.createElement('div');
        div.id = 'adminSettlementsContainer';
        div.style.marginTop = '20px';
        dashboard.insertBefore(div, dashboard.firstChild); // Colocar no topo
    }

    try {
        const snapshot = await settlementsRef.orderByChild('status').equalTo('pending').once('value');
        const settlements = [];
        snapshot.forEach(child => settlements.push({ id: child.key, ...child.val() }));

        const wrapper = document.getElementById('adminSettlementsContainer');
        
        if (settlements.length === 0) {
            wrapper.innerHTML = ''; // Limpa se não tiver nada
            return;
        }

        wrapper.innerHTML = `
            <div style="background: #fff3cd; border: 1px solid #ffeeba; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #856404; margin-bottom: 10px;">⚠️ Solicitações de Acerto Pendentes</h3>
                ${settlements.map(s => `
                    <div style="background: white; padding: 10px; border-radius: 4px; margin-bottom: 10px; border: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                        <div>
                            <strong>${s.resellerName}</strong><br>
                            <span style="font-size: 0.9em; color: #666;">Data: ${formatDate(s.createdAt)}</span>
                        </div>
                        <div style="text-align: right;">
                            <div>Vendido: <strong>${formatCurrency(s.totalSold)}</strong></div>
                            <div>Comissão: <strong>${formatCurrency(s.totalCommission)}</strong></div>
                            <div style="color: #dc3545;">Devolução: <strong>${s.returnedCount} itens</strong></div>
                        </div>
                        <button class="btn-primary" onclick="finalizeSettlement('${s.id}')" style="background-color: #28a745;">✅ Finalizar Acerto</button>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Erro ao carregar acertos:', error);
    }
}

async function finalizeSettlement(settlementId) {
    if (!confirm('Confirma o recebimento das devoluções e finalização deste acerto?')) return;

    showLoading();
    try {
        // 1. Buscar dados do acerto para registrar o pagamento
        const snapshot = await settlementsRef.child(settlementId).once('value');
        const settlement = snapshot.val();

        if (!settlement) throw new Error('Acerto não encontrado');

        // 2. Atualizar status
        await settlementsRef.child(settlementId).update({
            status: 'completed',
            finalizedAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        // 3. Criar registro na tabela de vendas (Valor que a revendedora paga)
        const amountDue = settlement.totalSold - settlement.totalCommission;
        
        if (amountDue > 0) {
            const saleId = generateId();
            await salesRef.child(saleId).set({
                resellerId: settlement.resellerId,
                productId: 'ACERTO', // ID fixo para passar na validação
                productName: 'Pagamento de Acerto',
                price: amountDue,
                clientId: 'ADMIN',
                clientName: 'Acerto de Contas',
                date: firebase.database.ServerValue.TIMESTAMP,
                paymentStatus: 'paid',
                category: 'Financeiro'
            });
        }

        hideLoading();
        showNotification('Acerto finalizado e valor registrado nas vendas!');
        loadPendingSettlements();
        
        // Atualizar dashboard se estiver na tela para refletir o novo valor
        if (document.getElementById('adminDashboard').classList.contains('active')) {
            loadAdminDashboard();
        }
    } catch (error) {
        hideLoading();
        console.error('Erro ao finalizar acerto:', error);
        showNotification('Erro ao finalizar', 'error');
    }
}

// ============================================
// ADMIN - GESTÃO DE PRODUTOS
// ============================================

async function addProduct() {
    const name = document.getElementById('productName').value.trim();
    const code = document.getElementById('productCode').value.trim();
    const category = document.getElementById('productCategory').value.trim();
    const quantity = parseInt(document.getElementById('productQuantity').value);
    const price = parseFloat(document.getElementById('productPrice').value);
    const barcode = document.getElementById('productBarcode').value.trim();

    if (!name || !code || !category || !quantity || !price) {
        showNotification('Por favor, preencha todos os campos obrigatórios', 'error');
        return;
    }

    showLoading();

    try {
        const productId = generateId();
        await productsRef.child(productId).set({
            name,
            code,
            category,
            quantity,
            price,
            barcode: barcode || '',
            available: quantity,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });

        // Limpar formulário
        document.getElementById('productName').value = '';
        document.getElementById('productCode').value = '';
        document.getElementById('productCategory').value = '';
        document.getElementById('productQuantity').value = '';
        document.getElementById('productPrice').value = '';
        document.getElementById('productBarcode').value = '';

        hideLoading();
        showNotification('Produto adicionado com sucesso!');
        loadAdminProducts();
    } catch (error) {
        hideLoading();
        console.error('Erro ao adicionar produto:', error);
        showNotification('Erro ao adicionar produto', 'error');
    }
}

async function loadAdminProducts() {
    showLoading();
    
    try {
        const snapshot = await productsRef.once('value');
        const products = [];
        
        snapshot.forEach((child) => {
            products.push({
                id: child.key,
                ...child.val()
            });
        });

        const container = document.getElementById('adminProductsList');

        if (products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📦</div>
                    <p class="empty-text">Nenhum produto cadastrado</p>
                </div>
            `;
            hideLoading();
            return;
        }

        // Toolbar para ações em lote
        const toolbarHtml = `
            <div style="margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-weight: 500;">
                    <input type="checkbox" id="selectAllProducts" onchange="toggleSelectAllProducts(this)">
                    Selecionar Todos
                </label>
                <div style="margin-left: auto; display: flex; gap: 5px;">
                    <button class="btn-delete" onclick="deleteSelectedProducts()" style="font-size: 14px; padding: 5px 10px;">Excluir Selecionados</button>
                    <button class="btn-delete" onclick="deleteAllProducts()" style="background-color: #a00; font-size: 14px; padding: 5px 10px;">Excluir Tudo</button>
                </div>
            </div>
        `;

        container.innerHTML = toolbarHtml + products.map(product => `
            <div class="admin-product-item">
                <div style="margin-right: 15px; display: flex; align-items: center;">
                    <input type="checkbox" class="product-checkbox" value="${product.id}">
                </div>
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-code">Código: ${product.code} | Categoria: ${product.category}</div>
                    <div class="product-price">${formatCurrency(product.price)} | Disponível: ${product.available}/${product.quantity}</div>
                </div>
                <div class="product-actions">
                    <button class="btn-secondary" onclick="openEditProductModal('${product.id}')" style="margin-right: 5px;">Editar</button>
                    <button class="btn-delete" onclick="deleteProduct('${product.id}')">Excluir</button>
                </div>
            </div>
        `).join('');

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar produtos:', error);
    }
}

async function deleteProduct(productId) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    showLoading();

    try {
        await productsRef.child(productId).remove();
        hideLoading();
        showNotification('Produto excluído com sucesso!');
        loadAdminProducts();
    } catch (error) {
        hideLoading();
        console.error('Erro ao excluir produto:', error);
        showNotification('Erro ao excluir produto', 'error');
    }
}

function toggleSelectAllProducts(source) {
    const checkboxes = document.querySelectorAll('.product-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

async function deleteSelectedProducts() {
    const selected = document.querySelectorAll('.product-checkbox:checked');
    if (selected.length === 0) {
        showNotification('Nenhum produto selecionado', 'error');
        return;
    }

    if (!confirm(`Tem certeza que deseja excluir ${selected.length} produtos selecionados?`)) return;

    showLoading();
    try {
        const updates = {};
        selected.forEach(cb => {
            updates[cb.value] = null;
        });
        
        await productsRef.update(updates);
        hideLoading();
        showNotification('Produtos excluídos com sucesso!');
        loadAdminProducts();
    } catch (error) {
        hideLoading();
        console.error('Erro ao excluir produtos:', error);
        showNotification('Erro ao excluir produtos', 'error');
    }
}

async function deleteAllProducts() {
    if (!confirm('ATENÇÃO: Tem certeza que deseja excluir TODOS os produtos? Esta ação não pode ser desfeita.')) return;
    
    const confirmation = prompt('Digite "DELETAR" para confirmar a exclusão de todos os produtos:');
    if (confirmation !== 'DELETAR') return;

    showLoading();
    try {
        await productsRef.remove();
        hideLoading();
        showNotification('Todos os produtos foram excluídos!');
        loadAdminProducts();
    } catch (error) {
        hideLoading();
        console.error('Erro ao excluir todos os produtos:', error);
        showNotification('Erro ao excluir produtos', 'error');
    }
}

let currentEditingProductId = null;

async function openEditProductModal(productId) {
    showLoading();
    currentEditingProductId = productId;

    try {
        const snapshot = await productsRef.child(productId).once('value');
        const product = snapshot.val();

        document.getElementById('editProductName').value = product.name;
        document.getElementById('editProductCode').value = product.code;
        document.getElementById('editProductCategory').value = product.category;
        document.getElementById('editProductQuantity').value = product.quantity;
        document.getElementById('editProductPrice').value = product.price;
        document.getElementById('editProductBarcode').value = product.barcode || '';

        document.getElementById('editProductModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao abrir edição de produto:', error);
    }
}

function closeEditProductModal() {
    document.getElementById('editProductModal').classList.remove('active');
    currentEditingProductId = null;
}

async function saveProductEdit() {
    const updates = {
        name: document.getElementById('editProductName').value.trim(),
        code: document.getElementById('editProductCode').value.trim(),
        category: document.getElementById('editProductCategory').value.trim(),
        quantity: parseInt(document.getElementById('editProductQuantity').value),
        price: parseFloat(document.getElementById('editProductPrice').value),
        barcode: document.getElementById('editProductBarcode').value.trim()
    };

    showLoading();
    try {
        await productsRef.child(currentEditingProductId).update(updates);
        closeEditProductModal();
        hideLoading();
        showNotification('Produto atualizado com sucesso!');
        loadAdminProducts();
    } catch (error) {
        hideLoading();
        console.error('Erro ao atualizar produto:', error);
        showNotification('Erro ao atualizar produto', 'error');
    }
}

// ============================================
// IMPORTAÇÃO DE PLANILHA
// ============================================

async function showImportModal() {
    const modal = document.getElementById('importModal');
    
    // Injetar seletor de revendedora se não existir
    if (!document.getElementById('importResellerContainer')) {
        const fileInput = document.getElementById('importFile');
        if (fileInput) {
            const container = document.createElement('div');
            container.id = 'importResellerContainer';
            container.style.marginBottom = '15px';
            container.innerHTML = `
                <label style="display:block; margin-bottom:5px; font-weight:500;">Gerar Pedido para Revendedora (Opcional):</label>
                <select id="importResellerSelect" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                    <option value="">Apenas Importar para Estoque</option>
                </select>
            `;
            fileInput.parentNode.insertBefore(container, fileInput);
        }
    }

    // Atualizar lista de revendedoras
    const select = document.getElementById('importResellerSelect');
    if (select) {
        try {
            const snapshot = await usersRef.orderByChild('role').equalTo('reseller').once('value');
            let options = '<option value="">Apenas Importar para Estoque</option>';
            snapshot.forEach(child => {
                const r = child.val();
                options += `<option value="${child.key}">${r.name}</option>`;
            });
            select.innerHTML = options;
        } catch (error) {
            console.error('Erro ao carregar revendedoras:', error);
        }
    }

    modal.classList.add('active');
}

function closeImportModal() {
    document.getElementById('importModal').classList.remove('active');
    document.getElementById('importFile').value = '';
}

async function importProducts() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    const resellerSelect = document.getElementById('importResellerSelect');
    const resellerId = resellerSelect ? resellerSelect.value : '';

    if (!file) {
        showNotification('Por favor, selecione um arquivo', 'error');
        return;
    }

    showLoading();

    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

            let importCount = 0;
            const updates = {};
            const newProductIds = [];

            jsonData.forEach(row => {
                const name = row.Nome || row.nome || row.Produto || row.produto;
                const code = row.Código || row.codigo || row.Codigo || row.Referência || row.referencia;
                const category = row.Categoria || row.categoria;
                const quantity = parseInt(row.Quantidade || row.quantidade || row.Qtd || row.qtd || row.Quant || row.quant || 1);
                const price = parseFloat(row.Preço || row.preco || row.Preco || row.Valor || row.valor || 0);
                const barcode = row['Código de Barras'] || row['codigo de barras'] || row.Barcode || row.barcode || '';

                if (name && code && price) {
                    const productId = generateId();
                    newProductIds.push(productId);
                    updates[`products/${productId}`] = {
                        name,
                        code,
                        category: category || 'Sem categoria',
                        quantity,
                        price,
                        barcode,
                        available: quantity,
                        createdAt: firebase.database.ServerValue.TIMESTAMP
                    };
                    importCount++;
                }
            });

            await database.ref().update(updates);

            // Se tiver revendedora selecionada, cria o pedido
            if (resellerId && newProductIds.length > 0) {
                const orderId = generateId();
                await ordersRef.child(orderId).set({
                    resellerId,
                    products: newProductIds,
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    status: 'active'
                });
                showNotification(`${importCount} produtos importados e pedido gerado com sucesso!`);
                loadOrders();
            } else {
                showNotification(`${importCount} produtos importados com sucesso!`);
            }

            closeImportModal();
            hideLoading();
            loadAdminProducts();
        } catch (error) {
            hideLoading();
            console.error('Erro ao importar:', error);
            showNotification('Erro ao importar arquivo. Verifique o formato.', 'error');
        }
    };

    reader.readAsArrayBuffer(file);
}

// ============================================
// ADMIN - GESTÃO DE REVENDEDORAS
// ============================================

function showAddResellerModal() {
    document.getElementById('addResellerModal').classList.add('active');
}

function closeAddResellerModal() {
    document.getElementById('addResellerModal').classList.remove('active');
    document.getElementById('newResellerName').value = '';
    document.getElementById('resellerEmail').value = '';
    document.getElementById('resellerPassword').value = '';
    document.getElementById('resellerPhone').value = '';
}

async function saveReseller() {
    const name = document.getElementById('newResellerName').value.trim();
    const email = document.getElementById('resellerEmail').value.trim();
    const password = document.getElementById('resellerPassword').value;
    const phone = document.getElementById('resellerPhone').value.trim();

    if (!name || !email || !password || !phone) {
        showNotification('Por favor, preencha todos os campos', 'error');
        return;
    }

    showLoading();

    let secondaryApp = null;

    try {
        // Usar uma instância secundária para não deslogar o admin
        secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");
        const secondaryAuth = secondaryApp.auth();

        // Criar usuário na instância secundária
        const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Salvar dados usando a instância principal (admin)
        await usersRef.child(user.uid).set({
            name,
            email,
            phone,
            role: 'reseller',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });

        // Limpar instância secundária
        await secondaryAuth.signOut();
        await secondaryApp.delete();

        closeAddResellerModal();

        // Aplicar comissão padrão se existir
        try {
            const configSnapshot = await configRef.child('defaultCommissions').once('value');
            const defaultTiers = configSnapshot.val();
            if (defaultTiers) {
                await goalsRef.child(user.uid).child('commissionTiers').set(defaultTiers);
            }
        } catch (e) { console.error('Erro ao aplicar comissão padrão', e); }

        hideLoading();
        showNotification('Revendedora cadastrada com sucesso!');
        loadResellers();
    } catch (error) {
        if (secondaryApp) {
            try { await secondaryApp.delete(); } catch (e) {}
        }

        hideLoading();
        console.error('Erro ao cadastrar revendedora:', error);
        
        if (error.code === 'auth/email-already-in-use') {
            showNotification('Este e-mail já está cadastrado', 'error');
        } else {
            showNotification('Erro ao cadastrar revendedora', 'error');
        }
    }
}

async function loadResellers() {
    showLoading();
    
    const filterInput = document.getElementById('resellerMonthFilter');
    let filterValue = filterInput ? filterInput.value : '';

    // Se não tiver filtro selecionado, usa o mês atual
    if (!filterValue) {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        filterValue = `${year}-${month}`;
        if (filterInput) filterInput.value = filterValue;
    }

    try {
        const [resellersSnapshot, salesSnapshot] = await Promise.all([
            usersRef.orderByChild('role').equalTo('reseller').once('value'),
            salesRef.once('value')
        ]);

        const resellers = [];
        resellersSnapshot.forEach((child) => {
            resellers.push({
                id: child.key,
                ...child.val()
            });
        });

        const allSales = [];
        salesSnapshot.forEach((child) => {
            allSales.push(child.val());
        });

        const container = document.getElementById('resellersList');

        if (resellers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👥</div>
                    <p class="empty-text">Nenhuma revendedora cadastrada</p>
                </div>
            `;
            hideLoading();
            return;
        }

        // Adicionar botão de Configuração Global no topo se não existir
        if (!document.getElementById('btnGlobalCommissions')) {
            const header = container.previousElementSibling || container.parentElement.querySelector('h3') || container.parentElement;
            // Tenta inserir antes da lista ou no container pai
            const btnDiv = document.createElement('div');
            btnDiv.style.marginBottom = '15px';
            btnDiv.innerHTML = `<button id="btnGlobalCommissions" class="btn-primary" onclick="openAdminCommissionModal('GLOBAL')" style="background-color: #2c1810;">⚙️ Configurar Comissões Padrão</button>`;
            if (container.parentNode) container.parentNode.insertBefore(btnDiv, container);
        }

        container.innerHTML = resellers.map(reseller => {
            const [filterYear, filterMonth] = filterValue.split('-').map(Number);
            
            const resellerSales = allSales.filter(sale => {
                if (sale.resellerId !== reseller.id) return false;
                const saleDate = new Date(sale.date);
                return saleDate.getFullYear() === filterYear && (saleDate.getMonth() + 1) === filterMonth;
            });

            const totalSales = resellerSales.reduce((sum, sale) => sum + sale.price, 0);

            return `
            <div class="reseller-item">
                <div class="reseller-header">
                    <div class="reseller-name">${reseller.name}</div>
                    <div class="reseller-total" style="font-weight: bold; color: #2c1810;">${formatCurrency(totalSales)}</div>
                </div>
                <div class="reseller-details">
                    <p>📧 ${reseller.email}</p>
                    <p>📱 ${reseller.phone}</p>
                    <p>📅 Cadastrado em: ${formatDate(reseller.createdAt)}</p>
                    <p>🛍️ Vendas: ${resellerSales.length}</p>
                </div>
                <div class="reseller-actions">
                    <button class="btn-edit" onclick="viewResellerSales('${reseller.id}')">Ver Vendas</button>
                    <button class="btn-secondary" onclick="openAdminCommissionModal('${reseller.id}', '${reseller.name}')" style="margin-left: 5px;">Comissões</button>
                    <button class="btn-secondary" onclick="openEditResellerModal('${reseller.id}')" style="margin-left: 5px;">Editar</button>
                    <button class="btn-delete" onclick="deleteReseller('${reseller.id}')" style="margin-left: 5px;">Excluir</button>
                </div>
            </div>
        `}).join('');

        hideLoading();
        updateOrderResellerSelect(resellers);
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar revendedoras:', error);
    }
}

async function deleteReseller(resellerId) {
    if (!confirm('Tem certeza que deseja excluir esta revendedora? Isso não apagará o histórico de vendas, mas removerá o acesso.')) return;
    
    showLoading();
    try {
        await usersRef.child(resellerId).remove();
        hideLoading();
        showNotification('Revendedora excluída com sucesso!');
        loadResellers();
    } catch (error) {
        hideLoading();
        console.error('Erro ao excluir revendedora:', error);
        showNotification('Erro ao excluir revendedora', 'error');
    }
}

let currentEditingResellerId = null;

async function openEditResellerModal(resellerId) {
    showLoading();
    currentEditingResellerId = resellerId;

    try {
        const snapshot = await usersRef.child(resellerId).once('value');
        const reseller = snapshot.val();

        document.getElementById('editResellerName').value = reseller.name;
        document.getElementById('editResellerEmail').value = reseller.email;
        document.getElementById('editResellerPhone').value = reseller.phone;

        document.getElementById('editResellerModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao abrir edição de revendedora:', error);
    }
}

function closeEditResellerModal() {
    document.getElementById('editResellerModal').classList.remove('active');
    currentEditingResellerId = null;
}

async function saveResellerEdit() {
    const updates = {
        name: document.getElementById('editResellerName').value.trim(),
        email: document.getElementById('editResellerEmail').value.trim(),
        phone: document.getElementById('editResellerPhone').value.trim()
    };

    showLoading();
    try {
        await usersRef.child(currentEditingResellerId).update(updates);
        closeEditResellerModal();
        hideLoading();
        showNotification('Revendedora atualizada com sucesso!');
        loadResellers();
    } catch (error) {
        hideLoading();
        console.error('Erro ao atualizar revendedora:', error);
        showNotification('Erro ao atualizar revendedora', 'error');
    }
}

let currentResellerSalesData = [];

async function viewResellerSales(resellerId) {
    showLoading();
    
    const filterInput = document.getElementById('resellerMonthFilter');
    let filterValue = filterInput ? filterInput.value : '';

    if (!filterValue) {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        filterValue = `${year}-${month}`;
    }

    try {
        const snapshot = await salesRef.orderByChild('resellerId').equalTo(resellerId).once('value');
        const sales = [];
        
        snapshot.forEach((child) => {
            sales.push(child.val());
        });

        const [filterYear, filterMonth] = filterValue.split('-').map(Number);
        const filteredSales = sales.filter(sale => {
            const saleDate = new Date(sale.date);
            return saleDate.getFullYear() === filterYear && (saleDate.getMonth() + 1) === filterMonth;
        });

        const userSnapshot = await usersRef.child(resellerId).once('value');
        const reseller = userSnapshot.val();

        // Armazenar dados para filtragem
        currentResellerSalesData = filteredSales;
        
        const dateObj = new Date(filterYear, filterMonth - 1);
        const monthName = dateObj.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

        document.getElementById('resellerSalesTitle').textContent = `Vendas de ${reseller.name} - ${monthName}`;
        
        // Resetar filtro visual
        const filterSelect = document.getElementById('resellerSalesTypeFilter');
        if (filterSelect) filterSelect.value = 'all';

        // Renderizar lista usando a nova função de filtro
        filterResellerSalesList();

        document.getElementById('resellerSalesModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar vendas:', error);
        showNotification('Erro ao carregar detalhes das vendas', 'error');
    }
}

function filterResellerSalesList() {
    const filterType = document.getElementById('resellerSalesTypeFilter').value;
    const container = document.getElementById('resellerSalesList');
    const totalContainer = document.getElementById('resellerSalesTotal');
    
    if (!currentResellerSalesData) return;

    let displaySales = currentResellerSalesData;

    // Filtrar por tipo
    if (filterType === 'product') {
        displaySales = currentResellerSalesData.filter(s => s.productId !== 'ACERTO');
    } else if (filterType === 'settlement') {
        displaySales = currentResellerSalesData.filter(s => s.productId === 'ACERTO');
    }

    const total = displaySales.reduce((sum, sale) => sum + sale.price, 0);

    if (displaySales.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">Nenhum registro encontrado.</p>';
    } else {
        // Usar [...displaySales] para criar uma cópia antes de inverter, evitando mutação
        container.innerHTML = [...displaySales].reverse().map(sale => {
            const isSettlement = sale.productId === 'ACERTO';
            return `
            <div class="sale-item" style="background: ${isSettlement ? '#e8f5e9' : '#f9f9f9'}; padding: 10px; margin-bottom: 10px; border-radius: 4px; border: 1px solid ${isSettlement ? '#c3e6cb' : '#eee'};">
                <div class="sale-header" style="display: flex; justify-content: space-between; font-weight: 600;">
                    <span>${sale.productName}</span>
                    <span>${formatCurrency(sale.price)}</span>
                </div>
                <div class="sale-details" style="font-size: 0.9em; color: #666; margin-top: 5px;">
                    ${isSettlement ? '<strong>Tipo: Pagamento de Acerto</strong>' : `Cliente: ${sale.clientName}`} <br>
                    Data: ${formatDate(sale.date)} <br>
                    Status: ${sale.paymentStatus === 'paid' ? 'Pago' : sale.paymentStatus === 'installment' ? 'Parcelado' : 'Pendente'}
                </div>
            </div>
        `}).join('');
    }

    totalContainer.textContent = `Total: ${formatCurrency(total)}`;
}

function closeResellerSalesModal() {
    document.getElementById('resellerSalesModal').classList.remove('active');
}

// ============================================
// ADMIN - GESTÃO DE COMISSÕES
// ============================================

let currentAdminTiers = [];
let currentAdminTargetId = null; // 'GLOBAL' ou resellerId

async function openAdminCommissionModal(targetId, targetName = 'Padrão Global') {
    // Injetar HTML do modal se não existir
    if (!document.getElementById('adminCommissionModal')) {
        const modalHtml = `
            <div id="adminCommissionModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3 id="adminCommissionTitle">Gerenciar Comissões</h3>
                        <button class="close-modal" onclick="closeAdminCommissionModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div id="adminCommissionList" style="margin-bottom: 15px;"></div>
                        <button class="btn-secondary" onclick="addAdminCommissionTier()" style="width: 100%; margin-bottom: 15px;">+ Adicionar Faixa</button>
                        
                        <div id="globalCommissionOptions" style="display: none; margin-bottom: 15px; padding: 10px; background: #fff3cd; border-radius: 4px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" id="applyToAllResellers">
                                <strong>Aplicar para TODAS as revendedoras existentes agora</strong>
                            </label>
                            <p style="font-size: 0.85em; color: #666; margin-top: 5px; margin-left: 24px;">Isso substituirá as comissões individuais de todas as revendedoras.</p>
                        </div>

                        <button class="btn-primary" onclick="saveAdminCommission()" style="width: 100%;">Salvar Alterações</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    currentAdminTargetId = targetId;
    document.getElementById('adminCommissionTitle').textContent = `Comissões: ${targetName}`;
    document.getElementById('globalCommissionOptions').style.display = targetId === 'GLOBAL' ? 'block' : 'none';
    if (document.getElementById('applyToAllResellers')) document.getElementById('applyToAllResellers').checked = false;

    showLoading();
    try {
        let tiers = [];
        if (targetId === 'GLOBAL') {
            const snapshot = await configRef.child('defaultCommissions').once('value');
            tiers = snapshot.val() || [];
        } else {
            const snapshot = await goalsRef.child(targetId).child('commissionTiers').once('value');
            tiers = snapshot.val() || [];
        }
        
        // Se vazio, inicia com um padrão
        if (!tiers || tiers.length === 0) {
            tiers = [{ min: 0, max: 1000, percentage: 10 }];
        }

        currentAdminTiers = tiers;
        renderAdminTiers();
        document.getElementById('adminCommissionModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar comissões:', error);
        showNotification('Erro ao carregar dados', 'error');
    }
}

function closeAdminCommissionModal() {
    document.getElementById('adminCommissionModal').classList.remove('active');
}

function renderAdminTiers() {
    const container = document.getElementById('adminCommissionList');
    container.innerHTML = currentAdminTiers.map((tier, index) => `
        <div class="commission-tier" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
            <input type="number" value="${tier.min}" onchange="updateAdminTier(${index}, 'min', this.value)" class="input-field" placeholder="De (R$)" style="flex: 1;">
            <input type="number" value="${tier.max}" onchange="updateAdminTier(${index}, 'max', this.value)" class="input-field" placeholder="Até (R$)" style="flex: 1;">
            <input type="number" value="${tier.percentage}" onchange="updateAdminTier(${index}, 'percentage', this.value)" class="input-field" placeholder="%" style="width: 80px;">
            <button class="tier-remove" onclick="removeAdminTier(${index})" style="background: #dc3545; color: white; border: none; width: 30px; height: 30px; border-radius: 4px; cursor: pointer;">×</button>
        </div>
    `).join('');
}

function addAdminCommissionTier() {
    currentAdminTiers.push({ min: 0, max: 0, percentage: 0 });
    renderAdminTiers();
}

function removeAdminTier(index) {
    currentAdminTiers.splice(index, 1);
    renderAdminTiers();
}

function updateAdminTier(index, field, value) {
    currentAdminTiers[index][field] = parseFloat(value);
}

async function saveAdminCommission() {
    showLoading();
    try {
        if (currentAdminTargetId === 'GLOBAL') {
            await configRef.child('defaultCommissions').set(currentAdminTiers);
            
            const applyToAll = document.getElementById('applyToAllResellers').checked;
            if (applyToAll) {
                const usersSnapshot = await usersRef.orderByChild('role').equalTo('reseller').once('value');
                const updates = {};
                usersSnapshot.forEach(child => {
                    updates[`goals/${child.key}/commissionTiers`] = currentAdminTiers;
                });
                if (Object.keys(updates).length > 0) await database.ref().update(updates);
            }
        } else {
            await goalsRef.child(currentAdminTargetId).child('commissionTiers').set(currentAdminTiers);
        }
        hideLoading();
        showNotification('Comissões salvas com sucesso!');
        closeAdminCommissionModal();
    } catch (error) {
        hideLoading();
        console.error('Erro ao salvar:', error);
        showNotification('Erro ao salvar comissões', 'error');
    }
}

// ============================================
// ADMIN - GESTÃO DE PEDIDOS
// ============================================

function updateOrderResellerSelect(resellers = []) {
    // Função mantida para compatibilidade, mas o select principal agora é gerado dinamicamente no modal
    const select = document.getElementById('orderReseller');
    if (select) {
        select.innerHTML = '<option value="">Selecione a Revendedora</option>' +
            resellers.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
    }
}

async function createManualOrder() {
    const resellerId = document.getElementById('manualOrderReseller').value;
    
    if (!resellerId) {
        showNotification('Selecione uma revendedora', 'error');
        return;
    }

    const rows = document.querySelectorAll('.manual-order-item');
    if (rows.length === 0) {
        showNotification('Adicione pelo menos um item ao pedido', 'error');
        return;
    }

    showLoading();

    try {
        const newProductIds = [];
        const updates = {};

        // 1. Criar produtos
        rows.forEach(row => {
            const name = row.querySelector('.item-name').value;
            const code = row.querySelector('.item-code').value;
            const price = parseFloat(row.querySelector('.item-price').value);
            const quantity = parseInt(row.querySelector('.item-qty').value) || 1;

            if (name && price) {
                const productId = generateId();
                newProductIds.push(productId);
                updates[`products/${productId}`] = {
                    name,
                    code: code || 'S/C',
                    category: 'Manual',
                    quantity,
                    price,
                    available: quantity,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                };
            }
        });

        if (newProductIds.length === 0) {
            hideLoading();
            showNotification('Preencha os dados dos itens corretamente', 'error');
            return;
        }

        // 2. Salvar produtos
        await database.ref().update(updates);

        // 3. Criar Pedido
        const orderId = generateId();
        await ordersRef.child(orderId).set({
            resellerId,
            products: newProductIds,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            status: 'active'
        });

        hideLoading();
        showNotification('Pedido criado com sucesso!');
        closeManualOrderModal();
        loadOrders();
    } catch (error) {
        hideLoading();
        console.error('Erro ao criar pedido:', error);
        showNotification('Erro ao criar pedido', 'error');
    }
}

async function loadOrders() {
    showLoading();
    
    try {
        const [ordersSnapshot, usersSnapshot, productsSnapshot] = await Promise.all([
            ordersRef.once('value'),
            usersRef.once('value'),
            productsRef.once('value')
        ]);

        const orders = [];
        ordersSnapshot.forEach((child) => {
            orders.push({
                id: child.key,
                ...child.val()
            });
        });

        const users = {};
        usersSnapshot.forEach((child) => {
            users[child.key] = child.val();
        });

        const products = {};
        productsSnapshot.forEach((child) => {
            products[child.key] = child.val();
        });

        const container = document.getElementById('adminOrders');
        
        // Reconstruir a interface da aba Pedidos
        let html = `
            <div class="admin-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <h2 style="margin: 0;">Gestão de Pedidos</h2>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-primary" onclick="openManualOrderModal()">+ Novo Pedido Manual</button>
                    <button class="btn-secondary" onclick="showImportModal()">📥 Importar Planilha</button>
                </div>
            </div>
            <div id="ordersListContainer">
        `;

        if (orders.length === 0) {
            html += `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <p class="empty-text">Nenhum pedido criado</p>
                </div>
            </div>`;
        } else {
            html += orders.map(order => {
            const reseller = users[order.resellerId];
            const orderProducts = order.products ? order.products.filter(pid => products[pid]) : [];
            
            return `
                <div class="reseller-item">
                    <div class="reseller-header">
                        <div class="reseller-name">Pedido para: ${reseller ? reseller.name : 'Desconhecido'}</div>
                    </div>
                    <div class="reseller-details">
                        <p>📦 ${orderProducts.length} produto(s)</p>
                        <p>📅 ${formatDate(order.createdAt)}</p>
                        <button class="btn-secondary" onclick="openEditOrderModal('${order.id}')" style="margin-top: 5px; padding: 5px 10px; font-size: 12px; margin-right: 5px;">Editar Pedido</button>
                        <button class="btn-delete" onclick="deleteOrder('${order.id}')" style="margin-top: 5px; padding: 5px 10px; font-size: 12px;">Excluir Pedido</button>
                    </div>
                </div>
            `;
            }).join('') + '</div>';
        }

        container.innerHTML = html;

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar pedidos:', error);
    }
}

// ============================================
// NOVO PEDIDO MANUAL (MODAL)
// ============================================

async function openManualOrderModal() {
    if (!document.getElementById('manualOrderModal')) {
        const modalHtml = `
            <div id="manualOrderModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3>Novo Pedido Manual</h3>
                        <button class="close-modal" onclick="closeManualOrderModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Revendedora</label>
                            <select id="manualOrderReseller" class="input-field"></select>
                        </div>
                        
                        <div style="margin-top: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <h4>Itens do Pedido</h4>
                                <button class="btn-secondary" onclick="addManualOrderItem()" style="font-size: 0.8em;">+ Adicionar Item</button>
                            </div>
                            <div id="manualOrderItemsList" style="max-height: 300px; overflow-y: auto; padding-right: 5px;"></div>
                        </div>

                        <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                            <button class="btn-primary" onclick="createManualOrder()" style="width: 100%;">Criar Pedido</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // Carregar revendedoras
    const snapshot = await usersRef.orderByChild('role').equalTo('reseller').once('value');
    const select = document.getElementById('manualOrderReseller');
    select.innerHTML = '<option value="">Selecione a Revendedora</option>';
    snapshot.forEach(child => {
        const r = child.val();
        select.innerHTML += `<option value="${child.key}">${r.name}</option>`;
    });

    // Limpar itens anteriores e adicionar um inicial
    document.getElementById('manualOrderItemsList').innerHTML = '';
    addManualOrderItem();

    document.getElementById('manualOrderModal').classList.add('active');
}

function closeManualOrderModal() {
    const modal = document.getElementById('manualOrderModal');
    if (modal) modal.classList.remove('active');
}

function addManualOrderItem() {
    const container = document.getElementById('manualOrderItemsList');
    const div = document.createElement('div');
    div.className = 'manual-order-item';
    div.style.display = 'flex';
    div.style.gap = '10px';
    div.style.marginBottom = '10px';
    div.style.alignItems = 'center';
    
    div.innerHTML = `
        <input type="text" class="input-field item-name" placeholder="Nome do Produto" style="flex: 2;">
        <input type="text" class="input-field item-code" placeholder="Código" style="flex: 1;">
        <input type="number" class="input-field item-price" placeholder="Preço (R$)" step="0.01" style="flex: 1;">
        <input type="number" class="input-field item-qty" value="1" style="width: 60px; display: none;">
        <button onclick="this.parentElement.remove()" style="background: #dc3545; color: white; border: none; width: 30px; height: 30px; border-radius: 4px; cursor: pointer;">×</button>
    `;
    
    container.appendChild(div);
}

async function deleteOrder(orderId) {
    if (!confirm('Tem certeza que deseja excluir este pedido?')) return;
    
    showLoading();
    try {
        await ordersRef.child(orderId).remove();
        hideLoading();
        showNotification('Pedido excluído com sucesso!');
        loadOrders();
    } catch (error) {
        hideLoading();
        console.error('Erro ao excluir pedido:', error);
        showNotification('Erro ao excluir pedido', 'error');
    }
}

let currentEditingOrderId = null;

async function openEditOrderModal(orderId) {
    showLoading();
    currentEditingOrderId = orderId;

    try {
        const [orderSnapshot, usersSnapshot, productsSnapshot] = await Promise.all([
            ordersRef.child(orderId).once('value'),
            usersRef.orderByChild('role').equalTo('reseller').once('value'),
            productsRef.once('value')
        ]);

        const order = orderSnapshot.val();
        const resellers = [];
        usersSnapshot.forEach(child => resellers.push({id: child.key, ...child.val()}));
        
        const products = [];
        productsSnapshot.forEach(child => products.push({id: child.key, ...child.val()}));

        // Preencher Select de Revendedoras
        const resellerSelect = document.getElementById('editOrderReseller');
        resellerSelect.innerHTML = '<option value="">Selecione a Revendedora</option>' +
            resellers.map(r => `<option value="${r.id}" ${r.id === order.resellerId ? 'selected' : ''}>${r.name}</option>`).join('');

        // Preencher Produtos (Modo Edição Manual)
        const productsContainer = document.getElementById('editOrderProductsSelection');
        const orderProducts = order.products || [];
        
        productsContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h4 style="margin:0;">Itens do Pedido</h4>
                <button class="btn-secondary" onclick="addEditOrderItem()" style="font-size: 0.8em;">+ Adicionar Item</button>
            </div>
            <div id="editOrderItemsList" style="max-height: 300px; overflow-y: auto; padding-right: 5px;"></div>
        `;

        orderProducts.forEach(pid => {
            const p = products.find(prod => prod.id === pid);
            if (p) {
                addEditOrderItem(p);
            }
        });

        document.getElementById('editOrderModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao abrir edição de pedido:', error);
    }
}

function addEditOrderItem(product = null) {
    const container = document.getElementById('editOrderItemsList');
    const div = document.createElement('div');
    div.className = 'edit-order-item';
    div.style.display = 'flex';
    div.style.gap = '10px';
    div.style.marginBottom = '10px';
    div.style.alignItems = 'center';
    
    const idValue = product ? product.id : '';
    const nameValue = product ? product.name : '';
    const codeValue = product ? product.code : '';
    const priceValue = product ? product.price : '';
    const qtyValue = product ? product.quantity : '1';

    div.innerHTML = `
        <input type="hidden" class="item-id" value="${idValue}">
        <input type="text" class="input-field item-name" placeholder="Nome" value="${nameValue}" style="flex: 2;">
        <input type="text" class="input-field item-code" placeholder="Cód" value="${codeValue}" style="flex: 1;">
        <input type="number" class="input-field item-price" placeholder="R$" value="${priceValue}" step="0.01" style="flex: 1;">
        <input type="number" class="input-field item-qty" value="${qtyValue}" style="width: 60px; display: none;">
        <button onclick="this.parentElement.remove()" style="background: #dc3545; color: white; border: none; width: 30px; height: 30px; border-radius: 4px; cursor: pointer;">×</button>
    `;
    
    container.appendChild(div);
}

function closeEditOrderModal() {
    document.getElementById('editOrderModal').classList.remove('active');
    currentEditingOrderId = null;
}

async function saveOrderEdit() {
    const resellerId = document.getElementById('editOrderReseller').value;
    
    if (!resellerId) {
        showNotification('Selecione uma revendedora', 'error');
        return;
    }

    const rows = document.querySelectorAll('.edit-order-item');
    if (rows.length === 0) {
        showNotification('O pedido deve ter pelo menos um item', 'error');
        return;
    }

    showLoading();

    try {
        const productIds = [];
        const updates = {};

        rows.forEach(row => {
            const id = row.querySelector('.item-id').value;
            const name = row.querySelector('.item-name').value;
            const code = row.querySelector('.item-code').value;
            const price = parseFloat(row.querySelector('.item-price').value);
            const quantity = parseInt(row.querySelector('.item-qty').value) || 1;

            if (name && price) {
                let productId = id;
                if (!productId) {
                    productId = generateId();
                }
                
                productIds.push(productId);
                
                updates[`products/${productId}`] = {
                    name,
                    code: code || 'S/C',
                    category: 'Manual',
                    quantity,
                    price,
                    available: quantity,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                };
            }
        });

        if (productIds.length === 0) {
            hideLoading();
            showNotification('Preencha os dados dos itens corretamente', 'error');
            return;
        }

        // Atualizar produtos
        await database.ref().update(updates);

        // Atualizar pedido
        await ordersRef.child(currentEditingOrderId).update({
            resellerId,
            products: productIds
        });

        closeEditOrderModal();
        hideLoading();
        showNotification('Pedido atualizado com sucesso!');
        loadOrders();
    } catch (error) {
        hideLoading();
        console.error('Erro ao atualizar pedido:', error);
        showNotification('Erro ao atualizar pedido', 'error');
    }
}

function loadAdminData() {
    loadResellers();
    loadOrders();
    
    // Definir Dashboard como tela inicial
    switchAdminTab('dashboard');

    // Ocultar aba de produtos conforme solicitado
    const productsTabBtn = document.querySelector('button[onclick="switchAdminTab(\'products\')"]');
    if (productsTabBtn) productsTabBtn.style.display = 'none';
}

// ============================================
// REVENDEDORA - DASHBOARD
// ============================================

function loadResellerData() {
    document.getElementById('resellerName').textContent = currentUser.name;
    updateDashboard();
    loadProducts();
}

async function updateDashboard() {
    if (!currentUser) return;
    
    showLoading();

    try {
        const [salesSnapshot, goalsSnapshot] = await Promise.all([
            salesRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value'),
            goalsRef.child(currentUser.uid).once('value')
        ]);

        const sales = [];
        salesSnapshot.forEach((child) => {
            const sale = child.val();
            if (!sale.isSettled) {
                sales.push(sale);
            }
        });

        const goals = goalsSnapshot.val() || {};
        
        const totalSales = sales.reduce((sum, sale) => sum + sale.price, 0);
        const totalCommission = calculateTotalCommission(totalSales, goals.commissionTiers || []);
        
        document.getElementById('totalSales').textContent = formatCurrency(totalSales);
        document.getElementById('monthGoal').textContent = formatCurrency(goals.goalAmount || 0);
        document.getElementById('totalCommission').textContent = formatCurrency(totalCommission);
        document.getElementById('settlementDate').textContent = goals.settlementDate ? formatDate(goals.settlementDate) : '--/--/----';
        
        const goalAmount = goals.goalAmount || 1;
        const progress = Math.min((totalCommission / goalAmount) * 100, 100);
        document.getElementById('progressFill').style.width = progress + '%';
        
        const salesNeededForGoal = calculateSalesForTargetCommission(goalAmount, goals.commissionTiers || []);
        const remainingSales = Math.max(0, salesNeededForGoal - totalSales);

        let progressText = `${progress.toFixed(1)}% da meta atingida`;
        if (remainingSales > 0) {
            progressText += ` | Faltam ${formatCurrency(remainingSales)} em vendas`;
        }
        document.getElementById('progressText').textContent = progressText;
        
        loadRecentSales(sales);

        // Adicionar botão de Solicitar Acerto se não existir
        renderSettlementButton();

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao atualizar dashboard:', error);
    }
}

function renderSettlementButton() {
    const container = document.querySelector('#dashboardTab .dashboard-grid');
    if (!container) return;

    let btnContainer = document.getElementById('settlementBtnContainer');
    if (!btnContainer) {
        btnContainer = document.createElement('div');
        btnContainer.id = 'settlementBtnContainer';
        btnContainer.style.gridColumn = '1 / -1';
        btnContainer.style.marginTop = '10px';
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '10px';
        btnContainer.style.flexWrap = 'wrap';
        btnContainer.innerHTML = `
            <button class="btn-primary" onclick="openSettlementModal()" style="flex: 1; background-color: #2c1810; padding: 15px; font-size: 1em; min-width: 200px;">
                📦 Solicitar Acerto
            </button>
            <button class="btn-secondary" onclick="openSettlementHistoryModal()" style="flex: 1; padding: 15px; font-size: 1em; min-width: 200px;">
                📜 Histórico
            </button>
        `;
        container.appendChild(btnContainer);
    } else if (btnContainer.parentElement !== container) {
        // Se o botão já existe mas está no lugar errado (ex: dashboard do admin), move para o correto
        container.appendChild(btnContainer);
    }
}

async function openSettlementModal() {
    showLoading();
    try {
        // Carregar dados para o relatório
        const [salesSnapshot, goalsSnapshot, ordersSnapshot, productsSnapshot] = await Promise.all([
            salesRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value'),
            goalsRef.child(currentUser.uid).once('value'),
            ordersRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value'),
            productsRef.once('value')
        ]);

        const sales = [];
        salesSnapshot.forEach(child => sales.push(child.val()));

        const goals = goalsSnapshot.val() || {};
        const allProducts = productsSnapshot.val() || {};
        
        // Calcular totais
        const totalSales = sales.reduce((sum, sale) => sum + sale.price, 0);
        const totalCommission = calculateTotalCommission(totalSales, goals.commissionTiers || []);
        const totalDue = totalSales - totalCommission;
        
        const goalAmount = goals.goalAmount || 0;
        const goalProgress = goalAmount > 0 ? (totalCommission / goalAmount) * 100 : 0;

        // Calcular itens para devolução (Total recebido - Total vendido)
        let totalItemsReceived = 0;
        const processedProductIds = new Set();
        
        ordersSnapshot.forEach(child => {
            const order = child.val();
            if (order.status === 'active' && order.products) {
                order.products.forEach(pid => {
                    if (allProducts[pid] && !processedProductIds.has(pid)) {
                        totalItemsReceived += parseInt(allProducts[pid].quantity) || 1;
                        processedProductIds.add(pid);
                    }
                });
            }
        });

        const itemsSold = sales.length;
        const itemsToReturn = Math.max(0, totalItemsReceived - itemsSold);

        // Criar Modal de Relatório
        if (!document.getElementById('settlementModal')) {
            const modalHtml = `
                <div id="settlementModal" class="modal-overlay">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Relatório de Acerto</h3>
                            <button class="close-modal" onclick="document.getElementById('settlementModal').classList.remove('active')">×</button>
                        </div>
                        <div class="modal-body">
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                                <p><strong>Total Vendido:</strong> ${formatCurrency(totalSales)}</p>
                                <p><strong>Sua Comissão:</strong> ${formatCurrency(totalCommission)}</p>
                                <hr style="margin: 10px 0; border-color: #ddd;">
                                <p style="font-size: 1.2em; color: #2c1810;"><strong>Valor a Pagar:</strong> ${formatCurrency(totalDue)}</p>
                            </div>
                            
                            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ffeeba;">
                                <h4 style="margin-top: 0; color: #856404;">📦 Devolução</h4>
                                <p>Itens Recebidos: ${totalItemsReceived}</p>
                                <p>Itens Vendidos: ${itemsSold}</p>
                                <p style="font-weight: bold; font-size: 1.1em; margin-top: 5px;">Itens a Devolver: ${itemsToReturn}</p>
                            </div>

                            <p style="font-size: 0.9em; color: #666; margin-bottom: 15px;">Ao confirmar, este relatório será enviado ao administrador para conferência e finalização.</p>
                            
                            <button class="btn-primary" onclick="confirmSettlementRequest(${totalSales}, ${totalCommission}, ${itemsToReturn}, ${goalAmount}, ${goalProgress.toFixed(2)})" style="width: 100%;">Confirmar e Enviar</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        document.getElementById('settlementModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao gerar relatório:', error);
        showNotification('Erro ao gerar relatório', 'error');
    }
}

async function confirmSettlementRequest(totalSold, totalCommission, returnedCount, goalAmount, goalProgress) {
    showLoading();
    try {
        // 1. Criar registro de acerto com histórico
        const settlementRef = await settlementsRef.push({
            resellerId: currentUser.uid,
            resellerName: currentUser.name,
            totalSold,
            totalCommission,
            returnedCount,
            goalAmount: parseFloat(goalAmount),
            goalAchievement: parseFloat(goalProgress),
            status: 'pending',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });

        // 2. Marcar vendas atuais como "acertadas" (zerar vendas)
        const salesSnapshot = await salesRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value');
        const updates = {};
        salesSnapshot.forEach(child => {
            const sale = child.val();
            if (!sale.isSettled) {
                updates[`sales/${child.key}/isSettled`] = true;
                updates[`sales/${child.key}/settlementId`] = settlementRef.key;
            }
        });

        // 3. Zerar metas
        updates[`goals/${currentUser.uid}/goalAmount`] = 0;
        updates[`goals/${currentUser.uid}/settlementDate`] = '';

        await database.ref().update(updates);

        document.getElementById('settlementModal').classList.remove('active');
        hideLoading();
        showNotification('Solicitação de acerto enviada! Vendas e metas foram reiniciadas.');
        updateDashboard();
    } catch (error) {
        hideLoading();
        console.error('Erro ao enviar solicitação:', error);
        showNotification('Erro ao enviar solicitação', 'error');
    }
}

async function openSettlementHistoryModal() {
    showLoading();
    try {
        const snapshot = await settlementsRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value');
        const settlements = [];
        snapshot.forEach(child => {
            const val = child.val();
            if (val.status === 'completed') {
                settlements.push({ id: child.key, ...val });
            }
        });

        // Ordenar por data (mais recente primeiro)
        settlements.sort((a, b) => (b.finalizedAt || b.createdAt) - (a.finalizedAt || a.createdAt));

        if (!document.getElementById('settlementHistoryModal')) {
             const modalHtml = `
                <div id="settlementHistoryModal" class="modal-overlay">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Histórico de Acertos</h3>
                            <button class="close-modal" onclick="document.getElementById('settlementHistoryModal').classList.remove('active')">×</button>
                        </div>
                        <div class="modal-body" id="settlementHistoryList" style="max-height: 400px; overflow-y: auto;">
                            <!-- Lista será injetada aqui -->
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        const container = document.getElementById('settlementHistoryList');
        if (settlements.length === 0) {
            container.innerHTML = '<div class="empty-state"><p class="empty-text">Nenhum acerto finalizado encontrado.</p></div>';
        } else {
            container.innerHTML = settlements.map(s => `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #eee;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                        <span style="font-weight: bold; color: #2c1810;">${formatDate(s.finalizedAt || s.createdAt)}</span>
                        <span style="color: #28a745; font-weight: bold; font-size: 0.9em;">✅ Finalizado</span>
                    </div>
                    <div style="font-size: 0.9em; color: #555; display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                        <div>Vendido: <strong style="color: #333;">${formatCurrency(s.totalSold)}</strong></div>
                        <div>Comissão: <strong style="color: #333;">${formatCurrency(s.totalCommission)}</strong></div>
                        <div>Meta: <strong style="color: #333;">${formatCurrency(s.goalAmount || 0)}</strong></div>
                        <div>Atingido: <strong style="color: ${s.goalAchievement >= 100 ? '#28a745' : '#333'};">${(s.goalAchievement || 0).toFixed(1)}%</strong></div>
                        <div style="grid-column: 1 / -1; margin-top: 5px; color: #dc3545;">Devolvidos: <strong>${s.returnedCount} itens</strong></div>
                    </div>
                </div>
            `).join('');
        }

        document.getElementById('settlementHistoryModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar histórico:', error);
        showNotification('Erro ao carregar histórico', 'error');
    }
}

function calculateTotalCommission(totalSales, commissionTiers) {
    if (!commissionTiers || commissionTiers.length === 0) return 0;
    
    const sortedTiers = [...commissionTiers].sort((a, b) => a.min - b.min);
    
    let commission = 0;
    let remaining = totalSales;
    
    for (let i = 0; i < sortedTiers.length; i++) {
        const tier = sortedTiers[i];
        const nextTier = sortedTiers[i + 1];
        
        if (remaining <= 0) break;
        
        const tierMax = nextTier ? nextTier.min : Infinity;
        const tierRange = tierMax - tier.min;
        const amountInTier = Math.min(remaining, tierRange);
        
        commission += amountInTier * (tier.percentage / 100);
        remaining -= amountInTier;
    }
    
    return commission;
}

function calculateSalesForTargetCommission(targetCommission, commissionTiers) {
    if (!commissionTiers || commissionTiers.length === 0) return 0;
    if (targetCommission <= 0) return 0;

    const sortedTiers = [...commissionTiers].sort((a, b) => a.min - b.min);
    
    let currentComm = 0;
    let requiredSales = 0;

    for (let i = 0; i < sortedTiers.length; i++) {
        const tier = sortedTiers[i];
        const nextTier = sortedTiers[i + 1];
        
        const tierMax = nextTier ? nextTier.min : Infinity;
        const tierRange = tierMax - tier.min;
        const rate = tier.percentage / 100;

        if (rate <= 0) {
             requiredSales += tierRange;
             continue;
        }

        const maxCommInTier = (tierRange === Infinity) ? Infinity : tierRange * rate;

        if (currentComm + maxCommInTier >= targetCommission) {
            const remainingCommNeeded = targetCommission - currentComm;
            const salesNeededInTier = remainingCommNeeded / rate;
            requiredSales += salesNeededInTier;
            return requiredSales;
        } else {
            currentComm += maxCommInTier;
            requiredSales += tierRange;
        }
    }
    
    return requiredSales;
}

function loadRecentSales(sales) {
    const recentSales = sales.slice(-5).reverse();
    const container = document.getElementById('recentSalesList');
    
    if (recentSales.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🛍️</div>
                <p class="empty-text">Nenhuma venda realizada ainda</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recentSales.map(sale => `
        <div class="sale-item">
            <div class="sale-header">
                <span class="sale-product">${sale.productName}</span>
                <span class="sale-price">${formatCurrency(sale.price)}</span>
            </div>
            <div class="sale-details">
                Cliente: ${sale.clientName} | ${formatDate(sale.date)}
            </div>
        </div>
    `).join('');
}

// Continua no próximo arquivo devido ao tamanho...

// ============================================
// REVENDEDORA - VENDAS
// ============================================

let selectedProduct = null;

async function loadProducts() {
    if (!currentUser) return;
    
    showLoading();

    try {
        const [ordersSnapshot, productsSnapshot, salesSnapshot] = await Promise.all([
            ordersRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value'),
            productsRef.once('value'),
            salesRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value')
        ]);

        const orders = [];
        ordersSnapshot.forEach((child) => {
            const order = child.val();
            if (order.status === 'active') {
                orders.push(order);
            }
        });

        const allProducts = {};
        productsSnapshot.forEach((child) => {
            allProducts[child.key] = {
                id: child.key,
                ...child.val()
            };
        });

        const productSalesCount = {};
        let totalSoldItems = 0;
        let totalSoldValue = 0;

        salesSnapshot.forEach((child) => {
            const sale = child.val();
            const pid = sale.productId;
            productSalesCount[pid] = (productSalesCount[pid] || 0) + 1;
        });

        let products = [];
        orders.forEach(order => {
            if (order.products) {
                order.products.forEach(pid => {
                    if (allProducts[pid]) {
                        products.push(allProducts[pid]);
                    }
                });
            }
        });

        products = products.filter((p, index, self) => 
            index === self.findIndex(t => t.id === p.id)
        );

        const container = document.getElementById('productsList');
        
        if (products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📦</div>
                    <p class="empty-text">Nenhum produto disponível para venda</p>
                </div>
            `;
            hideLoading();
            return;
        }
        
        // Calcular totais considerando quantidade
        let totalItems = 0;
        let totalValue = 0;
        
        products.forEach(p => {
            const qty = parseInt(p.quantity) || 1;
            totalItems += qty;
            totalValue += (Number(p.price) || 0) * qty;
            
            const soldCount = productSalesCount[p.id] || 0;
            const soldQty = Math.min(soldCount, qty); // Não contar mais que o existente
            totalSoldItems += soldQty;
            totalSoldValue += (Number(p.price) || 0) * soldQty;
        });

        const summaryHtml = `
            <div style="width: 100%; grid-column: 1 / -1; margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 500; color: #666;">Peças:</span>
                    <span style="font-weight: bold; color: #2c1810; font-size: 1.1em;">${totalSoldItems}/${totalItems}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #dee2e6; padding-top: 8px; margin-bottom: 10px;">
                    <span style="font-weight: 500; color: #666;">Valor:</span>
                    <span style="font-weight: bold; color: #2c1810; font-size: 1.1em;">${formatCurrency(totalSoldValue)} / ${formatCurrency(totalValue)}</span>
                </div>
                <button class="btn-secondary" onclick="openSimulatorModal()" style="width: 100%; padding: 8px; font-size: 0.9em; display: flex; align-items: center; justify-content: center; gap: 5px;">
                    🧮 Simular Comissão
                </button>
            </div>
        `;

        container.innerHTML = summaryHtml + products.map(product => {
            const soldCount = productSalesCount[product.id] || 0;
            const quantity = parseInt(product.quantity) || 1;
            const isSold = soldCount >= quantity;
            const remaining = Math.max(0, quantity - soldCount);

            return `
                <div class="product-card ${isSold ? 'sold' : ''}" onclick="${isSold ? '' : `openSaleModal('${product.id}')`}">
                    <div class="product-name">${product.name}</div>
                    <div class="product-code">${product.code}</div>
                    <div class="product-price">${formatCurrency(product.price)}</div>
                    <div class="product-quantity" style="font-size: 0.8em; color: ${isSold ? '#dc3545' : '#28a745'}; margin-top: 5px; font-weight: 500;">
                        ${isSold ? 'Esgotado' : `Disponível: ${remaining}/${quantity}`}
                    </div>
                </div>
            `;
        }).join('');

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar produtos:', error);
    }
}

function searchProducts() {
    const searchTerm = document.getElementById('productSearch').value.toLowerCase();
    const cards = document.querySelectorAll('.product-card');
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

function handleSaleClientChange() {
    const select = document.getElementById('saleClient');
    const input = document.getElementById('quickClientName');
    
    if (select.value === 'new') {
        input.style.display = 'block';
        input.focus();
    } else {
        input.style.display = 'none';
    }
}

async function openSaleModal(productId) {
    showLoading();

    try {
        const [productSnapshot, clientsSnapshot] = await Promise.all([
            productsRef.child(productId).once('value'),
            clientsRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value')
        ]);

        selectedProduct = {
            id: productId,
            ...productSnapshot.val()
        };
        
        document.getElementById('saleProductInfo').innerHTML = `
            <div class="product-info">
                <h3>${selectedProduct.name}</h3>
                <p>Código: ${selectedProduct.code}</p>
                <p class="product-price">${formatCurrency(selectedProduct.price)}</p>
            </div>
        `;
        
        const clients = [];
        clientsSnapshot.forEach((child) => {
            clients.push({
                id: child.key,
                ...child.val()
            });
        });

        const select = document.getElementById('saleClient');
        select.innerHTML = '<option value="">Selecione o Cliente</option>' +
            '<option value="new">+ Novo Cliente</option>' +
            clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        
        document.getElementById('saleModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao abrir modal de venda:', error);
    }
}

function closeSaleModal() {
    document.getElementById('saleModal').classList.remove('active');
    selectedProduct = null;
    document.getElementById('saleClient').value = '';
    document.getElementById('quickClientName').value = '';
    document.getElementById('quickClientName').style.display = 'none';
}

async function confirmSale() {
    const select = document.getElementById('saleClient');
    let clientId = select.value;
    let clientName = '';
    
    if (!clientId) {
        showNotification('Por favor, selecione um cliente', 'error');
        return;
    }
    
    showLoading();

    try {
        if (clientId === 'new') {
            const newName = document.getElementById('quickClientName').value.trim();
            if (!newName) {
                hideLoading();
                showNotification('Por favor, digite o nome do cliente', 'error');
                return;
            }

            const newClientId = generateId();
            await clientsRef.child(newClientId).set({
                resellerId: currentUser.uid,
                name: newName,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            
            clientId = newClientId;
            clientName = newName;
        } else {
            const clientSnapshot = await clientsRef.child(clientId).once('value');
            clientName = clientSnapshot.val().name;
        }

        const saleId = generateId();
        await salesRef.child(saleId).set({
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            productCode: selectedProduct.code,
            price: selectedProduct.price,
            clientId: clientId,
            clientName: clientName,
            resellerId: currentUser.uid,
            date: firebase.database.ServerValue.TIMESTAMP,
            paymentStatus: 'pending'
        });

        closeSaleModal();
        hideLoading();
        showNotification('Venda registrada com sucesso!');
        loadProducts();
        loadSoldProducts();
        updateDashboard();
    } catch (error) {
        hideLoading();
        console.error('Erro ao confirmar venda:', error);
        showNotification('Erro ao registrar venda', 'error');
    }
}

async function loadSoldProducts() {
    if (!currentUser) return;

    try {
        const snapshot = await salesRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value');
        const sales = [];
        
        snapshot.forEach((child) => {
            const sale = child.val();
            if (!sale.isSettled) {
                sales.push({
                    id: child.key,
                    ...sale
                });
            }
        });

        const container = document.getElementById('soldProductsList');
        
        if (sales.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <p class="empty-text">Nenhuma venda registrada</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = sales.reverse().map(sale => `
            <div class="sale-item">
                <div class="sale-header">
                    <span class="sale-product">${sale.productName}</span>
                    <span class="sale-price">${formatCurrency(sale.price)}</span>
                </div>
                <div class="sale-details">
                    Cliente: ${sale.clientName} | ${formatDate(sale.date)}
                </div>
                <span class="payment-status ${sale.paymentStatus}">${
                    sale.paymentStatus === 'paid' ? 'Pago' : 
                    sale.paymentStatus === 'installment' ? 'Parcelado' : 'Pendente'
                }</span>
                <div class="sale-actions" style="margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn-secondary" onclick="openEditSaleModal('${sale.id}')" style="padding: 5px 15px; font-size: 14px;">Editar</button>
                    <button class="btn-delete" onclick="cancelSale('${sale.id}')" style="padding: 5px 15px; font-size: 14px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar vendas:', error);
    }
}

async function cancelSale(saleId) {
    if (!confirm('Tem certeza que deseja cancelar esta venda? O produto voltará para o estoque e pagamentos associados serão removidos.')) return;

    showLoading();

    try {
        // 1. Remover a venda
        await salesRef.child(saleId).remove();

        // 2. Remover pagamentos associados
        const paymentsSnapshot = await paymentsRef.orderByChild('saleId').equalTo(saleId).once('value');
        const updates = {};
        paymentsSnapshot.forEach(child => {
            updates[child.key] = null;
        });
        
        if (Object.keys(updates).length > 0) {
            await paymentsRef.update(updates);
        }

        hideLoading();
        showNotification('Venda cancelada com sucesso!');
        
        // Recarregar dados
        loadProducts();
        loadSoldProducts();
        updateDashboard();
    } catch (error) {
        hideLoading();
        console.error('Erro ao cancelar venda:', error);
        showNotification('Erro ao cancelar venda', 'error');
    }
}

let currentEditingSaleId = null;

async function openEditSaleModal(saleId) {
    showLoading();
    currentEditingSaleId = saleId;

    try {
        const [saleSnapshot, clientsSnapshot] = await Promise.all([
            salesRef.child(saleId).once('value'),
            clientsRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value')
        ]);

        const sale = saleSnapshot.val();
        const clients = [];
        clientsSnapshot.forEach(child => {
            clients.push({ id: child.key, ...child.val() });
        });

        document.getElementById('editSaleInfo').innerHTML = `
            <p><strong>Produto:</strong> ${sale.productName}</p>
            <p><strong>Valor:</strong> ${formatCurrency(sale.price)}</p>
        `;

        const select = document.getElementById('editSaleClient');
        select.innerHTML = '<option value="">Selecione o Cliente</option>' +
            clients.map(c => `<option value="${c.id}" ${c.id === sale.clientId ? 'selected' : ''}>${c.name}</option>`).join('');

        document.getElementById('editSaleModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao abrir edição:', error);
    }
}

function closeEditSaleModal() {
    document.getElementById('editSaleModal').classList.remove('active');
    currentEditingSaleId = null;
}

async function saveSaleEdit() {
    const select = document.getElementById('editSaleClient');
    const clientId = select.value;
    const clientName = select.options[select.selectedIndex].text;

    if (!clientId) {
        showNotification('Selecione um cliente', 'error');
        return;
    }

    showLoading();

    try {
        await salesRef.child(currentEditingSaleId).update({
            clientId: clientId,
            clientName: clientName
        });

        closeEditSaleModal();
        hideLoading();
        showNotification('Venda atualizada com sucesso!');
        loadSoldProducts();
    } catch (error) {
        hideLoading();
        console.error('Erro ao atualizar venda:', error);
        showNotification('Erro ao atualizar venda', 'error');
    }
}

// ============================================
// REVENDEDORA - METAS
// ============================================

async function loadGoalsForm() {
    if (!currentUser) return;

    showLoading();

    try {
        const [goalsSnapshot, ordersSnapshot, productsSnapshot] = await Promise.all([
            goalsRef.child(currentUser.uid).once('value'),
            ordersRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value'),
            productsRef.once('value')
        ]);

        const goals = goalsSnapshot.val() || {};
        
        // Calcular valor total do estoque para estimativa
        const allProducts = productsSnapshot.val() || {};
        let totalStockValue = 0;
        const processedProductIds = new Set();

        ordersSnapshot.forEach(child => {
            const order = child.val();
            if (order.status === 'active' && order.products) {
                order.products.forEach(pid => {
                    if (allProducts[pid] && !processedProductIds.has(pid)) {
                        const qty = parseInt(allProducts[pid].quantity) || 1;
                        totalStockValue += (Number(allProducts[pid].price) || 0) * qty;
                        processedProductIds.add(pid);
                    }
                });
            }
        });

        const maxCommission = calculateTotalCommission(totalStockValue, goals.commissionTiers || []);
        
        const goalInput = document.getElementById('goalAmount');
        goalInput.value = goals.goalAmount || '';
        goalInput.dataset.maxCommission = maxCommission;

        document.getElementById('goalSettlementDate').value = goals.settlementDate || '';
        
        // Injetar dica de valor máximo
        let hint = document.getElementById('goalMaxHint');
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'goalMaxHint';
            hint.style.fontSize = '0.9em';
            hint.style.color = '#666';
            hint.style.marginTop = '5px';
            hint.style.marginBottom = '15px';
            if (goalInput.parentNode) {
                goalInput.parentNode.insertBefore(hint, goalInput.nextSibling);
            }
        }
        hint.innerHTML = `💰 Potencial máximo de lucro com estoque atual: <span style="color: #2c1810; font-weight: bold;">${formatCurrency(maxCommission)}</span>`;

        // Carregar tiers em modo somente leitura (true)
        loadCommissionTiers(goals.commissionTiers || [], true);
        
        // Esconder botão de adicionar se existir (para revendedoras)
        const addBtn = document.querySelector('button[onclick="addCommissionTier()"]');
        if (addBtn) addBtn.style.display = 'none';

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar metas:', error);
    }
}

function loadCommissionTiers(tiers = [], readOnly = false) {
    const container = document.getElementById('commissionTiersList');
    
    if (tiers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p class="empty-text">Nenhuma margem cadastrada</p>
            </div>
        `;
        return;
    }
    
    const disabledAttr = readOnly ? 'disabled style="background-color: #f0f0f0; color: #666;"' : '';

    container.innerHTML = tiers.map((tier, index) => `
        <div class="commission-tier">
            <input type="number" value="${tier.min}" onchange="updateTier(${index}, 'min', this.value)" class="input-field" placeholder="De (R$)" ${disabledAttr}>
            <input type="number" value="${tier.max}" onchange="updateTier(${index}, 'max', this.value)" class="input-field" placeholder="Até (R$)" ${disabledAttr}>
            <input type="number" value="${tier.percentage}" onchange="updateTier(${index}, 'percentage', this.value)" class="input-field" placeholder="% Comissão" ${disabledAttr}>
            ${readOnly ? '' : `<button class="tier-remove" onclick="removeTier(${index})">×</button>`}
        </div>
    `).join('');
}

async function addCommissionTier() {
    showLoading();

    try {
        const snapshot = await goalsRef.child(currentUser.uid).once('value');
        const goals = snapshot.val() || { commissionTiers: [] };
        
        if (!goals.commissionTiers) {
            goals.commissionTiers = [];
        }

        goals.commissionTiers.push({
            min: 0,
            max: 1000,
            percentage: 30
        });
        
        await goalsRef.child(currentUser.uid).set(goals);
        
        loadCommissionTiers(goals.commissionTiers);
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao adicionar margem:', error);
    }
}

async function updateTier(index, field, value) {
    try {
        const snapshot = await goalsRef.child(currentUser.uid).once('value');
        const goals = snapshot.val() || { commissionTiers: [] };
        
        goals.commissionTiers[index][field] = parseFloat(value);
        await goalsRef.child(currentUser.uid).set(goals);
    } catch (error) {
        console.error('Erro ao atualizar margem:', error);
    }
}

async function removeTier(index) {
    showLoading();

    try {
        const snapshot = await goalsRef.child(currentUser.uid).once('value');
        const goals = snapshot.val() || { commissionTiers: [] };
        
        goals.commissionTiers.splice(index, 1);
        await goalsRef.child(currentUser.uid).set(goals);
        
        loadCommissionTiers(goals.commissionTiers);
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao remover margem:', error);
    }
}

async function saveGoals() {
    const goalAmount = parseFloat(document.getElementById('goalAmount').value);
    const settlementDate = document.getElementById('goalSettlementDate').value;
    
    if (!goalAmount || !settlementDate) {
        showNotification('Por favor, preencha todos os campos', 'error');
        return;
    }

    // Validar se a meta é maior que o potencial máximo
    const maxCommission = parseFloat(document.getElementById('goalAmount').dataset.maxCommission || 0);
    if (maxCommission > 0 && goalAmount > maxCommission) {
        if (!confirm(`⚠️ ATENÇÃO: Sua meta (${formatCurrency(goalAmount)}) é maior que o lucro máximo possível com seu estoque atual (${formatCurrency(maxCommission)}).\n\nDeseja manter essa meta mesmo assim?`)) {
            return;
        }
    }
    
    showLoading();

    try {
        const snapshot = await goalsRef.child(currentUser.uid).once('value');
        const goals = snapshot.val() || { commissionTiers: [] };
        
        goals.goalAmount = goalAmount;
        goals.settlementDate = settlementDate;
        
        await goalsRef.child(currentUser.uid).set(goals);
        
        hideLoading();
        showNotification('Metas salvas com sucesso!');
        updateDashboard();
    } catch (error) {
        hideLoading();
        console.error('Erro ao salvar metas:', error);
        showNotification('Erro ao salvar metas', 'error');
    }
}

// ============================================
// REVENDEDORA - PAGAMENTOS
// ============================================

let selectedSale = null;

async function loadPayments() {
    if (!currentUser) return;
    
    showLoading();

    try {
        const [salesSnapshot, paymentsSnapshot] = await Promise.all([
            salesRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value'),
            paymentsRef.once('value')
        ]);

        const sales = [];
        salesSnapshot.forEach((child) => {
            const sale = child.val();
            if (!sale.isSettled) {
                sales.push({
                    id: child.key,
                    ...sale
                });
            }
        });

        const payments = {};
        paymentsSnapshot.forEach((child) => {
            payments[child.val().saleId] = { id: child.key, ...child.val() };
        });

        const container = document.getElementById('paymentsList');
        
        if (sales.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💳</div>
                    <p class="empty-text">Nenhuma venda para gerenciar</p>
                </div>
            `;
            hideLoading();
            return;
        }
        
        container.innerHTML = sales.reverse().map(sale => {
            const payment = payments[sale.id];
            let installmentsHtml = '';

            if (payment && payment.installments) {
                // Se não tiver a lista salva (legado), gera uma visualização padrão
                const list = payment.installmentsList || Array.from({length: payment.installments}, (_, i) => ({
                    number: i + 1, status: 'pending', paidAt: null, value: payment.installmentValue
                }));

                installmentsHtml = `<div class="installments-container" style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #eee;">
                    <p style="font-size: 0.9em; font-weight: 600; margin-bottom: 5px; color: #555;">Controle de Parcelas:</p>
                    ${list.map((inst, idx) => {
                        const currentVal = inst.value !== undefined ? inst.value : payment.installmentValue;
                        return `
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 0.95em; background: ${inst.status === 'paid' ? '#f0fff4' : '#fff'}; padding: 12px; border-radius: 6px; border: 1px solid ${inst.status === 'paid' ? '#c3e6cb' : '#eee'}; min-height: 48px;">
                            <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1; width: 100%;">
                                <input type="checkbox" style="width: 24px; height: 24px; min-width: 24px; cursor: pointer;" ${inst.status === 'paid' ? 'checked' : ''} onchange="handleInstallmentCheck('${payment.id}', ${idx}, this, ${currentVal})">
                                <span style="${inst.status === 'paid' ? 'text-decoration: line-through; color: #888;' : ''}">${inst.number}ª Parc. - ${formatCurrency(currentVal)}</span>
                            </label>
                            ${inst.status === 'paid' && inst.paidAt ? `<span style="font-size: 0.8em; color: #28a745; margin-left: 5px; white-space: nowrap;">${formatDate(inst.paidAt)}</span>` : ''}
                        </div>
                    `}).join('')}
                </div>`;
            }
            
            return `
                <div class="payment-item">
                    <div class="payment-header">
                        <span class="sale-product">${sale.productName}</span>
                        <span class="payment-amount">${formatCurrency(sale.price)}</span>
                    </div>
                    <div class="payment-details">
                        Cliente: ${sale.clientName} | ${formatDate(sale.date)}
                        ${payment && payment.method ? `<br>Pagamento: ${payment.method} ${payment.installments ? `(${payment.installments}x)` : ''} 
                        <button class="btn-secondary" onclick="openEditPaymentModal('${payment.id}', '${sale.id}')" style="padding: 2px 8px; font-size: 10px; margin-left: 5px; background-color: #4a90e2; color: white; border: none; border-radius: 3px; cursor: pointer;">Editar</button>
                        <button class="btn-delete" onclick="deletePayment('${payment.id}', '${sale.id}')" style="padding: 2px 8px; font-size: 10px; margin-left: 5px; background-color: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">Excluir</button>` : ''}
                    </div>
                    ${installmentsHtml}
                    <span class="payment-status ${sale.paymentStatus}">${
                        sale.paymentStatus === 'paid' ? 'Pago' : 
                        sale.paymentStatus === 'installment' ? 'Parcelado' : 'Pendente'
                    }</span>
                    ${sale.paymentStatus === 'pending' ? `
                        <div class="payment-actions">
                            <button class="btn-payment" onclick="openPaymentModal('${sale.id}')">Registrar Pagamento</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar pagamentos:', error);
    }
}

let currentInstallmentParams = null;

function handleInstallmentCheck(paymentId, index, checkbox, currentValue) {
    if (checkbox.checked) {
        checkbox.checked = false; // Espera a seleção da data
        currentInstallmentParams = { paymentId, index };
        
        // Abrir modal de data
        const modal = document.getElementById('installmentDateModal');
        document.getElementById('installmentDateInput').valueAsDate = new Date(); // Data de hoje como padrão
        document.getElementById('installmentAmountInput').value = currentValue; // Preencher com valor atual
        modal.classList.add('active');
    } else {
        // Desmarcar
        if (confirm('Deseja marcar esta parcela como pendente novamente?')) {
             updateInstallmentStatus(paymentId, index, null);
        } else {
            checkbox.checked = true; // Reverte se cancelar
        }
    }
}

async function confirmInstallmentDate() {
    const dateStr = document.getElementById('installmentDateInput').value;
    const amountStr = document.getElementById('installmentAmountInput').value;
    
    if (!dateStr || !amountStr) return;
    
    // Criar timestamp corrigindo fuso horário local
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const amount = parseFloat(amountStr);
    
    if (currentInstallmentParams) {
        await updateInstallmentStatus(currentInstallmentParams.paymentId, currentInstallmentParams.index, dateObj.getTime(), amount);
        document.getElementById('installmentDateModal').classList.remove('active');
        currentInstallmentParams = null;
    }
}

async function updateInstallmentStatus(paymentId, index, dateTimestamp, paidAmount) {
    showLoading();
    try {
        const snapshot = await paymentsRef.child(paymentId).once('value');
        const payment = snapshot.val();
        
        // Se não existir lista (pagamentos antigos), cria agora
        let list = payment.installmentsList || Array.from({length: payment.installments}, (_, i) => ({
            number: i + 1, status: 'pending', paidAt: null, value: payment.installmentValue
        }));
        
        // Garantir que todos tenham valor definido (para compatibilidade)
        list.forEach(item => {
            if (item.value === undefined) item.value = payment.installmentValue;
            item.value = parseFloat(item.value);
        });

        // 1. Atualizar o item alvo (marcar como pago ou pendente)
        if (dateTimestamp) {
            list[index].status = 'paid';
            list[index].paidAt = dateTimestamp;
            if (paidAmount !== undefined) {
                list[index].value = parseFloat(paidAmount);
            }
        } else {
            list[index].status = 'pending';
            list[index].paidAt = null;
            // O valor será redefinido no recálculo abaixo
        }

        // 2. Recalcular toda a cadeia de valores para corrigir distorções
        const baseValue = parseFloat(payment.installmentValue);
        let remainder = 0;
        const originalCount = payment.installments;

        for (let i = 0; i < list.length; i++) {
            // Se for uma parcela original, o valor base é o definido na venda. Se for extra, é 0.
            let currentBase = (i < originalCount) ? baseValue : 0;
            
            // O valor esperado é o base + o que sobrou das anteriores
            let expected = currentBase + remainder;
            
            if (list[i].status === 'paid') {
                // Se está paga, o valor é fixo (o que foi pago).
                // A diferença entre o esperado e o pago vai para o resto.
                remainder = expected - list[i].value;
            } else {
                // Se está pendente, ela absorve o resto.
                if (expected <= 0.01) {
                    // Se o valor esperado for 0 ou negativo, significa que já foi coberto por pagamentos anteriores.
                    list[i].value = 0;
                    list[i].status = 'paid'; // Marca como paga automaticamente
                    if (!list[i].paidAt) list[i].paidAt = Date.now();
                    remainder = expected; // O valor negativo continua para abater as próximas se houver
                } else {
                    list[i].value = expected;
                    list[i].status = 'pending'; // Garante status pendente se tiver valor a pagar
                    list[i].paidAt = null;
                    remainder = 0; // Dívida absorvida
                }
            }
        }

        // 3. Se sobrou dívida no final, criar nova parcela
        if (remainder > 0.01) {
            list.push({
                number: list.length + 1,
                status: 'pending',
                paidAt: null,
                value: remainder
            });
        }

        // 4. Limpar parcelas extras que ficaram zeradas/pagas automaticamente (limpeza)
        while (list.length > originalCount) {
            const last = list[list.length - 1];
            if (last.value <= 0.01 && last.status === 'paid') {
                list.pop();
            } else {
                break;
            }
        }
        
        await paymentsRef.child(paymentId).update({ installmentsList: list });
        
        // Verificar se todas as parcelas foram pagas e atualizar status da venda
        const allPaid = list.every(item => item.status === 'paid');
        await salesRef.child(payment.saleId).update({
            paymentStatus: allPaid ? 'paid' : 'installment'
        });

        hideLoading();
        loadPayments();
    } catch (error) {
        hideLoading();
        console.error(error);
        showNotification('Erro ao atualizar parcela', 'error');
    }
}

async function deletePayment(paymentId, saleId) {
    if (!confirm('Tem certeza que deseja excluir este pagamento? O status da venda voltará para pendente.')) return;
    
    showLoading();
    try {
        await paymentsRef.child(paymentId).remove();
        await salesRef.child(saleId).update({
            paymentStatus: 'pending'
        });
        
        hideLoading();
        showNotification('Pagamento excluído com sucesso!');
        loadPayments();
        updateDashboard();
    } catch (error) {
        hideLoading();
        console.error('Erro ao excluir pagamento:', error);
        showNotification('Erro ao excluir pagamento', 'error');
    }
}

let currentEditingPaymentId = null;
let currentEditingPaymentSaleId = null;
let currentEditingPaymentSalePrice = 0;

async function openEditPaymentModal(paymentId, saleId) {
    showLoading();
    currentEditingPaymentId = paymentId;
    currentEditingPaymentSaleId = saleId;

    try {
        const [paymentSnapshot, saleSnapshot] = await Promise.all([
            paymentsRef.child(paymentId).once('value'),
            salesRef.child(saleId).once('value')
        ]);
        const payment = paymentSnapshot.val();
        const sale = saleSnapshot.val();
        
        currentEditingPaymentSalePrice = sale.price;

        document.getElementById('editPaymentMethod').value = payment.method;
        
        const hasInstallment = !!payment.installments;
        document.getElementById('editHasInstallment').checked = hasInstallment;
        toggleEditInstallments();

        if (hasInstallment) {
            document.getElementById('editInstallmentCount').value = payment.installments;
            
            // Popular inputs dinâmicos com valores existentes
            const container = document.getElementById('editDynamicInstallmentsContainer');
            container.innerHTML = '';
            
            let list = payment.installmentsList;
            
            // Fallback para pagamentos antigos sem lista detalhada
            if (!list) {
                list = Array.from({length: payment.installments}, (_, i) => ({
                    number: i + 1,
                    value: payment.installmentValue
                }));
            }

            list.forEach(inst => {
                const div = document.createElement('div');
                div.style.cssText = "display: flex; gap: 10px; margin-bottom: 5px; align-items: center;";
                div.innerHTML = `
                    <span style="font-size: 0.9em; min-width: 70px;">Parcela ${inst.number}:</span>
                    <input type="number" class="input-field edit-installment-input" step="0.01" value="${parseFloat(inst.value).toFixed(2)}" style="margin-bottom: 0;">
                `;
                container.appendChild(div);
            });

        } else {
            document.getElementById('editInstallmentCount').value = '';
            document.getElementById('editDynamicInstallmentsContainer').innerHTML = '';
        }

        document.getElementById('editPaymentModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao abrir edição de pagamento:', error);
    }
}

function closeEditPaymentModal() {
    document.getElementById('editPaymentModal').classList.remove('active');
    currentEditingPaymentId = null;
    currentEditingPaymentSaleId = null;
}

function toggleEditInstallments() {
    const hasInstallment = document.getElementById('editHasInstallment').checked;
    document.getElementById('editInstallmentFields').style.display = hasInstallment ? 'block' : 'none';
}

async function savePaymentEdit() {
    const method = document.getElementById('editPaymentMethod').value;
    const hasInstallment = document.getElementById('editHasInstallment').checked;
    let installments = null;
    let installmentValue = null;
    let installmentsList = null;

    if (hasInstallment) {
        installments = parseInt(document.getElementById('editInstallmentCount').value);
        
        const inputs = document.querySelectorAll('.edit-installment-input');
        installmentsList = [];
        inputs.forEach((input, index) => {
            installmentsList.push({
                number: index + 1,
                status: 'pending', // Mantém pendente ou precisaria carregar status anterior? Simplificação: mantém lógica de edição básica
                paidAt: null,
                value: parseFloat(input.value)
            });
        });
        
        // Preservar status de parcelas já pagas se possível (lógica avançada omitida para brevidade, assumindo redefinição ou edição simples)
        // Para manter simples: se editar parcelas, reseta status ou pega o valor da primeira como referência
        if (installmentsList.length > 0) {
            installmentValue = installmentsList[0].value;
        }
    }

    showLoading();

    try {
        const updates = {
            method,
            installments,
            installmentValue
        };
        
        if (installmentsList) {
            updates.installmentsList = installmentsList;
        }

        await paymentsRef.child(currentEditingPaymentId).update(updates);

        await salesRef.child(currentEditingPaymentSaleId).update({
            paymentStatus: hasInstallment ? 'installment' : 'paid'
        });

        closeEditPaymentModal();
        hideLoading();
        showNotification('Pagamento atualizado com sucesso!');
        loadPayments();
        updateDashboard();
    } catch (error) {
        hideLoading();
        console.error('Erro ao atualizar pagamento:', error);
        showNotification('Erro ao atualizar pagamento', 'error');
    }
}

function filterPayments() {
    const filter = document.getElementById('paymentFilter').value;
    const items = document.querySelectorAll('.payment-item');
    
    items.forEach(item => {
        const status = item.querySelector('.payment-status').classList;
        
        if (filter === 'all') {
            item.style.display = 'block';
        } else {
            item.style.display = status.contains(filter) ? 'block' : 'none';
        }
    });
}

async function openPaymentModal(saleId) {
    showLoading();

    try {
        const snapshot = await salesRef.child(saleId).once('value');
        selectedSale = {
            id: saleId,
            ...snapshot.val()
        };
        
        document.getElementById('paymentSaleInfo').innerHTML = `
            <div class="product-info">
                <h3>${selectedSale.productName}</h3>
                <p>Cliente: ${selectedSale.clientName}</p>
                <p class="product-price">${formatCurrency(selectedSale.price)}</p>
            </div>
        `;
        
        document.getElementById('paymentModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao abrir modal de pagamento:', error);
    }
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
    selectedSale = null;
    document.getElementById('paymentMethod').value = '';
    document.getElementById('hasInstallment').checked = false;
    document.getElementById('installmentFields').style.display = 'none';
    document.getElementById('installmentCount').value = '';
    document.getElementById('dynamicInstallmentsContainer').innerHTML = '';
}

function toggleInstallments() {
    const hasInstallment = document.getElementById('hasInstallment').checked;
    document.getElementById('installmentFields').style.display = hasInstallment ? 'block' : 'none';
}

function generateInstallmentInputs() {
    const count = parseInt(document.getElementById('installmentCount').value);
    const container = document.getElementById('dynamicInstallmentsContainer');
    container.innerHTML = '';

    if (!count || count < 2 || !selectedSale) return;

    const total = selectedSale.price;
    // Calcular valor base e resto para distribuição
    const baseValue = Math.floor((total / count) * 100) / 100;
    let remainder = Math.round((total - (baseValue * count)) * 100) / 100;

    for (let i = 1; i <= count; i++) {
        let val = baseValue;
        // Distribui os centavos restantes nas primeiras parcelas
        if (remainder > 0.001) {
            val = (val * 100 + 1) / 100;
            remainder = (remainder * 100 - 1) / 100;
        }
        
        const div = document.createElement('div');
        div.style.cssText = "display: flex; gap: 10px; margin-bottom: 5px; align-items: center;";
        div.innerHTML = `
            <span style="font-size: 0.9em; min-width: 70px;">Parcela ${i}:</span>
            <input type="number" class="input-field installment-input" step="0.01" value="${val.toFixed(2)}" style="margin-bottom: 0;">
        `;
        container.appendChild(div);
    }
}

function generateEditInstallmentInputs() {
    const count = parseInt(document.getElementById('editInstallmentCount').value);
    const container = document.getElementById('editDynamicInstallmentsContainer');
    container.innerHTML = '';

    if (!count || count < 2) return;

    const total = currentEditingPaymentSalePrice;
    const baseValue = Math.floor((total / count) * 100) / 100;
    let remainder = Math.round((total - (baseValue * count)) * 100) / 100;

    for (let i = 1; i <= count; i++) {
        let val = baseValue;
        if (remainder > 0.001) {
            val = (val * 100 + 1) / 100;
            remainder = (remainder * 100 - 1) / 100;
        }
        
        const div = document.createElement('div');
        div.style.cssText = "display: flex; gap: 10px; margin-bottom: 5px; align-items: center;";
        div.innerHTML = `
            <span style="font-size: 0.9em; min-width: 70px;">Parcela ${i}:</span>
            <input type="number" class="input-field edit-installment-input" step="0.01" value="${val.toFixed(2)}" style="margin-bottom: 0;">
        `;
        container.appendChild(div);
    }
}

async function confirmPayment() {
    const method = document.getElementById('paymentMethod').value;
    
    if (!method) {
        showNotification('Por favor, selecione a forma de pagamento', 'error');
        return;
    }
    
    const hasInstallment = document.getElementById('hasInstallment').checked;
    let installments = null;
    let installmentValue = null;
    
    if (hasInstallment) {
        installments = parseInt(document.getElementById('installmentCount').value);
        
        const inputs = document.querySelectorAll('.installment-input');
        if (inputs.length === 0) {
            showNotification('Por favor, defina o número de parcelas', 'error');
            return;
        }

        // Pegar o valor da primeira parcela como referência (para compatibilidade)
        installmentValue = parseFloat(inputs[0].value);
        
        if (!installments) {
            showNotification('Por favor, preencha os dados do parcelamento', 'error');
            return;
        }
    }
    
    showLoading();

    try {
        const paymentId = generateId();
        const paymentData = {
            saleId: selectedSale.id,
            method: method,
            installments: installments,
            installmentValue: installmentValue,
            date: firebase.database.ServerValue.TIMESTAMP
        };

        // Criar lista de parcelas se for parcelado
        if (hasInstallment) {
            const installmentsList = [];
            const inputs = document.querySelectorAll('.installment-input');
            inputs.forEach((input, index) => {
                installmentsList.push({ 
                    number: index + 1, 
                    status: 'pending', 
                    paidAt: null,
                    value: parseFloat(input.value)
                });
            });
            paymentData.installmentsList = installmentsList;
        }

        await paymentsRef.child(paymentId).set(paymentData);

        await salesRef.child(selectedSale.id).update({
            paymentStatus: hasInstallment ? 'installment' : 'paid'
        });

        closePaymentModal();
        hideLoading();
        showNotification('Pagamento registrado com sucesso!');
        loadPayments();
        updateDashboard();
    } catch (error) {
        hideLoading();
        console.error('Erro ao registrar pagamento:', error);
        showNotification('Erro ao registrar pagamento', 'error');
    }
}

// ============================================
// REVENDEDORA - CLIENTES
// ============================================

function showAddClientModal() {
    document.getElementById('clientModal').classList.add('active');
}

function closeClientModal() {
    document.getElementById('clientModal').classList.remove('active');
    document.getElementById('clientName').value = '';
    document.getElementById('clientPhone').value = '';
    document.getElementById('clientEmail').value = '';
    document.getElementById('clientNotes').value = '';
}

async function saveClient() {
    const name = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const email = document.getElementById('clientEmail').value.trim();
    const notes = document.getElementById('clientNotes').value.trim();
    
    if (!name || !phone) {
        showNotification('Por favor, preencha nome e telefone', 'error');
        return;
    }
    
    showLoading();

    try {
        const clientId = generateId();
        await clientsRef.child(clientId).set({
            resellerId: currentUser.uid,
            name,
            phone,
            email,
            notes,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });

        closeClientModal();
        hideLoading();
        showNotification('Cliente cadastrado com sucesso!');
        loadClients();
    } catch (error) {
        hideLoading();
        console.error('Erro ao salvar cliente:', error);
        showNotification('Erro ao cadastrar cliente', 'error');
    }
}

async function loadClients() {
    if (!currentUser) return;
    
    showLoading();

    try {
        const snapshot = await clientsRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value');
        const clients = [];
        
        snapshot.forEach((child) => {
            clients.push({
                id: child.key,
                ...child.val()
            });
        });

        const container = document.getElementById('clientsList');
        
        if (clients.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👥</div>
                    <p class="empty-text">Nenhum cliente cadastrado</p>
                </div>
            `;
            hideLoading();
            return;
        }
        
        container.innerHTML = clients.map(client => `
            <div class="client-item">
                <div class="client-header">
                    <span class="client-name">${client.name}</span>
                </div>
                <div class="client-details">
                    📱 ${client.phone}
                    ${client.email ? `<br>📧 ${client.email}` : ''}
                    ${client.notes ? `<br>📝 ${client.notes}` : ''}
                </div>
                <div class="client-actions" style="margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn-secondary" onclick="viewClientHistory('${client.id}')" style="padding: 5px 15px; font-size: 14px; background-color: #4a90e2; color: white; border: none;">Histórico</button>
                    <button class="btn-secondary" onclick="openEditClientModal('${client.id}')" style="padding: 5px 15px; font-size: 14px;">Editar</button>
                    <button class="btn-delete" onclick="deleteClient('${client.id}')" style="padding: 5px 15px; font-size: 14px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Excluir</button>
                </div>
            </div>
        `).join('');

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar clientes:', error);
    }
}

function searchClients() {
    const searchTerm = document.getElementById('clientSearch').value.toLowerCase();
    const items = document.querySelectorAll('.client-item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

async function deleteClient(clientId) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    showLoading();

    try {
        await clientsRef.child(clientId).remove();
        hideLoading();
        showNotification('Cliente excluído com sucesso!');
        loadClients();
    } catch (error) {
        hideLoading();
        console.error('Erro ao excluir cliente:', error);
        showNotification('Erro ao excluir cliente', 'error');
    }
}

let currentEditingClientId = null;

async function openEditClientModal(clientId) {
    showLoading();
    currentEditingClientId = clientId;

    try {
        const snapshot = await clientsRef.child(clientId).once('value');
        const client = snapshot.val();

        document.getElementById('editClientName').value = client.name || '';
        document.getElementById('editClientPhone').value = client.phone || '';
        document.getElementById('editClientEmail').value = client.email || '';
        document.getElementById('editClientNotes').value = client.notes || '';

        document.getElementById('editClientModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao abrir edição de cliente:', error);
        showNotification('Erro ao carregar dados do cliente', 'error');
    }
}

function closeEditClientModal() {
    document.getElementById('editClientModal').classList.remove('active');
    currentEditingClientId = null;
}

async function saveClientEdit() {
    const name = document.getElementById('editClientName').value.trim();
    const phone = document.getElementById('editClientPhone').value.trim();
    const email = document.getElementById('editClientEmail').value.trim();
    const notes = document.getElementById('editClientNotes').value.trim();

    if (!name || !phone) {
        showNotification('Por favor, preencha nome e telefone', 'error');
        return;
    }

    showLoading();

    try {
        await clientsRef.child(currentEditingClientId).update({
            name,
            phone,
            email,
            notes
        });

        closeEditClientModal();
        hideLoading();
        showNotification('Cliente atualizado com sucesso!');
        loadClients();
    } catch (error) {
        hideLoading();
        console.error('Erro ao atualizar cliente:', error);
        showNotification('Erro ao atualizar cliente', 'error');
    }
}

async function viewClientHistory(clientId) {
    showLoading();
    try {
        const clientSnapshot = await clientsRef.child(clientId).once('value');
        const client = clientSnapshot.val();
        
        document.getElementById('historyClientName').textContent = `Histórico: ${client.name}`;

        // Busca todas as vendas da revendedora e filtra pelo cliente
        const salesSnapshot = await salesRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value');
        const clientSales = [];
        
        salesSnapshot.forEach(child => {
            const sale = child.val();
            if (sale.clientId === clientId) {
                clientSales.push(sale);
            }
        });

        const container = document.getElementById('clientHistoryList');
        
        if (clientSales.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666;">Nenhuma compra realizada por este cliente.</p>';
        } else {
            container.innerHTML = clientSales.reverse().map(sale => `
                <div class="sale-item" style="background: #f9f9f9; padding: 10px; margin-bottom: 10px; border-radius: 4px; border: 1px solid #eee;">
                    <div class="sale-header" style="display: flex; justify-content: space-between; font-weight: 600;">
                        <span>${sale.productName}</span>
                        <span>${formatCurrency(sale.price)}</span>
                    </div>
                    <div class="sale-details" style="font-size: 0.9em; color: #666; margin-top: 5px;">
                        Data: ${formatDate(sale.date)} <br>
                        Status: ${sale.paymentStatus === 'paid' ? 'Pago' : sale.paymentStatus === 'installment' ? 'Parcelado' : 'Pendente'}
                    </div>
                </div>
            `).join('');
        }

        document.getElementById('clientHistoryModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar histórico:', error);
        showNotification('Erro ao carregar histórico', 'error');
    }
}

function closeClientHistoryModal() {
    document.getElementById('clientHistoryModal').classList.remove('active');
}

// ============================================
// SCANNER DE CÓDIGO DE BARRAS
// ============================================

let codeReader = null;

function showBarcodeScanner() {
    document.getElementById('barcodeScannerModal').classList.add('active');
    startScanner();
}

function closeBarcodeScanner() {
    document.getElementById('barcodeScannerModal').classList.remove('active');
    stopScanner();
}

async function startScanner() {
    codeReader = new ZXing.BrowserMultiFormatReader();
    const video = document.getElementById('scannerVideo');
    
    codeReader.decodeFromVideoDevice(null, video, async (result, err) => {
        if (result) {
            const barcode = result.text;
            document.getElementById('scannerResult').textContent = `Código: ${barcode}`;
            
            try {
                const snapshot = await productsRef.once('value');
                let foundProduct = null;
                
                snapshot.forEach((child) => {
                    const product = child.val();
                    if (product.barcode === barcode || product.code === barcode) {
                        foundProduct = {
                            id: child.key,
                            ...product
                        };
                    }
                });
                
                if (foundProduct) {
                    stopScanner();
                    closeBarcodeScanner();
                    openSaleModal(foundProduct.id);
                } else {
                    document.getElementById('scannerResult').textContent = `Produto não encontrado: ${barcode}`;
                }
            } catch (error) {
                console.error('Erro ao buscar produto:', error);
            }
        }
    });
}

function stopScanner() {
    if (codeReader) {
        codeReader.reset();
        codeReader = null;
    }
}

// ============================================
// SIMULADOR DE COMISSÃO
// ============================================

async function openSimulatorModal() {
    // Injetar HTML do modal se não existir
    if (!document.getElementById('simulatorModal')) {
        const modalHtml = `
            <div id="simulatorModal" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Simulador de Comissão</h3>
                        <button class="close-modal" onclick="closeSimulatorModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Volume Total de Vendas (R$)</label>
                            <input type="number" id="simulationValue" class="input-field" placeholder="Ex: 1000.00">
                        </div>
                        <div id="simulationResult" style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 4px; display: none; text-align: center;">
                            <p style="margin-bottom: 5px; color: #666;">Comissão Estimada:</p>
                            <div id="simulationCommission" style="font-size: 1.8em; font-weight: bold; color: #2c1810;">R$ 0,00</div>
                            <div id="simulationPercentage" style="font-size: 0.9em; color: #666; margin-top: 5px;"></div>
                        </div>
                        <button class="btn-primary" onclick="calculateSimulation()" style="width: 100%; margin-top: 15px;">Calcular</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    document.getElementById('simulatorModal').classList.add('active');
    document.getElementById('simulationValue').value = '';
    document.getElementById('simulationResult').style.display = 'none';
    setTimeout(() => document.getElementById('simulationValue').focus(), 100);
}

function closeSimulatorModal() {
    const modal = document.getElementById('simulatorModal');
    if (modal) modal.classList.remove('active');
}

async function calculateSimulation() {
    const value = parseFloat(document.getElementById('simulationValue').value);
    
    if (!value || value < 0) {
        showNotification('Digite um valor válido', 'error');
        return;
    }

    try {
        // Buscar metas atuais para pegar as faixas de comissão
        const snapshot = await goalsRef.child(currentUser.uid).once('value');
        const goals = snapshot.val() || {};
        const tiers = goals.commissionTiers || [];

        const commission = calculateTotalCommission(value, tiers);
        const percentage = value > 0 ? (commission / value) * 100 : 0;

        document.getElementById('simulationCommission').textContent = formatCurrency(commission);
        document.getElementById('simulationPercentage').textContent = `Equivalente a ${percentage.toFixed(1)}% de comissão média`;
        document.getElementById('simulationResult').style.display = 'block';
        
    } catch (error) {
        console.error('Erro na simulação:', error);
        showNotification('Erro ao calcular', 'error');
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Event listeners
    document.getElementById('loginEmail').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleLogin();
    });
    
    document.getElementById('loginPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleLogin();
    });
});
