import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://xljogkyropyocvuuodfl.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsam9na3lyb3B5b2N2dXVvZGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyODA5MjgsImV4cCI6MjA5Mzg1NjkyOH0.e7m1owNpYoqTpnGRKeEiMlTAIp0T0bAe28v6MX-MyVs'
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ВРЕМЕННО: возьми id своего ресторана из таблицы restaurants и вставь сюда
export const CURRENT_RESTAURANT_ID = 'сюда-вставь-uuid-ресторана'

export const api = {
  // ШЕФ
  async getStaff() {
    const { data } = await supabase.from('staff')
    .select('id,name,role,hourly_rate,daily_rate,pay_type,active')
    .eq('restaurant_id', CURRENT_RESTAURANT_ID)
    .eq('active', true)
    .order('created_at', { ascending: false })
    return data || []
  },

  async createStaffInvite(role='Повар') {
    const { data, error } = await supabase
    .from('staff_invites')
    .insert({ restaurant_id: CURRENT_RESTAURANT_ID, role })
    .select('token').single()
    if(error) throw error
    return data.token
  },

  async fireStaff(id) {
    await supabase.from('staff').update({active:false}).eq('id',id)
  },

  async deleteStaff(id) {
    await supabase.from('staff').delete().eq('id',id)
  },

  async getShifts(staffId, month) {
    const start = `${month}-01`, end = `${month}-31`
    const { data } = await supabase.from('shifts')
    .select('id,date,check_in,check_out,hours,status')
    .eq('staff_id',staffId)
    .eq('restaurant_id',CURRENT_RESTAURANT_ID)
    .gte('date',start).lte('date',end)
    return data || []
  },

  async addManualShift(staffId, date, checkIn, checkOut) {
    await supabase.from('shifts').insert({
      staff_id: staffId, restaurant_id: CURRENT_RESTAURANT_ID,
      date, check_in: checkIn, check_out: checkOut, status: 'manual'
    })
  },

  async calcPay(staff, shifts) {
    if(staff.pay_type === 'fixed') return staff.daily_rate || 0
    if(staff.pay_type === 'daily') {
      const days = new Set(shifts.filter(s=>s.check_in).map(s=>s.date)).size
      return days * (staff.daily_rate || 0)
    }
    const hours = shifts.reduce((sum, s)=> sum + (s.hours || 0), 0)
    return Math.round(hours * (staff.hourly_rate || 0))
  },

  // ПОВАР
  async redeemInvite(token, name) {
    const { data: invite } = await supabase
    .from('staff_invites').select('*').eq('token',token).is('used_by',null).single()
    if(!invite || new Date(invite.expires_at) < new Date()) throw new Error('Инвайт истёк')

    const { data: staff } = await supabase.from('staff').insert({
      restaurant_id: invite.restaurant_id,
      name: name,
      role: invite.role,
      hourly_rate: 1000, daily_rate: 8000, pay_type: 'hourly',
      invite_token: token,
      active: true
    }).select().single()

    await supabase.from('staff_invites').update({used_by: staff.id}).eq('token',token)
    return staff
  },

  async getStaffById(id) {
    const { data } = await supabase.from('staff').select('*').eq('id',id).single()
    return data
  },

  async clockInOut(staffId, type) {
    const now = new Date().toISOString()
    if(type==='in'){
      await supabase.from('shifts').insert({
        staff_id: staffId, date: now.split('T')[0], check_in: now, status: 'in_progress'
      })
    } else {
      const {data: shift} = await supabase.from('shifts')
      .select('id').eq('staff_id',staffId).is('check_out',null).single()
      if(shift) await supabase.from('shifts').update({check_out:now,status:'completed'}).eq('id',shift.id)
    }
  }
      }
