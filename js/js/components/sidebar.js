import {supabase} from '../api.js'
import {MENU} from '../config/menu.js'

let CURRENT_RESTAURANT_ID = null

export async function getActiveRestaurantId() {
  if(CURRENT_RESTAURANT_ID) return CURRENT_RESTAURANT_ID
  const {data:{user}} = await supabase.auth.getUser()
  if(!user) return null

  const {data:memberships} = await supabase
  .from('user_restaurants')
  .select('restaurant_id')
  .eq('user_id', user.id)
  .limit(1)

  if(memberships?.[0]) {
    CURRENT_RESTAURANT_ID = memberships[0].restaurant_id
    return CURRENT_RESTAURANT_ID
  }
  CURRENT_RESTAURANT_ID = user.user_metadata?.restaurant_id
  return CURRENT_RESTAURANT_ID
}

export async function renderSidebar() {
  const restaurantId = await getActiveRestaurantId()
  const {data:{user}} = await supabase.auth.getUser()
  if(!user ||!restaurantId) return ''

  const {data: membership} = await supabase
 .from('user_restaurants')
 .select('role,restaurants(name)')
 .eq('user_id', user.id)
 .eq('restaurant_id', restaurantId)
 .single()

  const role = membership?.role || 'chef'
  const restName = membership?.restaurants?.name || 'Кухня'
  const menu = MENU[role] || MENU.chef

  return `
    <div class="sidebar-head">
      <div><h2>HotPit</h2><p>${role}</p><span class="sub">${restName}</span></div>
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
  document.querySelectorAll('.menu-item').forEach(btn=>{
    btn.onclick = () => {
      document.querySelectorAll('.menu-item').forEach(b=>b.classList.remove('active'))
      btn.classList.add('active')
      const section = btn.textContent.replace(/[0-9\. \[\]📊👥0📦🏪✂️📋📈⚙️➕]/g,'').trim() || 'Раздел'
      const pageSection = document.getElementById('pageSection')
      if(pageSection) pageSection.textContent = section
      onSelect(btn.dataset.view)
      if(window.innerWidth<900) document.getElementById('sidebar').classList.remove('open')
    }
  })
   }
