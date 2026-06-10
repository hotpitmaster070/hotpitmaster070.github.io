// timecheck.js - модуль отметки прихода/ухода поваров

// Рендерит кнопки "Пришёл/Ушёл" для каждого повара в графике
function renderManualCheckButtons() {
  const staffList = document.getElementById('staffList');
  if (!staffList) return;

  // Ждём пока загрузится список поваров
  setTimeout(() => {
    const staffCards = staffList.querySelectorAll('.staff-card');

    staffCards.forEach(card => {
      const staffId = card.dataset.staffId;
      const staffName = card.querySelector('.staff-name')?.innerText;

      // Проверяем, не добавили ли уже кнопки
      if (card.querySelector('.manual-check-buttons')) return;

      // Создаём блок с кнопками
      const buttonsDiv = document.createElement('div');
      buttonsDiv.className = 'manual-check-buttons mt-3 flex gap-2';
      buttonsDiv.innerHTML = `
        <button
          onclick="manualCheck('${staffId}', 'in')"
          class="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-semibold transition"
        >
          <i class="lucide lucide-log-in mr-1"></i> Пришёл
        </button>
        <button
          onclick="manualCheck('${staffId}', 'out')"
          class="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-semibold transition"
        >
          <i class="lucide lucide-log-out mr-1"></i> Ушёл
        </button>
      `;

      card.appendChild(buttonsDiv);
    });
  }, 1000);
}

// Отмечает приход/уход повара
async function manualCheck(staffId, type) {
  const now = new Date();
  const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const date = now.toISOString().split('T')[0];

  const actionText = type === 'in'? 'Приход' : 'Уход';

  try {
    // Пишем в таблицу time_logs
    const { error } = await _supabase
     .from('time_logs')
     .insert({
        staff_id: staffId,
        restaurant_id: currentRestaurantId,
        type: type,
        time: time,
        date: date,
        manual: true
      });

    if (error) throw error;

    // Показываем уведомление
    showToast(`${actionText} отмечен в ${time}`, 'success');

    // Обновляем отображение
    renderManualCheckButtons();

  } catch (err) {
    console.error('Ошибка отметки:', err);
    showToast('Ошибка! Попробуй ещё раз', 'error');
  }
}

// Показывает всплывающее уведомление
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg font-medium transition transform ${
    type === 'success'? 'bg-green-600 text-white' : 'bg-red-600 text-white'
  }`;
  toast.innerText = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Запускаем после загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
  renderManualCheckButtons();
});
