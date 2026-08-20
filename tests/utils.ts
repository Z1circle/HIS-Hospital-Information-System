import { Page, expect } from '@playwright/test'
import { TestUser, testConfig } from './config'

export async function login(page: Page, user: TestUser): Promise<void> {
  console.log(`[${user.role}] 正在登录: ${user.username}`)
  
  await page.goto('/login')
  
  await page.waitForSelector('.auth-card')
  
  const usernameInput = page.locator('input[placeholder="用户名"]')
  await usernameInput.fill(user.username)
  
  const passwordInput = page.locator('input[placeholder="密码"]')
  await passwordInput.fill(user.password)
  
  const loginBtn = page.locator('.submit-btn')
  await expect(loginBtn).toBeEnabled()
  await loginBtn.click()
  
  await page.waitForTimeout(3000)
  
  console.log(`[${user.role}] 登录成功`)
}

export async function waitForElement(page: Page, selector: string, timeout: number = testConfig.waitTimeout): Promise<void> {
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    try {
      const element = page.locator(selector)
      if (await element.isVisible()) {
        return
      }
    } catch {
      // 元素可能还未加载
    }
    await page.waitForTimeout(testConfig.retryInterval)
  }
  throw new Error(`等待元素超时: ${selector}`)
}

export async function waitForText(page: Page, text: string, timeout: number = testConfig.waitTimeout): Promise<void> {
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    try {
      const content = await page.textContent('body')
      if (content && content.includes(text)) {
        return
      }
    } catch {
      // 页面可能还未加载
    }
    await page.waitForTimeout(testConfig.retryInterval)
  }
  throw new Error(`等待文本超时: ${text}`)
}

export async function takeScreenshot(page: Page, name: string): Promise<string> {
  const path = `test-report/screenshots/${name}.png`
  await page.screenshot({ path, fullPage: true })
  return path
}

export async function waitForNewRecord(page: Page, initialCount: number, selector: string, timeout: number = testConfig.waitTimeout): Promise<number> {
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    try {
      const elements = page.locator(selector)
      const count = await elements.count()
      if (count > initialCount) {
        return count
      }
    } catch {
      // 元素可能还未加载
    }
    await page.waitForTimeout(testConfig.retryInterval)
  }
  throw new Error('等待新记录超时')
}
