export const ODDS = [2, 4, 6, 8, 12, 20, 50];
export const STOP_MS = [1050, 1500, 1950];
export function randomSymbol(random = Math.random) { return Math.floor(random() * 7); }
export function isJackpot(reels) { return reels[0] === reels[1] && reels[1] === reels[2]; }
export function chooseResult(oddsIndex, random = Math.random) {
  if (!Number.isInteger(oddsIndex) || oddsIndex < 0 || oddsIndex >= ODDS.length) {
    throw new RangeError('Invalid odds index');
  }
  if (Math.floor(random() * ODDS[oddsIndex]) === 0) {
    const symbol = randomSymbol(random);
    return [symbol, symbol, symbol];
  }
  let reels;
  do { reels = [randomSymbol(random), randomSymbol(random), randomSymbol(random)]; }
  while (isJackpot(reels));
  return reels;
}
