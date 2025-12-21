# Sistema de Gestão para Revendedoras de Semijoias

Sistema completo e profissional para gerenciamento de vendas em consignação de semijoias, com interface mobile-first elegante e funcional.

## 🌟 Características Principais

### Para Revendedoras:
- ✅ **Dashboard Completo** - Visualização de vendas, metas, comissões e progresso
- ✅ **Gestão de Vendas** - Sistema intuitivo para registrar vendas com pesquisa e scanner
- ✅ **Leitor de Código de Barras** - Escanear produtos pela câmera do celular
- ✅ **Sistema de Metas Escalonado** - Configure múltiplas margens de comissão
- ✅ **Controle de Pagamentos** - Gerencie pagamentos à vista e parcelados
- ✅ **Cadastro de Clientes** - Organize sua base de clientes
- ✅ **Indicadores Visuais** - Produtos vendidos ficam inativos automaticamente
- ✅ **Barra de Progresso** - Acompanhe sua meta em tempo real

### Para Administradores:
- ✅ **Gestão de Produtos** - Adicionar manualmente ou importar via planilha Excel/CSV
- ✅ **Gestão de Revendedoras** - Cadastrar e gerenciar revendedoras
- ✅ **Sistema de Pedidos** - Vincular produtos às revendedoras
- ✅ **Relatórios** - Visualizar vendas de cada revendedora

## 🎨 Design

- Interface moderna e elegante com paleta sofisticada para o mercado de semijoias
- Tipografia premium (Cormorant Garamond + Montserrat)
- Animações suaves e transições fluidas
- Responsivo para todos os tamanhos de tela
- Mobile-first (otimizado para celular)

## 🚀 Como Usar

### Instalação
1. Baixe os 3 arquivos: `index.html`, `styles.css` e `script.js`
2. Coloque todos os arquivos na mesma pasta
3. Abra o arquivo `index.html` no navegador

### Acesso Padrão

**Administrador:**
- E-mail: `admin@semijoias.com`
- Senha: `admin123`

**Revendedora de Teste:**
- E-mail: `maria@email.com`
- Senha: `123456`

## 📋 Funcionalidades Detalhadas

### Dashboard da Revendedora
- Total em vendas realizadas
- Meta do mês configurada
- Comissão acumulada (calculada automaticamente)
- Data de acerto
- Barra de progresso visual da meta
- Últimas 5 vendas realizadas

### Aba Vendas
1. Lista todos os produtos disponíveis
2. Pesquisa por nome ou código
3. Scanner de código de barras pela câmera
4. Produtos vendidos ficam transparentes e inativos
5. Registro rápido de venda com seleção de cliente
6. Histórico de produtos vendidos

### Aba Metas
- Configurar meta de lucro desejada
- Definir data de acerto
- **Sistema de Margens Escalonadas:**
  - Ex: De R$ 0 a R$ 1000 = 30% de comissão
  - De R$ 1001 a R$ 2000 = 35% de comissão
  - De R$ 2001 em diante = 40% de comissão
- Adicionar quantas margens precisar
- Cálculo automático baseado nas vendas

### Aba Pagamentos
- Visualizar todas as vendas
- Filtrar por: Todos, Pagos, Pendentes, Parcelados
- Registrar pagamento com:
  - Forma de pagamento (Dinheiro, Cartão, PIX, etc)
  - Opção de parcelamento
  - Número de parcelas
  - Valor da parcela
- Status visual (Pago, Pendente, Parcelado)

### Aba Clientes
- Cadastrar novos clientes
- Informações: Nome, Telefone, E-mail, Observações
- Pesquisa rápida de clientes
- Lista organizada

### Painel Administrativo

#### Gestão de Produtos
- **Adicionar Manualmente:**
  - Nome, Código, Categoria, Quantidade, Preço
  - Código de barras (opcional)
  
- **Importar Planilha Excel/CSV:**
  - Colunas aceitas: Nome, Código, Categoria, Quantidade, Preço
  - Suporta variações nos nomes das colunas
  - Importação em massa

- **Editar/Excluir Produtos**

#### Gestão de Revendedoras
- Cadastrar novas revendedoras
- Visualizar vendas de cada uma
- Gerenciar acessos

#### Gestão de Pedidos
- Criar pedido selecionando produtos
- Vincular ao e-mail/cadastro da revendedora
- Produtos aparecem automaticamente para a revendedora

## 📊 Formato da Planilha de Importação

A planilha (Excel ou CSV) deve conter as seguintes colunas (em qualquer ordem):

| Nome | Código | Categoria | Quantidade | Preço |
|------|--------|-----------|------------|-------|
| Colar Dourado | COL001 | Colares | 10 | 89.90 |
| Brinco Pérola | BRI002 | Brincos | 15 | 45.50 |

**Variações aceitas:**
- Nome/nome/Produto/produto
- Código/codigo/Referência/referencia
- Categoria/categoria
- Quantidade/quantidade/Qtd/qtd
- Preço/preco/Valor/valor

## 💡 Dicas de Uso

### Para Revendedoras:
1. Configure suas metas logo no início
2. Cadastre seus clientes antes de fazer vendas
3. Use o scanner de código de barras para agilizar
4. Registre os pagamentos assim que receber
5. Acompanhe diariamente seu progresso no dashboard

### Para Administradores:
1. Cadastre todas as revendedoras primeiro
2. Use importação em massa para produtos
3. Crie pedidos específicos para cada revendedora
4. Acompanhe as vendas regularmente
5. Adicione códigos de barras para facilitar

## 🔒 Armazenamento

Os dados são armazenados localmente no navegador usando `localStorage`:
- ✅ Funciona offline após primeira carga
- ✅ Dados persistem entre sessões
- ⚠️ Limpar cache do navegador apaga os dados
- ⚠️ Dados são por dispositivo

## 📱 Compatibilidade

- ✅ Chrome (recomendado)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Navegadores mobile (Android/iOS)

**Recursos que precisam de permissão:**
- 📷 Câmera (para scanner de código de barras)

## 🎯 Melhorias Implementadas

1. **Sistema de Login** - Segurança com diferentes níveis de acesso
2. **Leitor de Código de Barras** - Usando biblioteca ZXing
3. **Importação de Planilhas** - Biblioteca XLSX para Excel
4. **Metas Escalonadas** - Múltiplas margens de comissão
5. **Controle de Estoque** - Produtos vendidos ficam inativos
6. **Sistema de Parcelamento** - Controle completo de pagamentos
7. **Interface Elegante** - Design premium para semijoias
8. **Responsividade Total** - Funciona em qualquer dispositivo

## 🚨 Observações Importantes

1. **Backup Manual:** Não há backup automático. Exporte os dados periodicamente
2. **Multi-dispositivo:** Dados não sincronizam entre dispositivos
3. **Produção:** Para uso profissional, considere implementar backend
4. **Segurança:** Senhas em texto plano - apenas para demonstração

## 📞 Suporte

Este é um sistema completo e funcional pronto para uso. Para personalizações ou melhorias, você pode:
- Adicionar mais campos nos produtos/clientes
- Implementar mais formas de pagamento
- Criar relatórios mais detalhados
- Adicionar gráficos de vendas
- Integrar com APIs de pagamento

## 🎨 Cores do Tema

- **Primária:** #2c1810 (Marrom escuro sofisticado)
- **Secundária:** #d4a574 (Dourado elegante)
- **Fundo:** #faf8f5 (Bege claro)
- **Acentos:** #f4e4d7 (Creme)

---

**Desenvolvido com foco em elegância e funcionalidade para o mercado de semijoias** ✨💎
