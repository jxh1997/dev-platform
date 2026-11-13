export const integrationGroups = ['transport', 'records', 'identity'] as const;
export type IntegrationGroup = (typeof integrationGroups)[number];

export const expectedChecks: Record<IntegrationGroup, number> = {
  transport: 3,
  records: 7,
  identity: 20,
};

// Parse before loading environment files, compiled application modules, or DB setup.
export function selectGroups(args: string[]): IntegrationGroup[] {
  if (!args.length) return [...integrationGroups];
  const selected = new Set<IntegrationGroup>();
  for (let index = 0; index < args.length; index++) {
    if (args[index] !== '--group') {
      throw new Error(
        `未知参数：${args[index]}；使用 --group transport|records|identity`,
      );
    }
    const value = args[++index];
    const group = integrationGroups.find((candidate) => candidate === value);
    if (!group)
      throw new Error(
        '分组缺失或未知；使用 --group transport|records|identity',
      );
    selected.add(group);
  }
  if (!selected.size) throw new Error('拒绝空分组');
  // Stable order keeps the full run independent of the order of CLI flags.
  return integrationGroups.filter((group) => selected.has(group));
}
