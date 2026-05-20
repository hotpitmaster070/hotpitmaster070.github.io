window.onerror = function(msg, line) {
  alert('Ошибка JS: ' + msg + '\nСтрока: ' + line);
}

alert('app.js загружен'); // если это не вылезло - файл не подключен

const SUPABASE_URL = 'https://xljogkyropyocvuuodfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsam9na3lyb3B5b2N2dXVvZGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyODA5MjgsImV4cCI6MjA5Mzg1NjkyOH0.e7m1owNpYoqTpnGRKeEiMlTAIp0T0bAe28v6MX-MyVs';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function login() {
  alert('Кнопка нажата, supabase: ' + typeof window.supabase);
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  if (!email || !password) return alert('Введи email и пароль');

  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return alert('Ошибка Supabase: ' + error.message);
  
  // Успешный логин - кидаем на экран шефа
  window.location.href = '/chef.html';
}

// Функция выхода, если понадобится
async function logout() {
  await db.auth.signOut();
  window.location.href = '/index.html';
}
