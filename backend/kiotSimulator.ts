import {
  KiotDiscoveredMeter,
  KiotMeterReading,
  Incident,
  HistoricalDataPoint,
  FaultType,
  AnomalyCategory,
  IncidentSeverity,
  IncidentAssigneeRole,
  PlantEnergySummary,
} from '../src/types';
import { loadIncidents, saveIncidents, isKVAvailable } from './kvStore';

export const METERS: KiotDiscoveredMeter[] = [
  {
    device_id: 'e46347828fce',
    device_name: 'MAIN_PANEL_001',
    location: 'Substation-A Main 415V Incomer',
    feeder_type: 'MAIN_INCOMER',
    rated_capacity_kva: 100,
  },
  {
    device_id: 'e46347828fcf',
    device_name: 'HVAC_CHILLER_PLANT',
    location: 'Utility Yard - Chiller #2 & Cooling Towers',
    feeder_type: 'HVAC_CHILLER',
    rated_capacity_kva: 45,
  },
  {
    device_id: 'e46347828fd0',
    device_name: 'COMPRESSOR_HOUSE_B',
    location: 'Utility Block - Atlas Copco Screw Comp 150HP',
    feeder_type: 'COMPRESSOR',
    rated_capacity_kva: 35,
  },
  {
    device_id: 'e46347828fd1',
    device_name: 'PRODUCTION_LINE_01',
    location: 'Assembly Hall - Robotics & VFD Conveyor Banks',
    feeder_type: 'PRODUCTION_LINE',
    rated_capacity_kva: 50,
  },
  {
    device_id: 'e46347828fd2',
    device_name: 'SOLAR_SUBSTATION_04',
    location: 'Roof Grid-Tie Solar PV 40kW Inverter Array',
    feeder_type: 'SOLAR_PV',
    rated_capacity_kva: 40,
  },
  {
    device_id: 'e46347828fd3',
    device_name: 'ARC_FURNACE_ZONE_C',
    location: 'Foundry Bay - 750kW Induction Melting Furnace',
    feeder_type: 'FURNACE',
    rated_capacity_kva: 80,
  },
];

class KiotSimulatorEngine {
  private latestReadings: Map<string, KiotMeterReading> = new Map();
  private historicalData: Map<string, HistoricalDataPoint[]> = new Map();
  private activeFaults: Map<string, FaultType> = new Map();
  private incidents: Incident[] = [];
  private baseKwh: Map<string, number> = new Map();
  private autoFaultsEnabled: boolean = true;
  private tickCount: number = 0;
  private intervalTimer: NodeJS.Timeout | null = null;
  private incidentCooldowns: Map<string, number> = new Map(); // key: deviceId:category -> last incident created timestamp

  constructor() {
    this.initializeMeters();
    this.seedHistoricalData();
    this.startSimulationLoop();
  }

  private initializeMeters() {
    const baseEnergy = [15482.65, 8421.30, 6120.45, 12930.80, 4810.15, 24100.90];
    METERS.forEach((meter, idx) => {
      this.baseKwh.set(meter.device_id, baseEnergy[idx] || 10000);
      this.latestReadings.set(meter.device_id, this.generateReadingForMeter(meter.device_id, new Date()));
    });
  }

