const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
  Referer: 'https://emdatah5.eastmoney.com/dc/zjlx/index',
};

const roundTo2 = (n) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
};

const toNumber = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

async function fetchEMRaw(fsFilter) {
  const all = [];
  let pn = 1;

  for (;;) {
    const url = `https://emdatah5.eastmoney.com/dc/ZJLX/getZDYLBData?fields=f12,f14,f3,f5,f6,f7,f8,f10,f20,f21,f22,f24,f25,f62,f66,f69,f72,f75,f78,f84,f104,f105,f127,f140,f184,f204,f205,f225,f263,f264&pn=${pn}&pz=500&fid=f62&po=1&fs=${encodeURIComponent(
      fsFilter,
    )}&ut=b2884a393a59ad64002292a3e90d46a5`;

    let lastErr = null;
    let data = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(url, {headers: DEFAULT_HEADERS});
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, attempt * 2000));
          continue;
        }
      }
    }
    if (lastErr) throw lastErr;

    const diff = data?.data?.diff;
    if (!Array.isArray(diff) || diff.length === 0) break;
    all.push(...diff);
    if (diff.length < 100) break;
    pn++;
  }

  if (all.length === 0) throw new Error('empty response');
  return all;
}

function sectorTypeToFs(sectorType) {
  if (sectorType === 'concept') return 'm:90+t:3';
  if (sectorType === 'region') return 'm:90+t:1';
  return 'm:90+t:2';
}

async function fetchSectors(sectorType) {
  const raw = await fetchEMRaw(sectorTypeToFs(sectorType));
  const result = [];
  for (const item of raw) {
    const name = typeof item.f14 === 'string' ? item.f14 : '';
    const bkCode = typeof item.f12 === 'string' ? item.f12 : '';
    const netVal = toNumber(item.f62);
    if (!name || netVal === null || netVal === 0) continue;

    const rate = toNumber(item.f184) ?? 0;
    const changePct = toNumber(item.f3) ?? 0;
    const superNet = toNumber(item.f66) ?? 0;
    const bigNet = toNumber(item.f72) ?? 0;
    const midNet = toNumber(item.f78) ?? 0;
    const smallNet = toNumber(item.f84) ?? 0;
    const turnover = toNumber(item.f6) ?? 0;
    const turnoverRate = toNumber(item.f8) ?? 0;
    const volumeRatio = toNumber(item.f10) ?? 0;
    const speed = toNumber(item.f22) ?? 0;
    const change60d = toNumber(item.f24) ?? 0;
    const changeYtd = toNumber(item.f25) ?? 0;
    const net5d = toNumber(item.f263) ?? 0;
    const net10d = toNumber(item.f264) ?? 0;
    const upCount = toNumber(item.f104) ?? 0;
    const downCount = toNumber(item.f105) ?? 0;
    const upDownDiff = toNumber(item.f225) ?? 0;
    const leaderStock = typeof item.f204 === 'string' ? item.f204 : '';
    const leaderChangePct = toNumber(item.f205) ?? 0;

    result.push({
      name,
      bkCode,
      sectorType,
      net: roundTo2(netVal / 1e8),
      rate: roundTo2(rate),
      changePct: roundTo2(changePct),
      superNet: roundTo2(superNet / 1e8),
      bigNet: roundTo2(bigNet / 1e8),
      midNet: roundTo2(midNet / 1e8),
      smallNet: roundTo2(smallNet / 1e8),
      turnover: roundTo2(turnover / 1e8),
      turnoverRate: roundTo2(turnoverRate),
      volumeRatio: roundTo2(volumeRatio),
      speed: roundTo2(speed),
      change60d: roundTo2(change60d),
      changeYtd: roundTo2(changeYtd),
      net5d: roundTo2(net5d / 1e8),
      net10d: roundTo2(net10d / 1e8),
      upCount: Math.round(upCount),
      downCount: Math.round(downCount),
      upDownDiff: Math.round(upDownDiff),
      leaderStock,
      leaderChangePct: roundTo2(leaderChangePct),
    });
  }
  return result;
}

module.exports = {fetchSectors};
