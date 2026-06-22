import { supabase } from '/js/supabase.js'

const $ = s => document.querySelector(s)
const content = $('#content')
const title = $('#title')
const menuBtns = document.querySelectorAll('.menu button')
const sidebar = $('#sidebar')
const overlay = $('#overlay')
const burger = $('#burger')
const closeBtn = $('#closeBtn')
const logoutBtn = $('#logoutBtn')
const qrModal = $('#qrModal')
const qrCanvas = $('#qrCanvas')
const qrText = $('#qrText')
const closeQr = $('#closeQr')
const copyLink = $('#copyLink')

let currentView = 'orders'
let currentRestaurantId = null

async function init(){
  const { data: { user } = await supabase.auth.getUser()
  if(!user){
    location.href = '/index.html'
    return
  }

  // Ищем ресторан юзера
  let { data: rest, error } = await supabase
   .from('restaurants')
   .select('id,name')
   .eq('owner_id', user.id)
   .limit(1)
   .single()

  // Если нет - создаём автоматом
  if(!rest){
    const defaultName = user.email.split('@')[0] + ' Kitchen'
    const { data: newRest, error: createErr } = await supabase
     .from('restaurants')
     .insert({ owner_id: user.id, name: defaultName })
     .select('id,name')
     .single()

    if(createErr){
      content.innerHTML = `<p style="color:#ef4444">Не могу создать ресторан: ${createErr.message}<br>Проверь RLS в Supabase</p>`
      return
    }
    rest = newRest
  }

  currentRestaurantId = rest.id
  title.textContent = rest.name || 'Заказы'

  bindEvents()
  render()
}

function bindEvents(){
  burger.onclick = () => { sidebar.classList.add('open'); overlay.classList.add('show') }
  closeBtn.onclick = () => { sidebar.classList.remove('open'); overlay.classList.remove('show') }
  overlay.onclick = () => { sidebar.classList.remove('open'); overlay.classList.remove('show') }

  menuBtns.forEach(btn => {
    btn.onclick = () => {
      menuBtns.forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      currentView = btn.dataset.view
      title.textContent = btn.textContent === 'Заказы'? 'Заказы' : btn.textContent === 'Меню'? 'Меню' : 'QR'
      sidebar.classList.remove('open')
      overlay.classList.remove('show')
      render()
    }
  })

  logoutBtn.onclick = async () => {
    await supabase.auth.signOut()
    location.href = '/index.html'
  }

  closeQr.onclick = () => qrModal.style.display = 'none'
  qrModal.onclick = e => { if(e.target === qrModal) qrModal.style.display = 'none' }
  copyLink.onclick = () => {
    navigator.clipboard.writeText(qrText.textContent)
    copyLink.textContent = 'Скопировано!'
    setTimeout(() => copyLink.textContent = 'Копировать ссылку', 1500)
  }
}

async function render(){
  if(currentView === 'orders') return renderOrders()
  if(currentView === 'menu') return renderMenu()
  if(currentView === 'qr') return renderQR()
}

async function renderOrders(){
  content.innerHTML = '<p style="color:#a3a3a3">Загрузка заказов...</p>'
  const { data: orders, error } = await supabase
   .from('orders')
   .select('*')
   .eq('restaurant_id', currentRestaurantId)
   .order('created_at', { ascending: false })
   .limit(50)

  if(error){
    content.innerHTML = `<p style="color:#ef4444">Ошибка: ${error.message}</p>`
    return
  }
  if(!orders ||!orders.length){
    content.innerHTML = '<p style="color:#a3a3a3">Заказов пока нет. Отсканируй QR из вкладки QR</p>'
    return
  }

  content.innerHTML = orders.map(o => `
    <div style="background:var(--card-2);padding:16px;border-radius:12px;margin-bottom:12px;border:1px solid #333">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <b>Заказ #${o.id.slice(0,8)}</b>
        <span style="color:var(--accent)">${o.status}</span>
      </div>
      <div style="color:#a3a3a3;font-size:14px">${new Date(o.created_at).toLocaleString('ru')}</div>
      <pre style="margin-top:8px;white-space:pre-wrap;font-size:13px">${JSON.stringify(o.items, null, 2)}</pre>
    </div>
  `).join('')
}

async function renderMenu(){
  content.innerHTML = '<p style="color:#a3a3a3">Загрузка меню...</p>'
  const { data: items } = await supabase
   .from('menu_items')
   .select('*')
   .eq('restaurant_id', currentRestaurantId)
   .order('created_at', { ascending: false })

  content.innerHTML = `
    <button onclick="alert('Добавляй блюда в Supabase → menu_items')" style="margin-bottom:16px;width:auto;padding:10px 16px;background:var(--accent);color:#000;border:0;border-radius:8px">+ Добавить блюдо в Supabase</button>
    <div>${(items||[]).map(i => `
      <div style="background:var(--card-2);padding:12px;border-radius:12px;margin-bottom:8px;display:flex;justify-content:space-between">
        <span>${i.name} - ${i.price}₽</span>
        <span style="color:#a3a3a3">${i.is_active? 'Активно' : 'Скрыто'}</span>
      </div>
    `).join('') || '<p style="color:#a3a3a3">Меню пустое. Добавь блюда в таблице menu_items</p>'}</div>
  `
}

async function renderQR(){
  const url = `https://hotpit-menu.vercel.app/r/${currentRestaurantId}`
  qrText.value = url
  qrCanvas.innerHTML = ''

  const img = new Image()
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`
  img.onload = () => qrCanvas.appendChild(img)

  content.innerHTML = `
    <div style="background:var(--card-2);padding:24px;border-radius:16px;text-align:center">
      <h3 style="margin-bottom:16px">QR для клиентов</h3>
      <div id="qrCanvas" style="display:flex;justify-content:center"></div>
      <p style="color:#a3a3a3;font-size:14px;margin:12px 0">Сканируй с телефона</p>
      <button onclick="document.getElementById('qrModal').style.display='flex'" style="width:auto;padding:10px 16px;background:var(--accent);color:#000;border:0;border-radius:8px">Показать крупно</button>
    </div>
  `
}

init()
