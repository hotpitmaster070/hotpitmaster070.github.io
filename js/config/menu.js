export const MENU = {
  owner: [
    {view:'dashboard', label:'📊 Дашборд'},
    {view:'staff', label:'👥 Персонал'},
    {view:'passport', label:'0. Prep-лист'},
    {view:'incoming', label:'📦 Приход'},
    {view:'warehouse', label:'🏪 Склад'},
    {view:'writeoff', label:'✂️ Списание'},
    {view:'inventory', label:'📋 Инвентаризация'},
    {view:'reports', label:'📈 Отчёты'},
    {sep:true},
    {view:'settings', label:'⚙️ Настройки'},
    {view:'invite', label:'➕ Добавить сотрудника', accent:true}
  ],
  chef: [
    {view:'passport', label:'0. Prep-лист', active:true},
    {view:'create-task', label:'2. Создать задание', accent:true},
    {view:'incoming', label:'📦 Приход'},
    {view:'warehouse', label:'🏪 Склад'},
    {view:'writeoff', label:'✂️ Списание'},
    {view:'inventory', label:'📋 Инвентаризация'},
    {view:'reports', label:'📈 Отчёты'}
  ],
  manager: [
    {view:'passport', label:'0. Prep-лист'},
    {view:'reports', label:'📈 Отчёты'},
    {view:'warehouse', label:'🏪 Склад'}
  ]
}
