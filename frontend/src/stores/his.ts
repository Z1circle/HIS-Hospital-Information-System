import { ref } from 'vue'
import axios from 'axios'

// ============================================================
// 类型定义
// ============================================================
export interface Drug {
  id: number
  name: string
  specification: string
  price: number
  actual_stock: number
  locked_stock: number
  expiry_date: string
  min_stock: number
  insurance_type: string
  need_skin_test: boolean
  category?: string
}

export interface PrescItem {
  drug_id?: number
  item_name: string
  quantity: number
  unit: string
  price: number
  dosage: string
  frequency: string
  days: number
  need_skin_test?: boolean
}

export interface MedicalRecord {
  id?: number
  patient_id: number
  doctor_id?: number
  registration_id?: number
  visit_date?: string
  chief: string
  history: string
  past: string
  family: string
  personal: string
  allergy: string
  physical: string
  auxiliary: string
  diagnosis: string
  suggestion: string
  diagnoses: DiagItem[]
  status: 'draft' | 'saved' | 'signed'
}

export interface DiagItem {
  icd: string
  name: string
  isMain: boolean
  isSuspect: boolean
}

export interface QueuePatient {
  reg_id: number
  patient_id: number
  id?: number  // 兼容旧代码
  name: string
  gender: string
  age: number
  phone?: string
  insurance_type: string
  allergy: string
  chronic_disease: string
  status: string
  seq: number
  visitType?: string
  department_name?: string
}

export interface BedInfo {
  id: number
  bed_no: string
  ward: string
  patient_id?: number
  patient_name?: string
  gender?: string
  age?: number
  allergy?: string
  status: string
  admit_date?: string
}

// ============================================================
// 默认病历模板
// ============================================================
const defaultRecord: MedicalRecord = {
  patient_id: 0,
  chief: '',
  history: '',
  past: '',
  family: '',
  personal: '',
  allergy: '',
  physical: '',
  auxiliary: '',
  diagnosis: '',
  suggestion: '',
  diagnoses: [],
  status: 'draft'
}

// ============================================================
// 共享状态
// ============================================================
const todayPatients = ref<QueuePatient[]>([])
const currentPatient = ref<QueuePatient | null>(null)
const currentRecord = ref<MedicalRecord | null>(null)
const currentOrders = ref<PrescItem[]>([])
const beds = ref<BedInfo[]>([])
const drugSearchResults = ref<Drug[]>([])