  private seedHistoricalData() {
    const now = Date.now();
    const totalPoints = 120; // 120 points spaced by 12 minutes = 24 hours
    const intervalMs = 12 * 60 * 1000;

    METERS.forEach((meter) => {
      const history: HistoricalDataPoint[] = [];
      let runningKwh = (this.baseKwh.get(meter.device_id) || 10000) - 240;

      for (let i = totalPoints; i >= 0; i--) {
        const pointTime = new Date(now - i * intervalMs);
        const hour = pointTime.getHours();
        
        // Diurnal industrial load curve (peak 9:00 - 18:00)
        const isPeak = hour >= 9 && hour <= 18;
        const loadFactor = isPeak ? 0.75 + Math.sin((hour - 9) / 9 * Math.PI) * 0.2 : 0.35 + Math.random() * 0.15;
        
        const ratedKva = meter.rated_capacity_kva;
        const kva = +(ratedKva * loadFactor + (Math.random() * 2 - 1)).toFixed(2);
        
        // Some historical anomalies injected on certain meters for rich historian view
        let pf = +(0.92 + (Math.random() * 0.05 - 0.02)).toFixed(3);
        let thd_v = +(1.8 + Math.random() * 0.8).toFixed(1);
        let thd_i = +(3.8 + Math.random() * 1.2).toFixed(1);
        let isFault = false;
        let faultReason: string | undefined = undefined;

        // Simulate a historical low PF incident on PRODUCTION_LINE_01 around 8 hours ago
        if (meter.device_id === 'e46347828fd1' && i >= 35 && i <= 45) {
          pf = +(0.76 + Math.random() * 0.04).toFixed(3);
          thd_i = +(11.5 + Math.random() * 2.5).toFixed(1);
          isFault = true;
          faultReason = 'Poor Power Factor (0.76) & High VFD Harmonics';
        }

        // Simulate a THD voltage spike on MAIN_PANEL_001 around 16 hours ago
        if (meter.device_id === 'e46347828fce' && i >= 75 && i <= 80) {
          thd_v = +(6.4 + Math.random() * 1.2).toFixed(1);
          isFault = true;
          faultReason = 'Voltage Harmonic Distortion THD_V (6.8%) Exceeded 5% Grid Limit';
        }

        const kw = +(kva * pf).toFixed(2);
        const kvar = +Math.sqrt(Math.max(0, kva * kva - kw * kw)).toFixed(2);
        runningKwh += +(kw * (intervalMs / 3600000)).toFixed(2);

        const v_rn = +(239.5 + (Math.random() * 2 - 1)).toFixed(1);
        const i_avg = +((kva * 1000) / (Math.sqrt(3) * 415)).toFixed(1);

        history.push({
          timestamp: pointTime.toISOString(),
          kW: kw,
          kVA: kva,
          kVAR: kvar,
          PF: pf,
          Freq: +(50.0 + (Math.random() * 0.08 - 0.04)).toFixed(2),
          kWh: +runningKwh.toFixed(2),
          THD_V_Avg: thd_v,
          THD_I_Avg: thd_i,
          THD_V_R: thd_v,
          THD_V_Y: +(thd_v + 0.2).toFixed(1),
          THD_V_B: +(thd_v - 0.1).toFixed(1),
          THD_I_R: thd_i,
          THD_I_Y: +(thd_i + 0.3).toFixed(1),
          THD_I_B: +(thd_i - 0.2).toFixed(1),
          V_Avg: v_rn,
          I_Avg: i_avg,
          I_N: +(i_avg * 0.06).toFixed(1),
          online: 1,
          isFault,
          faultReason,
        });
      }

      this.historicalData.set(meter.device_id, history);
      this.baseKwh.set(meter.device_id, runningKwh);
    });

    // Seed initial active incidents based on initial state
    this.seedInitialIncidents();
  }

  private seedInitialIncidents() {
    const mainMeter = METERS[0];
    const prodMeter = METERS[3];
    const hvacMeter = METERS[1];

    const initialIncident1: Incident = {
      id: `INC-2026-0801`,
      title: `Harmonic Current Distortion (THD_I = 14.8%) on Production VFD Feeder`,
      description: `Non-linear harmonic current distortion exceeded statutory 5% IEEE-519 limits on ${prodMeter.device_name}. Phase R THD_I reaching 14.8%.`,
      category: 'POWER_QUALITY',
      severity: 'HIGH',
      status: 'IN_PROGRESS',
      deviceId: prodMeter.device_id,
      deviceName: prodMeter.device_name,
      timestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
      assignedTo: 'Senior Electrical Engineer',
      slaMinutesTotal: 60,
      slaDeadline: new Date(Date.now() + 18 * 60 * 1000).toISOString(),
      isSlaBreached: false,
      telemetrySnapshot: this.generateReadingForMeter(prodMeter.device_id, new Date(Date.now() - 42 * 60 * 1000), 'high_thd_current'),
      aiDiagnosis: {
        rootCause: 'Heavy 6-pulse variable frequency drives (VFDs) operating without tuned passive or active harmonic filters on Line 1 conveyor drive train.',
        impactAnalysis: 'Excessive eddy current heating in upstream step-down transformer (estimated 6.2% additional thermal losses) and potential neutral line resonance.',
        actionSteps: [
          'Switch on the 5th & 7th harmonic active filter at Sub-Distribution Panel 3.',
          'Verify DC choke inductors on VFD 4 & 5.',
          'Perform thermal camera scan of neutral busbar connectors.',
        ],
        equipmentRisk: 'MODERATE',
        estimatedCostPenaltyPerHour: '$18.50 / hr (Transformer Overheating & Efficiency Loss)',
        recommendedHardwareSetting: 'Enable Active Harmonic Filter (AHF-01) Step 2 Mode',
        generatedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      },
      activityLog: [
        {
          id: 'ACT-1',
          timestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
          author: 'AI Telemetry Engine',
          action: 'Incident automatically created and assigned to Senior Electrical Engineer (THD > 5%).',
        },
        {
          id: 'ACT-2',
          timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          author: 'R. Sharma (Senior Electrical Engineer)',
          action: 'Acknowledged ticket. Checked VFD bank 3 harmonic trap status.',
          note: 'Operator confirmed batch start with full robot arm cycle.',
        },
      ],
    };

    const initialIncident2: Incident = {
      id: `INC-2026-0802`,
      title: `Low Power Factor (PF = 0.77) on HVAC Chiller Plant Substation`,
      description: `Power factor dropped below the 0.85 utility penalty threshold on ${hvacMeter.device_name} (Current PF: 0.778 lagging).`,
      category: 'POWER_QUALITY',
      severity: 'HIGH',
      status: 'NEW',
      deviceId: hvacMeter.device_id,
      deviceName: hvacMeter.device_name,
      timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
      assignedTo: 'Senior Electrical Engineer',
      slaMinutesTotal: 60,
      slaDeadline: new Date(Date.now() + 46 * 60 * 1000).toISOString(),
      isSlaBreached: false,
      telemetrySnapshot: this.generateReadingForMeter(hvacMeter.device_id, new Date(Date.now() - 14 * 60 * 1000), 'low_pf'),
      aiDiagnosis: {
        rootCause: 'Inductive reactive power surge caused by uncompensated secondary chiller compressor startup while Automatic Power Factor Controller (APFC) bank #3 was offline.',
        impactAnalysis: 'Discom low power factor surcharge penalty of 2.5% applied on monthly tariff if average PF remains < 0.85, resulting in ~$420/day excess expenditure.',
        actionSteps: [
          'Trigger manual switch-in for APFC Capacitor Bank 2 (25 kVAR).',
          'Inspect APFC automatic switching contactor relay 3.',
          'Verify chiller motor soft-starter power factor compensation capacitors.',
        ],
        equipmentRisk: 'LOW',
        estimatedCostPenaltyPerHour: '$14.20 / hr (Surcharge Tariff Risk)',
        recommendedHardwareSetting: 'Step APFC Bank to +50 kVAR Compensation',
        generatedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      },
      activityLog: [
        {
          id: 'ACT-10',
          timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
          author: 'AI Telemetry Engine',
          action: 'Incident automatically created due to PF 0.77 < 0.85 threshold.',
        },
      ],
    };

    this.incidents.push(initialIncident1, initialIncident2);
    // Persist initial seed to KV if available
    saveIncidents(this.incidents);
  }

