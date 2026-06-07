function setRestName() {
  const urlParams = new URLSearchParams(window.location.search);
  const restId = urlParams.get('rest');
  const restName = localStorage.getItem('restName') || 'Ресторан';

  // В панели шефа справа
  const panelName = document.getElementById('restNamePanel');
  if(panelName) panelName.textContent = restName;

  // В шапке страницы сверху
  const headerName = document.getElementById('restNameHeader');
  if(headerName) headerName.textContent = restName;
}

window.openKitchenPanel = function() {
  const panel = document.getElementById('kitchenPanel');
  const overlay = document.getElementById('kitchenOverlay');
  if(panel) panel.style.right = '0';
  if(overlay) overlay.style.display = 'block';
  setRestName();
}

window.closeKitchenPanel = function() {
  const panel = document.getElementById('kitchenPanel');
  const overlay = document.getElementById('kitchenOverlay');
  if(panel) panel.style.right = '-400px';
  if(overlay) overlay.style.display = 'none';
}

window.openModal = function(type) {
  if(type === 'task') {
    alert('Создать задание - код добавим следующим шагом брат');
  } else {
    alert('Этот модуль в разработке');
  }
}

// Запускаем при загрузке страницы чтобы бейдж сразу появился
document.addEventListener('DOMContentLoaded', setRestName);
