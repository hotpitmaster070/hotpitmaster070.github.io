import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://xljogkyropyocvuuodfl.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsam9na3lyb3B5b2N2dXVvZGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyODA5MjgsImV4cCI6MjA5Mzg1NjkyOH0.e7m1owNpYoqTpnGRKeEiMlTAIp0T0bAe28v6MX-MyVs'
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function getRestaurantId(){
  const {data:{user}} = await supabase.auth.getUser()
  if(!user) throw new Error('Не авторизован')
  const restId = user.user_metadata?.restaurant_id
  if(!restId) throw new Error('У юзера нет restaurant_id. Проверь онбординг')
  return restId
}

export const api = {
  async getStaff(){
    const restId = await getRestaurantId()
    const {data,error} = await supabase.from('staff')
    .select('id,name,role,hourly_rate,daily_rate,pay_type,active,restaurant_id')
    .eq('restaurant_id',restId).eq('active',true).order('created_at',{ascending:false})
    if(error) throw error
    return data||[]
  },

  async createStaffInvite(role='Повар'){
    const restId = await getRestaurantId()
    const {data} = await supabase.from('staff_invites')
    .insert({restaurant_id:restId,role}).select('token').single()
    return data.token
  },

  async getStaffById(id){
    const {data} = await supabase.from('staff').select('*').eq('id',id).single()
    return data
  },

  async getShifts(staffId, month){
    const restId = await getRestaurantId()
    const start = `${month}-01`, end = `${month}-31`
    const {data} = await supabase.from('shifts')
    .select('id,date,check_in,check_out,hours,status')
    .eq('staff_id',staffId).eq('restaurant_id',restId)
    .gte('date',start).lte('date',end)
    return data||[]
  },

  async getShiftsForDay(staffId,date){
    const restId = await getRestaurantId()
    const {data} = await supabase.from('shifts')
    .select('hours').eq('staff_id',staffId).eq('restaurant_id',restId).eq('date',date)
    return data||[]
  },

  async getShiftsForMonth(staffId,month){
    const restId = await getRestaurantId()
    const start = `${month}-01`, end = `${month}-31`
    const {data} = await supabase.from('shifts')
    .select('hours').eq('staff_id',staffId).eq('restaurant_id',restId)
    .gte('date',start).lte('date',end)
    return data||[]
  },

  async clockInOut(staffId,type){
    const restId = await getRestaurantId()
    const now = new Date().toISOString()
    if(type==='in'){
      await supabase.from('shifts').insert({
        staff_id:staffId,restaurant_id:restId,
        date:now.split('T')[0],check_in:now,status:'in_progress'
      })
    } else {
      const {data:shift} = await supabase.from('shifts')
      .select('id').eq('staff_id',staffId).is('check_out',null).single()
      if(shift) await supabase.from('shifts').update({check_out:now,status:'completed'}).eq('id',shift.id)
    }
  },

  async addManualShift(staffId,date,checkIn,checkOut){
    const restId = await getRestaurantId()
    await supabase.from('shifts').insert({
      staff_id:staffId,restaurant_id:restId,date,check_in:checkIn,check_out:checkOut,status:'manual'
    })
  },

  async calcPay(staff,shifts){
    if(staff.pay_type==='fixed') return staff.monthly_rate||0
    if(staff.pay_type==='daily'){
      const days = new Set(shifts.filter(s=>s.check_in).map(s=>s.date)).size
      return days*(staff.daily_rate||0)
    }
    const hours = shifts.reduce((sum,s)=>sum+(s.hours||0),0)
    return Math.round(hours*(staff.hourly_rate||0))
  },

  async fireStaff(id){await supabase.from('staff').update({active:false}).eq('id',id)},
  async deleteStaff(id){await supabase.from('staff').delete().eq('id',id)}
                                                                          }
