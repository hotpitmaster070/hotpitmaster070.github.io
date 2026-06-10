// chef-panel.js - боковая панель как на скрине
let currentTab = 'tab-staff';

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  if (sidebar) sidebar.classList.toggle('-translate-x-full');
  if (overlay) overlay.classList.toggle('hidden');
}
window.toggleSidebar = toggleSidebar;

function showTab(tabId) {
  // Прячем все вкладки
  ['tab-staff', 'tab-prod', 'tab-qr', 'tab-reports'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  
  // Показываем нужную
  const tab = document.getElementById(tabId);
  if (tab) tab.classList.remove('hidden');
  currentTab = tabId;

  // Подсвечиваем активную кнопку в меню - оранжевый фон
  document.querySelectorAll('[data-tab]').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('bg-orange-500', 'text-white');
      btn.classList.remove('text-zinc-400');
    } else {
      btn.classList.remove('bg-orange-500', 'text-white');
      btn.classList.add('text-zinc-400');
    }
  });

  // На мобиле закрываем меню после клика
  if (window.innerWidth < 768) toggleSidebar();
}
window.showTab = showTab;

function renderSidebar() {
  const container = document.getElementById('sidebarContainer');
  if (!container) return;

  container.innerHTML = `
    <aside id="sidebar" class="fixed md:relative z-50 w-64 h-full bg-black border-r border-zinc-800 p-4 flex-col -translate-x-full md:translate-x-0 transition-transform">
      <div class="flex items-center justify-between mb-6">
        <div class="text-xl font-bold">HotPit</div>
        <button class="md:hidden" onclick="toggleSidebar()">
          <i data-lucide="x" class="w-6 h-6"></i>
        </button>
      </div>
      
      <div class="mb-6">
        <div class="flex items-center gap-3 mb-1">
          <i data-lucide="sliders" class="w-5 h-5 text-zinc-400"></i>
          <div class="font-semibold">ЭКРАН ШЕФА</div>
        </div>
        <div class="text-xs text-zinc-500 ml-8">Панель управления</div>
      </div>

      <nav class="flex-1 space-y-2">
        <button data-tab="tab-staff" onclick="showTab('tab-staff')" class="w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 bg-orange-500 text-white font-semibold">
          <i data-lucide="users" class="w-5 h-5"></i> Повара
        </button>
        <button data-tab="tab-prod" onclick="showTab('tab-prod')" class="w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-zinc-400 hover:bg-zinc-900">
          <i data-lucide="calendar" class="w-5 h-5"></i> График
        </button>
        <button data-tab="tab-qr" onclick="showTab('tab-qr')" class="w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-zinc-400 hover:bg-zinc-900">
          <i data-lucide="qr-code" class="w-5 h-5"></i> QR Сканер
        </button>
        <button data-tab="tab-reports" onclick="showTab('tab-reports')" class="w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-zinc-400 hover:bg-zinc-900">
          <i data-lucide="bar-chart-3" class="w-5 h-5"></i> Отчёты
        </button>
      </nav>
    </aside>
  `;
  
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Запускаем при загрузке
document.addEventListener('DOMContentLoaded', () => {
  renderSidebar();
  showTab('tab-staff'); // По умолчанию Повара как на скрине
});
