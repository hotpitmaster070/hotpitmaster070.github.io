export function renderStaffView(staffList) {
  const cards = staffList.map(p=>`
    <div class="staff-card" data-id="${p.id}">
      <div class="staff-row">
        <div class="avatar">${p.name[0].toUpperCase()}</div>
        <div class="staff-info">
          <div class="staff-name">${p.name}</div>
          <div class="staff-meta">${p.role} • ${p.pay_type}</div>
          <div class="staff-pay" id="pay-${p.id}">ЗП:...₽</div>
        </div>
        <div class="staff-actions">
          <button class="icon-btn calendar-btn" title="График">📅</button>
          <button class="icon-btn delete-btn" title="Удалить">🗑</button>
          <button class="icon-btn fire-btn" title="Уволить">🚫</button>
        </div>
      </div>
      <div class="calendar-container" style="display:none;"></div>
    </div>
  `).join('');

  return `
    <button class="add-btn" id="addStaffBtn">+ Добавить сотрудника</button>
    <div id="inviteModal" class="modal">
      <div class="modal-content">
        <h3>QR для нового повара</h3>
        <div id="qrBox"></div>
        <input id="inviteLink" readonly>
        <div class="modal-actions">
          <button id="copyLink">Копировать ссылку</button>
          <button id="closeModal">Закрыть</button>
        </div>
      </div>
    </div>
    <div id="manualModal" class="modal">
      <div class="modal-content">
        <h3>Ручная отметка</h3>
        <label>Дата <input type="date" id="manualDate"></label>
        <label>Начало <input type="datetime-local" id="manualIn"></label>
        <label>Конец <input type="datetime-local" id="manualOut"></label>
        <div class="modal-actions">
          <button id="saveManual">Сохранить</button>
          <button id="closeManual">Отмена</button>
        </div>
      </div>
    </div>
    <div id="staffList">${cards}</div>
  `;
}
