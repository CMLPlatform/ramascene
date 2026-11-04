// NUTS2 regions per country, taken from CircuMAT python_ini/input_data/nuts2_map.json.
// Until regional EXIOBASE data is loaded, NUTS2 values are a placeholder split of the country total.
export const NUTS2: Record<string, string[]> = {
  Netherlands: ['NL11', 'NL12', 'NL13', 'NL21', 'NL22', 'NL23', 'NL31', 'NL32', 'NL33', 'NL34', 'NL41', 'NL42'],
  Germany: ['DE11', 'DE12', 'DE13', 'DE14', 'DE21', 'DE22', 'DE23', 'DE24', 'DE25', 'DE26', 'DE27', 'DE30', 'DE40', 'DE50', 'DE60', 'DE71', 'DE72', 'DE73', 'DE80', 'DE91', 'DE92', 'DE93', 'DE94', 'DEA1', 'DEA2', 'DEA3', 'DEA4', 'DEA5', 'DEB1', 'DEB2', 'DEB3', 'DEC0', 'DED2', 'DED4', 'DED5', 'DEE0', 'DEF0', 'DEG0'],
  France: ['FR10', 'FRB0', 'FRC1', 'FRC2', 'FRD1', 'FRD2', 'FRE1', 'FRE2', 'FRF1', 'FRF2', 'FRF3', 'FRG0', 'FRH0', 'FRI1', 'FRI2', 'FRI3', 'FRJ1', 'FRJ2', 'FRK1', 'FRK2', 'FRL0', 'FRM0', 'FRY1', 'FRY2', 'FRY3', 'FRY4', 'FRY5'],
  Belgium: ['BE10', 'BE21', 'BE22', 'BE23', 'BE24', 'BE25', 'BE31', 'BE32', 'BE33', 'BE34', 'BE35'],
  Poland: ['PL21', 'PL22', 'PL41', 'PL42', 'PL43', 'PL51', 'PL52', 'PL61', 'PL62', 'PL63', 'PL71', 'PL72', 'PL81', 'PL82', 'PL84', 'PL91', 'PL92'],
  Spain: ['ES11', 'ES12', 'ES13', 'ES21', 'ES22', 'ES23', 'ES24', 'ES30', 'ES41', 'ES42', 'ES43', 'ES51', 'ES52', 'ES53', 'ES61', 'ES62', 'ES63', 'ES64', 'ES70'],
  Italy: ['ITC1', 'ITC2', 'ITC3', 'ITC4', 'ITF1', 'ITF2', 'ITF3', 'ITF4', 'ITF5', 'ITF6', 'ITG1', 'ITG2', 'ITH1', 'ITH2', 'ITH3', 'ITH4', 'ITH5', 'ITI1', 'ITI2', 'ITI3', 'ITI4'],
  Portugal: ['PT11', 'PT15', 'PT16', 'PT17', 'PT18', 'PT20', 'PT30'],
};

export function nuts2Codes(country: string): string[] {
  return NUTS2[country] ?? [];
}

// Deterministic placeholder weight of the i-th region.
function weight(index: number): number {
  return 1 + ((index * 37) % 5) / 10;
}

// Share of the country total for each region; the shares add up to 1.
export function nuts2Shares(codes: string[]): number[] {
  const weights = codes.map((_, i) => weight(i));
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  return weights.map((w) => w / sum);
}

export function nuts2Share(codes: string[], code: string): number {
  const index = codes.indexOf(code);
  return index < 0 ? 1 : nuts2Shares(codes)[index];
}