  public generateReadingForMeter(
    deviceId: string,
    now: Date = new Date(),
    overrideFault?: FaultType
  ): KiotMeterReading {
    const meter = METERS.find((m) => m.device_id === deviceId) || METERS[0];
    const activeFault = overrideFault || this.activeFaults.get(deviceId);
    const hour = now.getHours();
    const isPeak = hour >= 9 && hour <= 18;

    let currentKwh = this.baseKwh.get(deviceId) || 15000;
    // Increment cumulative energy
    const deltaKwh = +(0.015 + Math.random() * 0.02).toFixed(4);
    currentKwh += deltaKwh;
    this.baseKwh.set(deviceId, currentKwh);

    // Baseline electrical values
    let v_rn = 239.5 + (Math.random() * 1.8 - 0.9);
    let v_yn = 240.2 + (Math.random() * 1.6 - 0.8);
    let v_bn = 238.8 + (Math.random() * 1.7 - 0.85);

    let loadRatio = isPeak ? 0.65 + Math.random() * 0.25 : 0.35 + Math.random() * 0.15;
    if (meter.feeder_type === 'SOLAR_PV') {
      // Solar peaks during mid-day
      loadRatio = (hour >= 7 && hour <= 17) ? Math.sin((hour - 7) / 10 * Math.PI) * 0.9 : 0.02;
    }

    const ratedKva = meter.rated_capacity_kva;
    let kva = ratedKva * loadRatio;
    let pf = 0.925 + (Math.random() * 0.04 - 0.02);

    let thd_v_r = 2.1 + (Math.random() * 0.5 - 0.25);
    let thd_v_y = 2.4 + (Math.random() * 0.4 - 0.2);
    let thd_v_b = 2.0 + (Math.random() * 0.4 - 0.2);

    let thd_i_r = 4.8 + (Math.random() * 0.8 - 0.4);
    let thd_i_y = 5.1 + (Math.random() * 0.7 - 0.35);
    let thd_i_b = 4.5 + (Math.random() * 0.8 - 0.4);

    let onlineStatus: 0 | 1 | 2 | 3 = 1;
    let lastUpdateSeconds = Math.floor(Math.random() * 15) + 2;

    // Apply Specific Fault Overrides
    if (activeFault === 'low_pf') {
      pf = 0.74 + (Math.random() * 0.06);
      kva = kva * 1.25; // kVA surges when PF drops for same active load
    } else if (activeFault === 'high_thd_current') {
      thd_i_r = 16.4 + Math.random() * 4.0;
      thd_i_y = 15.2 + Math.random() * 3.5;
      thd_i_b = 14.8 + Math.random() * 3.2;
    } else if (activeFault === 'high_thd_voltage') {
      thd_v_r = 7.8 + Math.random() * 2.2;
      thd_v_y = 8.1 + Math.random() * 1.8;
      thd_v_b = 7.2 + Math.random() * 1.9;
    } else if (activeFault === 'gateway_offline') {
      onlineStatus = 0;
      lastUpdateSeconds = 185 + Math.floor(Math.random() * 45);
    } else if (activeFault === 'sensor_sentinel_fault') {
      onlineStatus = 2; // Partial/Invalid Params
      return {
        device_id: meter.device_id,
        device_name: meter.device_name,
        timestamp: now.toISOString(),
        status: {
          online: 2,
          last_update_seconds: 14,
        },
        electrical: {
          V_RN: 9999,
          V_YN: 9999,
          V_BN: 9999,
          V_RY: 9999,
          V_YB: 9999,
          V_BR: 9999,
          I_R: 9999,
          I_Y: 9999,
          I_B: 9999,
          I_N: 9999,
          kW: 999999,
          kVA: 999999,
          kVAR: 999999,
          PF: 9999,
          Freq: 9999,
          kWh: 999999,
          THD_V_R: 9999,
          THD_V_Y: 9999,
          THD_V_B: 9999,
          THD_I_R: 9999,
          THD_I_Y: 9999,
          THD_I_B: 9999,
        },
      };
    } else if (activeFault === 'undervoltage_sag') {
      v_rn = 184.2 + Math.random() * 4;
      v_yn = 182.5 + Math.random() * 3;
      v_bn = 185.1 + Math.random() * 4;
    } else if (activeFault === 'overvoltage_spike') {
      v_rn = 272.4 + Math.random() * 5;
      v_yn = 274.1 + Math.random() * 4;
      v_bn = 271.8 + Math.random() * 5;
    }

    // Line voltages calculated from phase voltages (approx sqrt(3) * V_phase)
    const v_ry = +(Math.sqrt(v_rn * v_rn + v_yn * v_yn - 2 * v_rn * v_yn * Math.cos((120 * Math.PI) / 180))).toFixed(1);
    const v_yb = +(Math.sqrt(v_yn * v_yn + v_bn * v_bn - 2 * v_yn * v_bn * Math.cos((120 * Math.PI) / 180))).toFixed(1);
    const v_br = +(Math.sqrt(v_bn * v_bn + v_rn * v_rn - 2 * v_bn * v_rn * Math.cos((120 * Math.PI) / 180))).toFixed(1);

    // Calculate currents
    const avgV = (v_rn + v_yn + v_bn) / 3;
    let baseI = (kva * 1000) / (3 * avgV);

    let i_r = +(baseI * (1 + (Math.random() * 0.06 - 0.03))).toFixed(1);
    let i_y = +(baseI * (1 + (Math.random() * 0.06 - 0.03))).toFixed(1);
    let i_b = +(baseI * (1 + (Math.random() * 0.06 - 0.03))).toFixed(1);
    let i_n = +(Math.abs(i_r - i_y) * 0.3 + 1.1).toFixed(1);

    if (activeFault === 'phase_imbalance') {
      i_r = +(baseI * 1.65).toFixed(1);
      i_y = +(baseI * 0.65).toFixed(1);
      i_b = +(baseI * 0.85).toFixed(1);
      i_n = +(baseI * 0.82).toFixed(1); // High neutral return current due to severe imbalance
    }

    const kw = +(kva * pf).toFixed(2);
    const kvar = +Math.sqrt(Math.max(0, kva * kva - kw * kw)).toFixed(2);
    const freq = +(50.02 + (Math.random() * 0.06 - 0.03)).toFixed(2);

    return {
      device_id: meter.device_id,
      device_name: meter.device_name,
      timestamp: now.toISOString(),
      status: {
        online: onlineStatus,
        last_update_seconds: lastUpdateSeconds,
      },
      electrical: {
        V_RN: +v_rn.toFixed(1),
        V_YN: +v_yn.toFixed(1),
        V_BN: +v_bn.toFixed(1),
        V_RY: v_ry,
        V_YB: v_yb,
        V_BR: v_br,
        I_R: Math.max(0, i_r),
        I_Y: Math.max(0, i_y),
        I_B: Math.max(0, i_b),
        I_N: Math.max(0, i_n),
        kW: Math.max(0, kw),
        kVA: +kva.toFixed(2),
        kVAR: Math.max(0, kvar),
        PF: +pf.toFixed(3),
        Freq: freq,
        kWh: +currentKwh.toFixed(2),
        THD_V_R: +thd_v_r.toFixed(1),
        THD_V_Y: +thd_v_y.toFixed(1),
        THD_V_B: +thd_v_b.toFixed(1),
        THD_I_R: +thd_i_r.toFixed(1),
        THD_I_Y: +thd_i_y.toFixed(1),
        THD_I_B: +thd_i_b.toFixed(1),
      },
    };
  }

