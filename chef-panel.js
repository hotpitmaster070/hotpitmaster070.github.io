window.openKitchenPanel = function() {
  const panel = document.getElementById('kitchenPanel');
  const overlay = document.getElementById('kitchenOverlay');
  if(panel) panel.style.right = '0';
  if(overlay) overlay.style.display = 'block';
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
  }
}
