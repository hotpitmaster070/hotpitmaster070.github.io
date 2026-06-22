import { supabase } from './supabase.js'
import { getMyRestaurants, createRestaurant, createInvite } from './api.js'

const app = document.getElementById('app')

async function init(){
  const { data: { user } = await supabase.auth.getUser()
  if(!user) return location.href = 'index.html'

  const myRests = await getMyRestaurants()
  if(myRests.length === 0){
    return renderCreateRestaurant() // нет ресторана - показываем форму создания
  }

  const rest = myRests[0] // у хозяина 1 ресторан
  renderKitchen(rest)
}

function renderCreateRestaurant(){
  app.innerHTML = `
    <div class="center">
      <h2>Назови ресторан</h2>
      <input id="name" placeholder="Название ресторана">
      <button id="createBtn">Создать</button>
    </div>
  `
  document.getElementById('createBtn').onclick = async ()=>{
    const name = document.getElementById('name').value.trim()
    if(!name) return alert('Введи название')
    await createRestaurant(name)
    location.reload()
  }
}

function renderKitchen(rest){
  const isOwner = rest.role === 'owner'
  app.innerHTML = `
    <header><h1>${rest.name}</h1></header>
    <main>
      ${isOwner? `<button id="addChef">+ Добавить шефа</button>` : ''}
      ${rest.role === 'chef'? `<button id="addCook">+ Добавить повара</button>` : ''}
      <div id="qr"></div>
    </main>
  `
  if(isOwner) document.getElementById('addChef').onclick = ()=>genInvite(rest.id,'chef')
  if(rest.role === 'chef') document.getElementById('addCook').onclick = ()=>genInvite(rest.id,'cook')
}

async function genInvite(restaurantId, role){
  const { token } = await createInvite(restaurantId, role)
  const url = location.origin + '/join.html?t=' + token
  document.getElementById('qr').innerHTML = `<p>Ссылка: ${url}</p>` // QR потом подключим
}

init()
