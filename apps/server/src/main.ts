import { closeApplication, createApplication } from './application';
async function main() {
  const app = await createApplication();
  try {
    await app.listen(Number(process.env.PORT), process.env.HOST!);
    console.log(`DevPlatform API listening on port ${process.env.PORT}`);
  } catch (error) {
    await closeApplication(app);
    throw error;
  }
}
main().catch(() => {
  console.error('服务启动失败；请检查环境配置、数据库与迁移状态。');
  process.exitCode = 1;
});
