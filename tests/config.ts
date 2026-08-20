export interface TestUser {
  username: string
  password: string
  role: 'patient' | 'doctor' | 'pharmacist' | 'admin'
  name: string
}

export interface TestConfig {
  baseUrl: string
  waitTimeout: number
  retryInterval: number
  users: {
    patient: TestUser
    doctor: TestUser
    pharmacist: TestUser
  }
  appointment: {
    department: string
    doctorName: string
    symptoms: string
    description: string
  }
  medication: {
    name: string
    dosage: string
    frequency: string
  }
}

export const testConfig: TestConfig = {
  baseUrl: 'http://localhost:5173',
  waitTimeout: 30000,
  retryInterval: 2000,
  users: {
    patient: {
      username: 'patient',
      password: '123456',
      role: 'patient',
      name: '王小明'
    },
    doctor: {
      username: 'doctor1',
      password: '123456',
      role: 'doctor',
      name: '张明华'
    },
    pharmacist: {
      username: 'pharmacist1',
      password: '123456',
      role: 'pharmacist',
      name: '李萍萍'
    }
  },
  appointment: {
    department: '内科',
    doctorName: '张明华',
    symptoms: '头痛、发烧',
    description: '患者主诉头痛3天，伴有发烧，体温38.5度'
  },
  medication: {
    name: '布洛芬胶囊',
    dosage: '0.2g',
    frequency: '每日两次'
  }
}
