export function renderStaffView(staff){
  if(!staff.length) return `
    <button class="add-btn" id="addStaffBtn">+ Добавить сотрудника</button>
    <div class="staff-card" style="text-align:center;padding:60px;color:var(--muted)">Поваров нет. Добавь первого по QR</div>
  `
  return `
    <button class="add-btn" id="addStaffBtn">+ Добавить сотрудника</button>
    <div id="staffList">
      ${staff.map(s=>`
        <div class="staff-card" data-id="${s.id}">
          <div class="staff-row">
            <div class="avatar">${s.name[0].toUpperCase()}</div>
            <div class="staff-info">
              <div class="staff-name">${s.name}</div>
              <div class="staff-meta">${s.role} • ${s.hourly_rate}₽/ч</div>
            </div>
            <div class="staff-actions">
              <button class="icon-btn calendar-btn" title="Смены">📅</button>
              <button class="icon-btn fire-btn" title="Уволить">🚫</button>
              <button class="icon-btn delete-btn" title="Удалить">🗑</button>
            </div>
          </div>
          <div class="calendar-container" style="display:none;"></div>
          <a href="staff.html" class="link" target="_blank">Открыть кабинет повара →</a>
        </div>
      `).join('')}
    </div>
  `
}
