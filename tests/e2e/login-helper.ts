import { expect, type APIRequestContext, type Page } from '@playwright/test';

/** 测试走同一真实滑块接口，不在服务端增加验证绕过。 */
export async function completeLoginSlider(page: Page) {
  const slider = page.getByRole('slider', { name: '请按住滑块拖动到最右侧' });
  await expect(slider).toBeVisible();
  await slider.focus();
  for (let i = 0; i < 5; i++)
    await page.keyboard.press('ArrowRight', { delay: 110 });
  await expect(page.getByText('验证通过', { exact: true })).toBeVisible();
}
export async function loginThroughApi(
  request: APIRequestContext,
  username: string,
  password: string,
) {
  const headers = { Origin: process.env.APP_ORIGIN! };
  const challenge = await request.post('/api/v1/auth/captcha/challenge', {
    headers,
    data: {},
  });
  expect(challenge.status()).toBe(200);
  const { challengeId } = (await challenge.json()).data;
  await new Promise((resolve) => setTimeout(resolve, 450));
  const verified = await request.post('/api/v1/auth/captcha/verify', {
    headers,
    data: { challengeId, progress: 100 },
  });
  expect(verified.status()).toBe(200);
  return request.post('/api/v1/auth/login', {
    headers,
    data: {
      username,
      password,
      captchaToken: (await verified.json()).data.captchaToken,
    },
  });
}
