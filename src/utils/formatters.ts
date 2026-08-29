/**
 * Utility formatters and electrical engineering calculations
 */

export function formatElectricalValue(
  value: number | undefined,
  unit: string = '',
  decimals: number = 2
): { text: string; isInvalid: boolean; isSentinel: boolean } {
  if (value === undefined || value === null) {
    return { text: '--', isInvalid: true, isSentinel: false };
  }

  // Sentinel detection as per KIOT specification
  if (value === 9999 || value === 999999) {
    return {
      text: 'INVALID (9999)',
      isInvalid: true,
      isSentinel: true,
    };
  }

  return {
    text: `${value.toFixed(decimals)}${unit ? ' ' + unit : ''}`,
    isInvalid: false,
    isSentinel: false,
  };
}

export function getGatewayStatusInfo(online: number, lastUpdateSeconds: number): {
  label: string;
  badgeClass: string;
  bgClass: string;
  textClass: string;
  dotClass: string;
  description: string;
} {
  if (online === 0 || lastUpdateSeconds > 120) {
    return {
      label: 'DISCONNECTED',
      badgeClass: 'border-rose-500/40 bg-rose-500/10 text-rose-400',
      bgClass: 'bg-rose-500/10',
      textClass: 'text-rose-400',
      dotClass: 'bg-rose-500 animate-pulse',
      description: 'Gateway disconnected from server (>120s or online=0)',
    };
  }
  if (online === 2) {
    return {
      label: 'PARTIAL / INVALID',
      badgeClass: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
      bgClass: 'bg-amber-500/10',
      textClass: 'text-amber-400',
      dotClass: 'bg-amber-500',
      description: 'Connection intact, but some parameters returned invalid sentinel',
    };
  }
  if (online === 3) {
    return {
      label: 'WAITING DATA',
      badgeClass: 'border-sky-500/40 bg-sky-500/10 text-sky-400',
      bgClass: 'bg-sky-500/10',
      textClass: 'text-sky-400',
      dotClass: 'bg-sky-500 animate-ping',
      description: 'Connection intact, latest data not yet arrived from meter',
    };
  }
  return {
    label: 'ONLINE / VALID',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    dotClass: 'bg-emerald-400',
    description: 'Server & Gateway communication healthy (last_update < 120s)',
  };
}

export function formatSecondsAgo(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s ago`;
}

export function getPfStatus(pf: number): {
  status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
  color: string;
  label: string;
} {
  if (pf === 9999) {
    return { status: 'CRITICAL', color: 'text-rose-400', label: 'Sensor Fault' };
  }
  if (pf >= 0.95) {
    return { status: 'EXCELLENT', color: 'text-emerald-400', label: 'Optimal (>0.95)' };
  }
  if (pf >= 0.85) {
    return { status: 'GOOD', color: 'text-amber-400', label: 'Acceptable (0.85-0.95)' };
  }
  return { status: 'CRITICAL', color: 'text-rose-400', label: 'Penalty Risk (<0.85)' };
}

export function getThdStatus(thd: number): {
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  color: string;
  label: string;
} {
  if (thd === 9999) {
    return { status: 'CRITICAL', color: 'text-rose-400', label: 'Corrupted' };
  }
  if (thd <= 3.0) {
    return { status: 'NORMAL', color: 'text-emerald-400', label: 'IEEE-519 Compliant' };
  }
  if (thd <= 5.0) {
    return { status: 'WARNING', color: 'text-amber-400', label: 'Near Limit (3-5%)' };
  }
  return { status: 'CRITICAL', color: 'text-rose-400', label: 'Exceeds 5% Limit' };
}