  private startSimulationLoop() {
    // Tick every 5 seconds
    this.intervalTimer = setInterval(() => {
      this.tick();
    }, 5000);
  }

  private tick() {
    this.tickCount++;
    const now = new Date();
    const isVercel = !!(typeof process !== 'undefined' && process.env && process.env['VERCEL']);

    // Auto fault random injection every ~30 ticks (150 seconds) if enabled
    if (!isVercel && this.autoFaultsEnabled && this.tickCount % 24 === 0) {
      this.randomlyInjectOrClearFault();
    }

    METERS.forEach((meter) => {
      const reading = this.generateReadingForMeter(meter.device_id, now);
      this.latestReadings.set(meter.device_id, reading);

      // Record to time-series history
      const history = this.historicalData.get(meter.device_id) || [];
      const isSentinel = reading.electrical.PF === 9999;
      
      const v_avg = isSentinel ? 0 : (reading.electrical.V_RN + reading.electrical.V_YN + reading.electrical.V_BN) / 3;
      const i_avg = isSentinel ? 0 : (reading.electrical.I_R + reading.electrical.I_Y + reading.electrical.I_B) / 3;
      const thd_v_avg = isSentinel ? 0 : (reading.electrical.THD_V_R + reading.electrical.THD_V_Y + reading.electrical.THD_V_B) / 3;
      const thd_i_avg = isSentinel ? 0 : (reading.electrical.THD_I_R + reading.electrical.THD_I_Y + reading.electrical.THD_I_B) / 3;

      let isFault = false;
      let faultReason: string | undefined = undefined;

      if (reading.status.online === 0 || reading.status.last_update_seconds > 120) {
        isFault = true;
        faultReason = 'Gateway Communication Offline';
      } else if (isSentinel) {
        isFault = true;
        faultReason = 'Sensor Corrupted Telemetry (Sentinel 9999)';
      } else if (reading.electrical.PF < 0.85) {
        isFault = true;
        faultReason = `Low Power Factor (${reading.electrical.PF}) < 0.85`;
      } else if (thd_v_avg > 5.0 || thd_i_avg > 5.0) {
        isFault = true;
        faultReason = `Harmonics Exceeded 5% Threshold (V:${thd_v_avg.toFixed(1)}%, I:${thd_i_avg.toFixed(1)}%)`;
      }

      history.push({
        timestamp: reading.timestamp,
        kW: isSentinel ? 0 : reading.electrical.kW,
        kVA: isSentinel ? 0 : reading.electrical.kVA,
        kVAR: isSentinel ? 0 : reading.electrical.kVAR,
        PF: isSentinel ? 0 : reading.electrical.PF,
        Freq: isSentinel ? 0 : reading.electrical.Freq,
        kWh: isSentinel ? 0 : reading.electrical.kWh,
        THD_V_Avg: +thd_v_avg.toFixed(1),
        THD_I_Avg: +thd_i_avg.toFixed(1),
        THD_V_R: reading.electrical.THD_V_R,
        THD_V_Y: reading.electrical.THD_V_Y,
        THD_V_B: reading.electrical.THD_V_B,
        THD_I_R: reading.electrical.THD_I_R,
        THD_I_Y: reading.electrical.THD_I_Y,
        THD_I_B: reading.electrical.THD_I_B,
        V_Avg: +v_avg.toFixed(1),
        I_Avg: +i_avg.toFixed(1),
        I_N: reading.electrical.I_N,
        online: reading.status.online,
        isFault,
        faultReason,
      });

      // Keep maximum 500 realtime points in memory buffer per meter
      if (history.length > 500) {
        history.shift();
      }
      this.historicalData.set(meter.device_id, history);

      // Evaluate anomaly engine for auto-incident ticketing
      // Now safe on Vercel since incidents persist via Redis — dedup check loads from KV
      this.evaluateAnomalyRule(reading);
    });
  }

