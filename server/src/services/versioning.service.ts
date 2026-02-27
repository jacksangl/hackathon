export const buildVersionLabel = (prefix: string): string => {
  const date = new Date().toISOString().slice(0, 10);
  return `${prefix} ${date}`;
};
