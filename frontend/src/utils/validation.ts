export function validatePhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

export function validateIdCard(idCard: string): boolean {
  if (idCard.length !== 18) return false
  
  const idCardRegex = /^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/
  if (!idCardRegex.test(idCard)) return false
  
  const coefficients = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const checkCodes = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"]
  
  let sum = 0
  for (let i = 0; i < 17; i++) {
    sum += parseInt(idCard[i]) * coefficients[i]
  }
  
  const remainder = sum % 11
  const expectedCheckCode = checkCodes[remainder]
  const actualCheckCode = idCard[17].toUpperCase()
  
  return expectedCheckCode === actualCheckCode
}

export function validateUsername(username: string): boolean {
  return username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9_]+$/.test(username)
}

export function validatePassword(password: string): boolean {
  return password.length >= 6 && password.length <= 20
}

export function validateName(name: string): boolean {
  return name.length >= 2 && name.length <= 10 && /^[\u4e00-\u9fa5]+$/.test(name)
}