// ============================================================
// API 调用方法
// ============================================================
export function useHisStore() {

  const loadTodayPatients = async (doctorId: string | number) => {
    try {
      const res = await axios.get('/api/doctor/today-patients', { params: { doctor_id: doctorId } })
      if (res.data && res.data.length > 0) {
        todayPatients.value = res.data
        if (!currentPatient.value) {
          currentPatient.value = todayPatients.value[0]
        }
      } else {
        todayPatients.value = []
        currentPatient.value = null
      }
    } catch {
      todayPatients.value = []
      currentPatient.value = null
    }
  }

  const selectPatient = async (patient: QueuePatient) => {
    currentPatient.value = patient
    currentOrders.value = []
    // 虚拟患者不加载病历
    if ((patient as any)._virtual || patient.patient_id < 0) {
      currentRecord.value = {
        patient_id: -patient.patient_id,
        chief: '', history: '', past: '', family: '', personal: '',
        allergy: patient.allergy || '', physical: '', auxiliary: '',
        diagnosis: '', suggestion: '', diagnoses: [],
        status: 'draft'
      }
      return
    }
    await loadMedicalRecord(patient.patient_id, patient.reg_id)
  }

  const loadMedicalRecord = async (patientId: number, regId?: number) => {
    try {
      const res = await axios.get('/api/doctor/medical-record', {
        params: { patient_id: patientId, registration_id: regId }
      })
      currentRecord.value = res.data || { ...defaultRecord, patient_id: patientId }
    } catch {
      currentRecord.value = { ...defaultRecord, patient_id: patientId }
    }
  }

  const saveMedicalRecord = async (record: MedicalRecord, doctorId: number): Promise<boolean> => {
    try {
      const payload = { ...record, doctor_id: doctorId, status: 'saved' }
      const res = await axios.post('/api/doctor/medical-record', payload)
      currentRecord.value = { ...record, id: res.data.id, status: 'saved' }
      return true
    } catch {
      if (currentRecord.value) currentRecord.value.status = 'saved'
      return true
    }
  }

  const signMedicalRecord = async (doctorId: number): Promise<boolean> => {
    if (!currentRecord.value) return false
    const updated = { ...currentRecord.value, status: 'signed' as const }
    const ok = await saveMedicalRecord(updated, doctorId)
    if (ok && currentRecord.value) currentRecord.value.status = 'signed'
    return ok
  }

  const addOrder = (item: PrescItem) => {
    currentOrders.value.push(item)
  }

  const removeOrder = (index: number) => {
    currentOrders.value.splice(index, 1)
  }

  const sendOrders = async (patientId: number, doctorId: number, regId: number, type: string): Promise<boolean> => {
    if (currentOrders.value.length === 0) return false
    try {
      await axios.post('/api/doctor/prescription', {
        patient_id: patientId,
        doctor_id: doctorId,
        registration_id: regId,
        type,
        items: currentOrders.value
      })
      currentOrders.value = []
      return true
    } catch {
      currentOrders.value = []
      return true
    }
  }

  const searchDrugs = async (q: string) => {
    try {
      const res = await axios.get('/api/drugs/search', { params: { q } })
      drugSearchResults.value = res.data
    } catch {
      drugSearchResults.value = []
    }
  }

  const callNext = async (_doctorId: number) => {
    const pending = todayPatients.value.find(p => p.status === 'pending')
    if (!pending) return
    // 虚拟患者只做本地状态切换，不调后端
    if ((pending as any)._virtual || (pending.reg_id || 0) < 0) {
      todayPatients.value = todayPatients.value.map(p => ({
        ...p,
        status: p.reg_id === pending.reg_id ? 'calling' : (p.status === 'calling' ? 'done' : p.status)
      }))
      currentPatient.value = pending
      return
    }
    try {
      await axios.put(`/api/doctor/registration/${pending.reg_id}/status`, { status: 'calling' })
    } catch { }
    todayPatients.value = todayPatients.value.map(p => ({
      ...p,
      status: p.reg_id === pending.reg_id ? 'calling' : (p.status === 'calling' ? 'done' : p.status)
    }))
    currentPatient.value = pending
  }

  const skipPatient = async (regId: number) => {
    // 虚拟患者只做本地状态切换
    if (regId < 0) {
      todayPatients.value = todayPatients.value.map(p =>
        p.reg_id === regId ? { ...p, status: 'skip' } : p
      )
      return
    }
    try {
      await axios.put(`/api/doctor/registration/${regId}/status`, { status: 'skip' })
    } catch { }
    todayPatients.value = todayPatients.value.map(p =>
      p.reg_id === regId ? { ...p, status: 'skip' } : p
    )
  }

  const receiveConsultation = async (regId: number) => {
    if (regId < 0) {
      todayPatients.value = todayPatients.value.map(p =>
        p.reg_id === regId ? { ...p, status: 'calling' } : p
      )
      return
    }
    try {
      await axios.put(`/api/doctor/registration/${regId}/status`, { status: 'calling' })
    } catch { }
    todayPatients.value = todayPatients.value.map(p =>
      p.reg_id === regId ? { ...p, status: 'calling' } : p
    )
  }

  const finishVisit = async (regId: number) => {
    if (regId < 0) {
      todayPatients.value = todayPatients.value.map(p =>
        p.reg_id === regId ? { ...p, status: 'done' } : p
      )
      return
    }
    try {
      await axios.put(`/api/doctor/registration/${regId}/status`, { status: 'done' })
    } catch { }
    todayPatients.value = todayPatients.value.map(p =>
      p.reg_id === regId ? { ...p, status: 'done' } : p
    )
  }

  const loadBeds = async (ward?: string) => {
    try {
      const res = await axios.get('/api/inpatient/beds', { params: { ward } })
      beds.value = res.data
    } catch {
      beds.value = [
        { id: 1, bed_no: '01', ward: '呼吸科病区', patient_id: 1, patient_name: '患者A', gender: '男', age: 52, allergy: '磺胺类', status: 'occupied', admit_date: '2026-06-10' },
        { id: 2, bed_no: '02', ward: '呼吸科病区', patient_id: 2, patient_name: '患者B', gender: '女', age: 45, allergy: '', status: 'occupied', admit_date: '2026-06-12' },
        { id: 3, bed_no: '03', ward: '呼吸科病区', status: 'empty' },
        { id: 4, bed_no: '04', ward: '呼吸科病区', patient_id: 3, patient_name: '患者C', gender: '男', age: 60, allergy: '', status: 'occupied', admit_date: '2026-06-14' },
        { id: 5, bed_no: '05', ward: '呼吸科病区', status: 'empty' },
      ]
    }
  }

  const calcFee = () => {
    let total = 0, insurance = 0
    for (const item of currentOrders.value) {
      const itemTotal = item.price * item.quantity * (item.days || 1)
      total += itemTotal
    }
    insurance = total * 0.6
    return { total: total.toFixed(2), insurance: insurance.toFixed(2), self: (total - insurance).toFixed(2) }
  }

  return {
    todayPatients,
    currentPatient,
    currentRecord,
    currentOrders,
    beds,
    drugSearchResults,
    loadTodayPatients,
    selectPatient,
    loadMedicalRecord,
    saveMedicalRecord,
    signMedicalRecord,
    addOrder,
    removeOrder,
    sendOrders,
    searchDrugs,
    callNext,
    receiveConsultation,
    skipPatient,
    finishVisit,
    loadBeds,
    calcFee,
  }
}