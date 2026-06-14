import { renderStaffView } from './views/staff.js';

const app = document.getElementById('app');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const pageTitle = document.getElementById('pageTitle');

function closeSidebar(){
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
}

document.getElementById('openSidebar').onclick = () => {
  sidebar.classList.add('open');
  overlay.classList.add('show');
}
document.getElementById('closeSidebar').onclick = closeSidebar;
overlay.onclick = closeSidebar;

document.querySelectorAll('.menu-item').forEach(btn=>{
  btn.onclick = () => {
    document.querySelectorAll('.menu-item').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const view = btn.dataset.view;
    pageTitle.textContent = btn.textContent.replace(/👥|📅|🔲|📊 /,'');
    renderView(view);
    closeSidebar();
  }
});

function renderView(view){
  if(view==='staff'){
    app.innerHTML = renderStaffView();
    // вешаем клик на календарь после отрисовки
    setTimeout(()=>{
      const calBtn = app.querySelector('.calendar-btn');
      if(calBtn){
        calBtn.onclick = (e)=>{
          const card = e.target.closest('.staff-card');
          const cont = card.querySelector('.calendar-container');
          cont.style.display = cont.style.display==='none' ? 'block' : 'none';
          if(cont.innerHTML==='') cont.innerHTML = renderCalendar();
        }
      }
    },0);
  } else {
    app.innerHTML = `<div style="color:#71717a;text-align:center;padding:60px;">Раздел "${view}" в разработке</div>`;
  }
}

function renderCalendar(){
  let html = '<div class="calendar-grid">';
  for(let i=1;i<=30;i++) html += `<button class="day">${i}</button>`;
  html += '</div>';
  return html;
}

// старт
renderView('staff');
