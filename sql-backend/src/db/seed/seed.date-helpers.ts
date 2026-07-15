export const formatSeedDate = (date: Date): string => date.toISOString().split("T")[0];

export const getSeedDocDate = (index: number, total: number) => {
  const daysAgo = Math.floor((index / total) * 365);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

export const pickRandomItems = <T>(items: T[], count: number): T[] => {
  const shuffled = [...items].toSorted(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};
