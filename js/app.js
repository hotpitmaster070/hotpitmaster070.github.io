import {api, supabase} from './api.js'
import {renderSidebar, initSidebar, getActiveRestaurantId} from './components/sidebar.js'
import {renderStaffView} from './views/staff.js'
import {renderPassportView, initPassportActions} from './passport.js'

const app = document.getElementById('app')
const sidebar = document.getElementById('sidebar')
const overlay = document.getElementById('overlay')

const {data:{user}} = await supabase.auth.getUser()
if(!user){location.href='/index.html'}

document.getElementById('openSidebar').onclick = ()=>{sidebar.classList.add('open');overlay.classList.add('show')}
document.getElementById('closeSidebar').onclick = closeSidebar
overlay.onclick = closeSidebar
function closeSidebar(){sidebar.classList.remove('open');overlay.classList.remove('show')}
document.getElementById('logoutBtn').onclick = async ()=>{await supabase.auth.signOut();location.href='/index.html'}

const restaurantId = await getActiveRestaurantId()
if(!restaurantId) location.href='/index.html'

sidebar.innerHTML = await renderSidebar()
initSidebar(renderView)

const {data:membership} = await supabase.from('user_restaurants').select('role').eq('user_id',user.id).eq('restaurant_id',restaurantId).single()
renderView(membership?.role==='owner'? 'staff' : 'passport')

async function renderView(view){
  if(view==='staff'){
    const staff = await api.getStaff()
    app.innerHTML = renderStaffView(staff)
    initStaffActions()
  }
  else if(view==='passport'){
    app.innerHTML = renderPassportView(restaurantId)
    initPassportActions(restaurantId)
  }
  else if(view==='invite'){
    const {data:inv, error} = await supabase.from('invitations')
    .insert({restaurant_id:restaurantId, role:'chef'})
    .select().single()
    if(error){ alert('Ошибка: '+error.message); return }

    const link = `${location.origin}/join.html?t=${inv.token}`

    app.innerHTML = `
      <div class="card" style="max-width:500px;margin:40px auto;padding:32px;text-align:center">
        <h2 style="color:var(--accent);margin-bottom:12px">Добавить шефа</h2>
        <p style="color:#a1a1aa;margin-bottom:16px">Отправь шефу ссылку или покажи QR</p>
        <input id="inviteLink" readonly value="${link}" style="width:100%;padding:12px;margin:12px 0;background:#262626;border:1px solid #333;border-radius:8px;color:#fff;font-size:14px">
        <div style="display:flex;gap:8px;margin-bottom:24px">
          <button id="copyLink" class="primary" style="flex:1;padding:14px">Копировать ссылку</button>
          <button onclick="renderView('staff')" style="padding:14px;background:#3f3f46;border:1px solid #52525b;border-radius:8px;color:#fff">Закрыть</button>
        </div>
        <canvas id="qrCanvas" style="margin:0 auto;display:block"></canvas>
        <p style="color:#71717a;font-size:12px;margin-top:12px">Ссылка действует 7 дней</p>
      </div>`

    document.getElementById('copyLink').onclick = ()=>navigator.clipboard.writeText(link)
    QRCode.toCanvas(document.getElementById('qrCanvas'), link, {width:220})
  }
  else if(view==='incoming'){
    app.innerHTML = `<div class="card" style="padding:40px;text-align:center;color:#71717a">📦 Приход товара - в разработке</div>`
  }
  else if(view==='warehouse'){
    app.innerHTML = `<div class="card" style="padding:40px;text-align:center;color:#71717a">🏪 Склад - в разработке</div>`
  }
  else if(view==='writeoff'){
    app.innerHTML = `<div class="card" style="padding:40px;text-align:center;color:#71717a">✂️ Списание - в разработке</div>`
  }
  else if(view==='inventory'){
    app.innerHTML = `<div class="card" style="padding:40px;text-align:center;color:#71717a">📋 Инвентаризация - в разработке</div>`
  }
  else if(view==='reports'){
    app.innerHTML = `<div class="card" style="padding:40px;text-align:center;color:#71717a">📈 Отчёты - в разработке</div>`
  }
  else if(view==='settings'){
    location.href='/restaurant-setup.html'
  }
  else if(view==='create-task'){
    app.innerHTML = `<div class="card" style="padding:40px;text-align:center;color:#71717a">2. Создать задание - в разработке</div>`
  }
  else {
    app.innerHTML = `<div style="color:#71717a;text-align:center;padding:60px;">Раздел "${view}" в разработке</div>`
  }
}

function initStaffActions(){
  document.getElementById('addStaffBtn')?.addEventListener('click', async ()=>{
    const {data:inv} = await supabase.from('invitations')
     .insert({restaurant_id:restaurantId, role:'stocker'})
     .select().single()
    const link = `${location.origin}/join.html?t=${inv.token}`
    document.getElementById('inviteLink').value = link
    QRCode.toCanvas(document.getElementById('qrCanvas'), link, {width:220})
    document.getElementById('inviteModal').classList.add('show')
  })
  document.getElementById('closeModal').onclick = ()=>inviteModal.classList.remove('show')
  document.getElementById('copyLink').onclick = ()=>navigator.clipboard.writeText(inviteLink.value)
      }
