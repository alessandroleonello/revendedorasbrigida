// ============================================
// CONFIGURAÇÃO DO FIREBASE
// ============================================
// Substitua os valores abaixo pelas suas credenciais do Firebase
// Você pode obter essas informações no Console do Firebase:
// 1. Acesse: https://console.firebase.google.com
// 2. Selecione seu projeto
// 3. Vá em Configurações do Projeto > Suas aplicações
// 4. Copie as configurações do Firebase

const firebaseConfig = {
     apiKey: "AIzaSyA3wHKC28I5o2Ateo_zQJ90zdtlrzOF5Ag",
  authDomain: "revendedoras-brigida.firebaseapp.com",
  databaseURL: "https://revendedoras-brigida-default-rtdb.firebaseio.com",
  projectId: "revendedoras-brigida",
  storageBucket: "revendedoras-brigida.firebasestorage.app",
  messagingSenderId: "426051593862",
  appId: "1:426051593862:web:2f1ed8e840564923d49307"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referências do Firebase
const auth = firebase.auth();
const database = firebase.database();

// Referências das coleções
const usersRef = database.ref('users');
const productsRef = database.ref('products');
const salesRef = database.ref('sales');
const clientsRef = database.ref('clients');
const goalsRef = database.ref('goals');
const paymentsRef = database.ref('payments');
const ordersRef = database.ref('orders');
const configRef = database.ref('config');
const settlementsRef = database.ref('settlements');

// Variável para armazenar o usuário atual
let currentUser = null;

console.log('Firebase inicializado com sucesso!');
