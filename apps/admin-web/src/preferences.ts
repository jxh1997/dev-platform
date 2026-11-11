import { defineOverridesPreferences } from '@vben/preferences';
export const overridesPreferences = defineOverridesPreferences({
  app: {
    name: import.meta.env.VITE_APP_TITLE,
    accessMode: 'backend',
    defaultHomePath: '/demo/records',
    enableRefreshToken: true,
    defaultAvatar: '/avatar.svg',
  },
  logo: { source: '/logo.svg', sourceDark: '/logo.svg' },
  copyright: {
    companyName: 'BaJie Dev',
    companySiteLink: '',
    date: '2026',
    enable: true,
  },
});
