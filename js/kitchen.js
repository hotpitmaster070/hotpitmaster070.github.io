import { supabase } from './supabase.js'
import { getMembership, createInvite } from './api.js'

const params = new URLSearchParams(location.search)
const restaurantId = params.get('id')
const sidebar = document.getElementById('sidebar')
const overlay = document.getElementById('overlay')
const menu = document.getElementById('menu')
const app = document.getElementById('app')

document.getElementById('openSidebar').onclick = ()=>{sidebar.classList.add('open');overlay.classList.add('show')}
document.getElementById('closeSidebar').onclick = ()=>{sidebar.classList.remove('open');overlay.classList.remove('show')}
overlay.onclick = ()=>{sidebar.classList.remove('open');overlay.classList.remove('show')}
document.getElementById('logoutBtn').onclick = async ()=>{await supabase.auth.signOut();location='index.html'}
document.getElementById('closeModal').onclick = ()=>document.getElementById('inviteModal').classList.remove('show')
document.getElementById('copyLink').onclick = ()=>navigator.clipboard.writeText(document.getElementById('inviteLink').value)

async function init(){
  if(!restaurantId){app.innerHTML='<p style="padding:40px;color:#fca5a5">Нет ID ресторана</p>';return}
  const {data:{user}}=await supabase.auth.getUser(); if(!user) return location='index.html'
  const m = await getMembership(user.id, restaurantId)
  if(!m){app.innerHTML='<p style="padding:40px;color:#fca5a5">Нет доступа</p>';return}
  
  const r = m.restaurants; const role = m.role
  document.getElementById('restName').textContent = r.name
  document.getElementById('userRole').textContent = role==='owner'?'Владелец':role==='chef'?'Шеф':'Повар'
  document.getElementById('pageTitle').textContent = r.name
  if(r.brand_color) document.documentElement.style.setProperty('--accent', r.brand_color)
  
  // меню строится по роли. kitchen.html не раздувается
  let items = []
  if(role==='owner') items=[['Шефы','chefs'],['Склад','warehouse'],['Настройки','settings']]
  if(role==='chef') items=[['Повара','cooks'],['Склад','warehouse'],['Списания','writeoffs']]
  if(role==='cook') items=[['Склад','warehouse'],['Списания','writeoffs']]
  
  menu.innerHTML = items.map(([label,view])=>`<button class="menu-item" data-view="${view}">${label}</button>`).join('')
  menu.querySelectorAll('.menu-item').forEach(btn=>{
    btn.onclick = ()=>{menu.querySelectorAll('.menu-item').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderView(btn.dataset.view,role,restaurantId);if(window.innerWidth<900){sidebar.classList.remove('open');overlay.classList.remove('show')}}
  })
  menu.querySelector('.menu-item').click()
}

function inviteButton(label, role){
  return `<button class="add-btn" onclick="window.invite('${role}')">${label}</button>`
  }

window.invite = async (role)=>{
  const inv = await createInvite(restaurantId, role)
  const link = `${location.origin}/join.html?t=${inv.token}`
  document.getElementById('inviteLink').value = link
  document.getElementById('inviteRole').textContent = role==='chef'?'Роль: Шеф':'Роль: Повар'
  QRCode.toCanvas(document.getElementById('qrCanvas'), link, {width:220})
  document.getElementById('inviteModal').classList.add('show')
  }

async function renderView(view, role, restaurantId){
  if(view==='chefs' && role==='owner'){
    app.innerHTML = inviteButton('+ Добавить шефа','chef') + '<div id="list">Список шефов тут</div>'
  }else if(view==='cooks' && role==='chef'){
    app.innerHTML = inviteButton('+ Добавить повара','cook') + '<div id="list">Список поваров тут</div>'
  }else{
    app.innerHTML = `<div style="padding:40px;text-align:center;color:#71717a">${view} - модуль заглушка</div>`
  }
}
init()
