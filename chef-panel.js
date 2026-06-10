let currentTab = 'tab-staff';

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  sidebar?.classList.toggle('-translate-x-full');
  overlay?.classList.toggle('hidden');
  overlay?.classList.toggle('pointer-events-none');
}
window.toggleSidebar = toggleSidebar;

function showTab(tabId) {
  ['tab-staff', 'tab-prod', 'tab-qr', 'tab-reports'].forEach(id => {
    document.getElementById(id)?.classList.add('hidden');
  });
  document.getElementById(tabId)?.classList.remove('hidden');
  currentTab = tabId;
  
  if (window.innerWidth < 768) toggleSidebar();
}
window.showTab = showTab;

function setRestName() {
  const urlParams = new URLSearchParams(window.location.search);
  const restId = urlParams.get('rest');
  const restName = localStorage.getItem('restName') || 'Land';
  
  const panelName = document.getElementById('restNamePanel');
  if(panelName) panelName.textContent = restName;
  
  const headerName = document.getElementById('restNameHeader');
  if(headerName) headerName.textContent = restName;
}

function renderSidebar() {
  const container = document.getElementById('sidebarContainer');
  if (!container) return;

  container.innerHTML = `
    <aside id="sidebar" class="fixed md:relative z-40 w-72 h-full bg-black border-r border-zinc-800 -translate-x-full md:translate-x-0 transition-transform duration-300">
      <div class="bg-orange-500 p-4">
        <div class="flex items-center justify-between mb-1">
          <div class="font-bold text-white text-lg">Экран Шефа 🧱</div>
          <button class="md:hidden text-white text-xl" onclick="toggleSidebar()">✕</button>
        </div>
        <div class="text-sm text-orange-100" id="restNamePanel">Land</div>
      </div>
      
      <nav class="p-3 space-y-2">
        <button onclick="showTab('tab-staff')" class="w-full text-left px-4 py-3 rounded-lg bg-orange-500 text-white font-semibold">2. [СОЗДАТЬ ЗАДАНИЕ]</button>
        <button onclick="alert('1. [+ ПРИХОД ТОВАРА] - скоро')" class="w-full text-left px-4 py-3 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700">1. [+ ПРИХОД ТОВАРА] - скоро</button>
        <button onclick="alert('4. [МОЙ СКЛАД] - скоро')" class="w-full text-left px-4 py-3 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700">4. [МОЙ СКЛАД] - скоро</button>
        <button onclick="alert('5. [МОИ ЗАГОТОВКИ] - скоро')" class="w-full text-left px-4 py-3 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700">5. [МОИ ЗАГОТОВКИ] - скоро</button>
        <button onclick="alert('6. [СПИСАНИЕ] - скоро')" class="w-full text-left px-4 py-3 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700">6. [СПИСАНИЕ] - скоро</button>
        <button onclick="showTab('tab-reports')" class="w-full text-left px-4 py-3 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700">7. [ОТЧЁТ ПО СПИСАНИЮ]</button>
        <button onclick="alert('8. [ОТЧЁТ ЗА МЕСЯЦ] - скоро')" class="w-full text-left px-4 py-3 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700">8. [ОТЧЁТ ЗА МЕСЯЦ] - скоро</button>
        <button onclick="alert('9. [ИНВЕНТАРИЗАЦИЯ] - скоро')" class="w-full text-left px-4 py-3 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700">9. [ИНВЕНТАРИЗАЦИЯ] - скоро</button>
        <button onclick="alert('Выход')" class="w-full text-center px-4 py-3 rounded-lg bg-zinc-800 text-zinc-300 mt-4 hover:bg-zinc-700">ВЫЙТИ</button>
      </nav>
    </aside>
  `;
  lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar();
  setRestName();
  showTab('tab-staff');
});
