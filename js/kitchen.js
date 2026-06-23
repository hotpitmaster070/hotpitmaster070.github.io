import { supabase } from './supabase.js'
import { addChef, addCook, showCookQR, copyCookLink, deleteCook } from './kitchen.actions.js'

let myRole, myRestaurantId

async function init(){
  // БЫЛО: const { data:{user} } = await supabase.auth.getUser()
  // СТАЛО: ждём сессию
  const { data:{session} } = await supabase.auth.getSession()
  if(!session){ location.href='/index.html'; return }
  const user = session.user

  const {data:profile, error} = await supabase.from('profiles').select('role,restaurant_id').eq('id',user.id).single()
  if(error || !profile){ 
    console.log('Профиль ошибка:', error)
    location.href='/index.html'; 
    return 
  }
  
  myRole=profile.role
  myRestaurantId=profile.restaurant_id

  if(myRole==='owner') renderOwner()
  else if(myRole==='chef') renderChef()
  else location.href='/index.html'
}
init()

async function renderOwner(){
  document.getElementById('content').innerHTML = `
    <button class="btn-primary" onclick="openChefModal()">+ Добавить шефа</button>
    <div id="chefInfo" style="margin-top:20px;color:var(--muted)"></div>
    
    <div class="modal-overlay" id="chefModal">
      <div class="modal">
        <h3>Новый шеф</h3>
        <input id="chefName" placeholder="ФИО шефа">
        <input id="chefEmail" type="email" placeholder="email">
        <input id="chefPass" type="password" placeholder="пароль">
        <div class="row">
          <button onclick="closeChefModal()">Отмена</button>
          <button class="btn-primary" onclick="saveChef()">Создать</button>
        </div>
      </div>
    </div>
  `
  const {data:chef} = await supabase.from('profiles').select('full_name').eq('restaurant_id',myRestaurantId).eq('role','chef').single()
  document.getElementById('chefInfo').textContent = chef ? `Текущий шеф: ${chef.full_name}` : 'Шеф не назначен'
  
  window.openChefModal=()=>chefModal.style.display='flex'
  window.closeChefModal=()=>chefModal.style.display='none'
  window.saveChef=async()=>{
    await addChef(chefEmail.value,chefPass.value,chefName.value,myRestaurantId)
    location.reload()
  }
}

async function renderChef(){
  document.getElementById('content').innerHTML = `
    <input id="cookName" placeholder="Имя повара: Ваня">
    <button class="btn-primary" onclick="addCook(cookName.value,myRestaurantId).then(loadCooks)">+ Добавить повара</button>
    <div id="cookList" style="margin-top:20px"></div>
    
    <div class="modal-overlay" id="qrModal">
      <div class="modal">
        <h3 id="qrName"></h3>
        <canvas id="qrCanvas"></canvas>
        <p id="qrLink" style="word-break:break-all;font-size:12px;margin-top:12px"></p>
        <button onclick="qrModal.style.display='none'">Закрыть</button>
      </div>
    </div>
  `
  loadCooks()
  
  window.showCookQR=(token,name)=>{
    qrName.textContent=name
    qrLink.textContent=location.origin+'/r/'+token
    QRCode.toCanvas(qrCanvas,location.origin+'/r/'+token,{width:240})
    qrModal.style.display='flex'
  }
  window.copyCookLink=async token=>{
    await navigator.clipboard.writeText(location.origin+'/r/'+token)
    alert('Скопировано')
  }
  window.del=async id=>{
    if(confirm('Удалить?')){await deleteCook(id);loadCooks()}
  }
}

async function loadCooks(){
  const {data:cooks} = await supabase.from('cooks').select('*').eq('restaurant_id',myRestaurantId).order('created_at',{ascending:false})
  cookList.innerHTML = cooks.map(c=>`
    <div class="auth-wrap" style="margin:8px 0;padding:16px">
      <b>${c.full_name}</b>
      <div class="row">
        <button onclick="showCookQR('${c.cook_token}','${c.full_name}')">QR</button>
        <button onclick="copyCookLink('${c.cook_token}')">Копировать</button>
        <button onclick="del('${c.id}')">Удалить</button>
      </div>
    </div>
  `).join('') || 'Поваров нет'
}
