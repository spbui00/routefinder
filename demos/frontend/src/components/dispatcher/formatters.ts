export function formatDkk(n: number): string {
  return new Intl.NumberFormat('da-DK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}
