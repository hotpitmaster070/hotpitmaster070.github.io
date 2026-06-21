import {supabase} from '../api.js'

export async function renderSidebar() {
  const {data:{user}} = await supabase.auth.getUser()
  if(!user) return ''
  
  const {data: rest} = await supabase.from('restaurants').select('owner_id,name').eq('id', user.user_metadata?.restaurant_id).single()
  const role = rest?.owner_id === user.id ? 'owner' : 'chef'
  
  // Общие для всех: шеф работает, хозяин видит
  const common = [
    {view:'incoming', label:'📦 Приход товара'},
    {view:'warehouse', label:'🏪 Склад'},
    {view:'writeoff', label:'6. [СПИСАНИЕ]'},
    {view:'inventory', label:'9. [ИНВЕНТАРИЗАЦИЯ]'},
    {view:'reports', label:'📊 Отчёты'},
    {sep:true}
  ]
  
  // Только хозяин
  const ownerOnly = [
    {view:'staff', label:'👥 Повара'},
    {view:'schedule', label:'📅 График'},
    {view:'settings', label:'⚙️ Настройки'},
    {view:'add-chef', label:'➕ Добавить шефа', accent:true}
  ]
  
  // Только шеф
  const chefOnly = [
    {view:'passport', label:'0. Prep-лист', active:true},
    {view:'create-task', label:'2. [СОЗДАТЬ ЗАДАНИЕ]', accent:true}
  ]
  
  const menu = role==='owner' ? [...common, ...ownerOnly] : [...chefOnly, ...common]
  
  return `
    <div class="sidebar-head">
      <div><h2>HotPit</h2><p>${role==='owner'?'Владелец':'Экран Шефа'}</p><span class="sub">${rest?.name||'Кухня'}</span></div>
      <button class="close-btn" id="closeSidebar">×</button>
    </div>
    <nav class="menu">
      ${menu.map(item=>item.sep?'<hr class="menu-sep">':
        `<button class="menu-item ${item.accent?'accent':''} ${item.active?'active':''}" data-view="${item.view}">${item.label}</button>`
      ).join('')}
    </nav>
  `
}

export function initSidebar(onSelect) {
  document.querySelectorAll('.menu-item:not(.disabled)').forEach(btn=>{
    btn.onclick = () => {
      document.querySelectorAll('.menu-item').forEach(b=>b.classList.remove('active'))
      btn.classList.add('active')
      const section = btn.textContent.replace(/0\. Prep-лист|👥|📅|🔲|📊 |📦 |🏪 |6\. \[СПИСАНИЕ\]|9\. \[ИНВЕНТАРИЗАЦИЯ\]|2\. \[СОЗДАТЬ ЗАДАНИЕ\]|➕ /,'').trim() || 'Раздел'
      const pageSection = document.getElementById('pageSection')
      if(pageSection) pageSection.textContent = section
      onSelect(btn.dataset.view)
      if(window.innerWidth<900) document.getElementById('sidebar').classList.remove('open')
    }
  })
                                                                                     }
