export function renderStaffView() {
  return `
    <button class="add-btn">+ Добавить сотрудника</button>
    <div id="staffList">
      <div class="staff-card" data-id="demo1">
        <div class="staff-row">
          <div class="avatar">M</div>
          <div class="staff-info">
            <div class="staff-name">Mubariz</div>
            <div class="staff-meta">Повар • 1000₽/ч</div>
          </div>
          <div class="staff-actions">
            <button class="fire-btn">Уволить</button>
            <button class="icon-btn calendar-btn">📅</button>
            <button class="icon-btn">🗑</button>
          </div>
        </div>
        <div class="calendar-container" style="display:none;"></div>
        <a href="#" class="link">Открыть кабинет повара →</a>
      </div>
    </div>
  `;
}