  private randomlyInjectOrClearFault() {
    const faultKeys: FaultType[] = ['low_pf', 'high_thd_current', 'high_thd_voltage', 'phase_imbalance', 'gateway_offline', 'sensor_sentinel_fault'];
    const randomMeter = METERS[Math.floor(Math.random() * METERS.length)];
    
    if (this.activeFaults.size > 0 && Math.random() > 0.4) {
      // Clear a random fault
      const keys = Array.from(this.activeFaults.keys());
      const clearKey = keys[Math.floor(Math.random() * keys.length)];
      this.activeFaults.delete(clearKey);
    } else {
      // Inject random fault
      const randomFault = faultKeys[Math.floor(Math.random() * faultKeys.length)];
      this.activeFaults.set(randomMeter.device_id, randomFault);
    }
  }

  private evaluateAnomalyRule(reading: KiotMeterReading) {
    const { device_id, device_name, status, electrical } = reading;
    const isSentinel = electrical.PF === 9999 || electrical.kW === 999999;

    let alertTriggered: {
      category: AnomalyCategory;
      severity: IncidentSeverity;
      title: string;
      description: string;
      assignee: IncidentAssigneeRole;
      slaMinutes: number;
      aiRootCause: string;
      aiImpact: string;
      aiSteps: string[];
      costPenalty?: string;
    } | null = null;

    // 1. Gateway Offline or Dropout (> 120s)
    if (status.online === 0 || status.last_update_seconds > 120) {
      alertTriggered = {
        category: 'GATEWAY_OFFLINE',
        severity: 'CRITICAL',
        title: `Gateway Offline / Communication Dropout on ${device_name}`,
        description: `KIOT gateway failed to respond for ${status.last_update_seconds}s (online status: ${status.online}). Loss of real-time telemetry stream.`,
        assignee: 'IoT Field Technician',
        slaMinutes: 30,
        aiRootCause: 'Modbus RS-485 serial communication dropout or Ethernet gateway DHCP network timeout.',
        aiImpact: 'Inability to track peak demand or detect transient electrical overloads; risking unmonitored power quality degradation.',
        aiSteps: [
          'Inspect physical RS-485 twisted pair wiring between meter and gateway.',
          'Verify 24V DC auxiliary power supply to KIOT IoT gateway module.',
          'Ping gateway IP address on Plant Substation VLAN.',
        ],
        costPenalty: '$0 direct (Operational Blindspot Risk)',
      };
    }
    // 2. Sensor Corruption / Invalid Sentinel Flag 9999 / 999999
    else if (isSentinel || status.online === 2) {
      alertTriggered = {
        category: 'SENSOR_CORRUPTION',
        severity: 'HIGH',
        title: `Corrupted Modbus Telemetry (Sentinel 9999/999999) on ${device_name}`,
        description: `Meter registers returned error sentinel 9999/999999 across parameters. Possible CT/PT disconnection or register overflow.`,
        assignee: 'IoT Field Technician',
        slaMinutes: 45,
        aiRootCause: 'Potential Modbus register address mismatch or disconnected Current Transformer (CT) secondary wiring.',
        aiImpact: 'Corrupt energy billing records and failure to accumulate valid plant kilowatt-hour metrics.',
        aiSteps: [
          'Test CT secondary terminal block shorting links.',
          'Verify parity and baud rate setting (typically 9600 8-N-1) on energy meter.',
          'Reboot meter communication interface card.',
        ],
        costPenalty: 'Billing Data Invalidation Risk',
      };
    }
    // 3. Current Harmonics THD > 5%
    else if (electrical.THD_I_R > 5.0 || electrical.THD_I_Y > 5.0 || electrical.THD_I_B > 5.0) {
      const maxThd = Math.max(electrical.THD_I_R, electrical.THD_I_Y, electrical.THD_I_B);
      alertTriggered = {
        category: 'POWER_QUALITY',
        severity: maxThd > 12.0 ? 'CRITICAL' : 'HIGH',
        title: `High Current THD (${maxThd.toFixed(1)}% > 5%) Detected on ${device_name}`,
        description: `Current total harmonic distortion breached IEEE-519 5% recommended threshold on ${device_name}.`,
        assignee: 'Senior Electrical Engineer',
        slaMinutes: maxThd > 12.0 ? 30 : 60,
        aiRootCause: 'Heavy non-linear semiconductor switching loads (VFDs, Rectifiers, Arc Furnaces) injecting 5th & 7th harmonic orders into the bus.',
        aiImpact: 'High neutral conductor overheating, premature insulation degradation in distribution transformers, and nuisance relay tripping.',
        aiSteps: [
          'Engage Active Harmonic Filter (AHF) unit on Feeder Bus.',
          'Inspect tuned L-C harmonic filter capacitor banks for blown fuses.',
          'Stagger start times of large variable speed drive motors.',
        ],
        costPenalty: `$22.00 / hr (Transformer Degradation & K-Factor Derating)`,
      };
    }
    // 4. Voltage Harmonics THD > 5%
    else if (electrical.THD_V_R > 5.0 || electrical.THD_V_Y > 5.0 || electrical.THD_V_B > 5.0) {
      const maxVThd = Math.max(electrical.THD_V_R, electrical.THD_V_Y, electrical.THD_V_B);
      alertTriggered = {
        category: 'POWER_QUALITY',
        severity: 'HIGH',
        title: `Voltage Harmonic Distortion THD_V (${maxVThd.toFixed(1)}%) on ${device_name}`,
        description: `Bus voltage waveform distortion exceeding 5% grid limit, risking sensitive CNC and PLC hardware malfunction.`,
        assignee: 'Senior Electrical Engineer',
        slaMinutes: 60,
        aiRootCause: 'System resonance between power factor correction capacitors and distribution line inductance at harmonic frequencies.',
        aiImpact: 'Risk of voltage notch damage to digital control power supplies and PLCs.',
        aiSteps: [
          'Verify detuning reactors on all online capacitor banks (minimum 7% detuned).',
          'Measure harmonic spectrum (3rd, 5th, 7th orders) at main incomer.',
        ],
        costPenalty: '$15.00 / hr (Control Equipment Failure Risk)',
      };
    }
    // 5. Low Power Factor < 0.85
    else if (electrical.PF < 0.85) {
      alertTriggered = {
        category: 'POWER_QUALITY',
        severity: 'HIGH',
        title: `Low Power Factor Penalty Alert (PF = ${electrical.PF}) on ${device_name}`,
        description: `Operating Power Factor of ${electrical.PF} is below the 0.85 utility penalty threshold, causing high reactive power draw (${electrical.kVAR} kVAR).`,
        assignee: 'Senior Electrical Engineer',
        slaMinutes: 60,
        aiRootCause: 'High inductive load from uncompensated induction motors operating under partial load without adequate capacitor bank stages.',
        aiImpact: 'Discom utility penalty surcharge applied to monthly electricity bill plus increased $I^2R$ copper losses in internal distribution cables.',
        aiSteps: [
          'Energize APFC Capacitor Bank Stage 2 (+25 kVAR) or Stage 3 (+50 kVAR).',
          'Inspect APFC automatic controller current sensor sensitivity setting.',
          'Check contactors for welded contacts or open fuses.',
        ],
        costPenalty: `$16.80 / hr (Tariff Surcharge & Transmission Loss)`,
      };
    }

    if (alertTriggered) {
      // Check if an open incident already exists for this device and category
      const existing = this.incidents.find(
        (inc) =>
          inc.deviceId === device_id &&
          inc.category === alertTriggered!.category &&
          inc.status !== 'RESOLVED'
      );

      // Cooldown: don't create new incidents for same device+category within 5 minutes
      const cooldownKey = `${device_id}:${alertTriggered.category}`;
      const lastCreated = this.incidentCooldowns.get(cooldownKey) ?? 0;
      const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
      const inCooldown = Date.now() - lastCreated < COOLDOWN_MS;

      if (!existing && !inCooldown) {
        const incId = `INC-2026-${String(this.incidents.length + 801).padStart(4, '0')}`;
        const newIncident: Incident = {
          id: incId,
          title: alertTriggered.title,
          description: alertTriggered.description,
          category: alertTriggered.category,
          severity: alertTriggered.severity,
          status: 'NEW',
          deviceId: device_id,
          deviceName: device_name,
          timestamp: reading.timestamp,
          assignedTo: alertTriggered.assignee,
          slaMinutesTotal: alertTriggered.slaMinutes,
          slaDeadline: new Date(Date.now() + alertTriggered.slaMinutes * 60 * 1000).toISOString(),
          isSlaBreached: false,
          telemetrySnapshot: reading,
          aiDiagnosis: {
            rootCause: alertTriggered.aiRootCause,
            impactAnalysis: alertTriggered.aiImpact,
            actionSteps: alertTriggered.aiSteps,
            equipmentRisk: alertTriggered.severity === 'CRITICAL' ? 'CRITICAL' : 'MODERATE',
            estimatedCostPenaltyPerHour: alertTriggered.costPenalty,
            generatedAt: new Date().toISOString(),
          },
          activityLog: [
            {
              id: `ACT-${Date.now()}`,
              timestamp: new Date().toISOString(),
              author: 'AI Telemetry Engine',
              action: `Alert triggered: ${alertTriggered.title}. Auto-assigned to ${alertTriggered.assignee}.`,
            },
          ],
        };

        this.incidents.unshift(newIncident);
        this.incidentCooldowns.set(cooldownKey, Date.now());
        // Persist to KV so other instances see new incidents
        saveIncidents(this.incidents);
        // Keep incidents list bounded
        if (this.incidents.length > 100) {
          this.incidents.pop();
        }
      }
    }
  }

  // Helper to resolve device_id or device_name to canonical device_id
  public resolveCanonicalMeter(deviceIdOrName: string): KiotDiscoveredMeter | undefined {
    if (!deviceIdOrName) return undefined;
    return METERS.find(
      (m) => m.device_id.toLowerCase() === deviceIdOrName.toLowerCase() ||
             m.device_name.toLowerCase() === deviceIdOrName.toLowerCase()
    );
  }

  // API Methods
  public getDiscoveredMeters(): KiotDiscoveredMeter[] {
    return METERS;
  }

  public getLatestReading(deviceId: string): KiotMeterReading | null {
    const meter = this.resolveCanonicalMeter(deviceId);
    if (!meter) return null;
    return this.latestReadings.get(meter.device_id) || null;
  }

  public getAllLatestReadings(): KiotMeterReading[] {
    // Strictly map through discovered METERS to ensure 1:1 unique reading per meter
    return METERS.map((m) => {
      let reading = this.latestReadings.get(m.device_id);
      if (!reading) {
        reading = this.generateReadingForMeter(m.device_id, new Date());
        this.latestReadings.set(m.device_id, reading);
      }
      return reading;
    });
  }

  public getHistory(deviceId: string, range: string = '24h'): HistoricalDataPoint[] {
    const meter = this.resolveCanonicalMeter(deviceId);
    if (!meter) return [];
    const history = this.historicalData.get(meter.device_id) || [];
    if (range === '1h') {
      return history.slice(-12);
    } else if (range === '6h') {
      return history.slice(-30);
    } else if (range === '12h') {
      return history.slice(-60);
    }
    return history;
  }

  public async getIncidents(): Promise<Incident[]> {
    // On Vercel, each cold start recreates this engine with fresh seeds.
    // Load from KV to get the real (user-modified) state.
    if (isKVAvailable()) {
      const stored = await loadIncidents();
      if (stored && stored.length > 0) {
        this.incidents = stored;
      }
    }

    // Update SLA breaches dynamically
    const now = Date.now();
    const sevWeight: Record<string, number> = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
    return this.incidents
      .map((inc) => {
        const deadline = new Date(inc.slaDeadline).getTime();
        const isBreached = inc.status !== 'RESOLVED' && now > deadline;
        return {
          ...inc,
          isSlaBreached: isBreached,
        };
      })
      .sort((a, b) => {
        // Active incidents first (by status order), then resolved at bottom
        const statusOrder: Record<string, number> = { NEW: 0, IN_PROGRESS: 1, PENDING_VERIFICATION: 2, RESOLVED: 3 };
        const statusDiff = (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0);
        if (statusDiff !== 0) return statusDiff;
        // Within same status: severity descending
        const sevDiff = (sevWeight[b.severity] ?? 0) - (sevWeight[a.severity] ?? 0);
        if (sevDiff !== 0) return sevDiff;
        // Then SLA deadline ascending (most urgent first)
        const aDeadline = new Date(a.slaDeadline).getTime();
        const bDeadline = new Date(b.slaDeadline).getTime();
        if (aDeadline !== bDeadline) return aDeadline - bDeadline;
        // Finally timestamp descending (newest first)
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }

  public async updateIncidentStatus(
    incidentId: string,
    status: Incident['status'],
    author: string = 'Control Room Operator',
    note?: string
  ): Promise<Incident | null> {
    // Load latest from KV first (another instance may have updated)
    if (isKVAvailable()) {
      const stored = await loadIncidents();
      if (stored && stored.length > 0) {
        this.incidents = stored;
      }
    }

    const incident = this.incidents.find((i) => i.id === incidentId);
    if (!incident) return null;

    incident.status = status;
    if (status === 'RESOLVED') {
      incident.resolvedAt = new Date().toISOString();
    }

    incident.activityLog.push({
      id: `ACT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      author,
      action: `Status updated to ${status.replace('_', ' ')}`,
      note,
    });

    await saveIncidents(this.incidents);
    return incident;
  }

  public async updateIncidentDiagnosis(incidentId: string, diagnosis: Incident['aiDiagnosis']): Promise<Incident | null> {
    // Load latest from KV first
    if (isKVAvailable()) {
      const stored = await loadIncidents();
      if (stored && stored.length > 0) {
        this.incidents = stored;
      }
    }

    const incident = this.incidents.find((i) => i.id === incidentId);
    if (!incident) return null;
    incident.aiDiagnosis = diagnosis;
    await saveIncidents(this.incidents);
    return incident;
  }

  public injectFault(deviceId: string, fault: FaultType): boolean {
    const meter = this.resolveCanonicalMeter(deviceId) || METERS[0];
    const canonicalId = meter.device_id;

    if (fault === ('none' as any)) {
      this.activeFaults.delete(canonicalId);
    } else {
      this.activeFaults.set(canonicalId, fault);
    }
    // Immediately regenerate reading so user sees instant update
    const reading = this.generateReadingForMeter(canonicalId, new Date());
    this.latestReadings.set(canonicalId, reading);
    this.evaluateAnomalyRule(reading);
    return true;
  }

  public clearAllFaults(): void {
    this.activeFaults.clear();
    METERS.forEach((m) => {
      const reading = this.generateReadingForMeter(m.device_id, new Date());
      this.latestReadings.set(m.device_id, reading);
    });
  }

  public setAutoFaults(enabled: boolean): void {
    this.autoFaultsEnabled = enabled;
  }

  public getSimulationState() {
    const currentFaults: Record<string, FaultType> = {};
    this.activeFaults.forEach((v, k) => {
      currentFaults[k] = v;
    });

    return {
      autoFaultsEnabled: this.autoFaultsEnabled,
      tickIntervalSeconds: 5,
      currentFaults,
      totalReadingsGenerated: this.tickCount * METERS.length + 720,
      activeIncidentsCount: this.incidents.filter((i) => i.status !== 'RESOLVED').length,
    };
  }

  public getPlantSummary(): PlantEnergySummary {
    const readings = this.getAllLatestReadings();
    let totalKw = 0;
    let totalKva = 0;
    let totalKvar = 0;
    let validPfs: number[] = [];
    let onlineCount = 0;
    let totalKwh = 0;

    readings.forEach((r) => {
      if (r.status.online === 1) {
        onlineCount++;
      }
      if (r.electrical.kW !== 999999) {
        totalKw += r.electrical.kW;
      }
      if (r.electrical.kVA !== 999999) {
        totalKva += r.electrical.kVA;
      }
      if (r.electrical.kVAR !== 999999) {
        totalKvar += r.electrical.kVAR;
      }
      if (r.electrical.PF !== 9999) {
        validPfs.push(r.electrical.PF);
      }
      if (r.electrical.kWh !== 999999) {
        totalKwh += r.electrical.kWh;
      }
    });

    const avgPf = validPfs.length > 0 ? validPfs.reduce((a, b) => a + b, 0) / validPfs.length : 0.92;
    const activeAlerts = this.incidents.filter((i) => i.status === 'NEW').length;
    const criticalIncidents = this.incidents.filter((i) => i.severity === 'CRITICAL' && i.status !== 'RESOLVED').length;

    return {
      totalActivePowerKw: +totalKw.toFixed(2),
      totalApparentPowerKva: +totalKva.toFixed(2),
      totalReactivePowerKvar: +totalKvar.toFixed(2),
      averagePowerFactor: +avgPf.toFixed(3),
      totalKwhToday: +(totalKw * 8.4).toFixed(1), // daily consumption proxy
      estimatedCostToday: +(totalKw * 8.4 * 0.12).toFixed(2), // @ $0.12 / kWh
      onlineMetersCount: onlineCount,
      totalMetersCount: METERS.length,
      activeAlertsCount: activeAlerts,
      criticalIncidentsCount: criticalIncidents,
    };
  }
}

export const simulatorEngine = new KiotSimulatorEngine();
