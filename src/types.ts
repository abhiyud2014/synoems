/**
 * SIOT Industrial Energy Management System (EMS) TypeScript Definitions
 * Follows the official SIOT Energy Monitoring System API schema.
 */

export interface KiotGatewayStatus {
  online: 0 | 1 | 2 | 3; // 0: Disconnected, 1: Valid (<120s), 2: Partial/Invalid Params, 3: Waiting for data
  last_update_seconds: number;
}

export interface KiotElectricalParameters {
  // Phase Voltages (V)
  V_RN: number;
  V_YN: number;
  V_BN: number;
  // Line Voltages (V)
  V_RY: number;
  V_YB: number;
  V_BR: number;
  // Currents (A)
  I_R: number;
  I_Y: number;
  I_B: number;
  I_N: number;
  // Power (kW, kVA, kVAR)
  kW: number;
  kVA: number;
  kVAR: number;
  // Power Quality & Energy
  PF: number;
  Freq: number;
  kWh: number;
  // Voltage Harmonics THD (%)
  THD_V_R: number;
  THD_V_Y: number;
  THD_V_B: number;
  // Current Harmonics THD (%)
  THD_I_R: number;
  THD_I_Y: number;
  THD_I_B: number;
}

export interface KiotMeterReading {
  device_id: string;
  device_name: string;
  timestamp: string;
  status: KiotGatewayStatus;
  electrical: KiotElectricalParameters;
}

export interface KiotDiscoveredMeter {
  device_id: string;
  device_name: string;
  location: string;
  feeder_type: 'MAIN_INCOMER' | 'HVAC_CHILLER' | 'COMPRESSOR' | 'PRODUCTION_LINE' | 'SOLAR_PV' | 'FURNACE';
  rated_capacity_kva: number;
}

export type AnomalyCategory = 
  | 'POWER_QUALITY'
  | 'GATEWAY_OFFLINE'
  | 'ENERGY_DEMAND'
  | 'SENSOR_CORRUPTION'
  | 'VOLTAGE_ANOMALY'
  | 'PHASE_IMBALANCE';

export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type IncidentStatus = 'NEW' | 'IN_PROGRESS' | 'PENDING_VERIFICATION' | 'RESOLVED';

export type IncidentAssigneeRole = 
  | 'Senior Electrical Engineer'
  | 'IoT Field Technician'
  | 'Plant Energy Manager'
  | 'Substation Operator';

export interface AIDiagnosis {
  rootCause: string;
  impactAnalysis: string;
  actionSteps: string[];
  equipmentRisk: 'CRITICAL' | 'MODERATE' | 'LOW';
  estimatedCostPenaltyPerHour?: string;
  recommendedHardwareSetting?: string;
  generatedAt: string;
}

export interface IncidentActivity {
  id: string;
  timestamp: string;
  author: string;
  action: string;
  note?: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  category: AnomalyCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  deviceId: string;
  deviceName: string;
  timestamp: string;
  assignedTo: IncidentAssigneeRole;
  slaMinutesTotal: number;
  slaDeadline: string;
  isSlaBreached: boolean;
  telemetrySnapshot: KiotMeterReading;
  aiDiagnosis?: AIDiagnosis;
  activityLog: IncidentActivity[];
  resolvedAt?: string;
}

export interface HistoricalDataPoint {
  timestamp: string;
  kW: number;
  kVA: number;
  kVAR: number;
  PF: number;
  Freq: number;
  kWh: number;
  THD_V_Avg: number;
  THD_I_Avg: number;
  THD_V_R: number;
  THD_V_Y: number;
  THD_V_B: number;
  THD_I_R: number;
  THD_I_Y: number;
  THD_I_B: number;
  V_Avg: number;
  I_Avg: number;
  I_N: number;
  online: number;
  isFault: boolean;
  faultReason?: string;
}

export type FaultType = 
  | 'low_pf'
  | 'high_thd_current'
  | 'high_thd_voltage'
  | 'phase_imbalance'
  | 'gateway_offline'
  | 'sensor_sentinel_fault'
  | 'undervoltage_sag'
  | 'overvoltage_spike';

export interface SimulationState {
  autoFaultsEnabled: boolean;
  tickIntervalSeconds: number;
  currentFaults: Record<string, FaultType>;
  totalReadingsGenerated: number;
  activeIncidentsCount: number;
}

export interface PlantEnergySummary {
  totalActivePowerKw: number;
  totalApparentPowerKva: number;
  totalReactivePowerKvar: number;
  averagePowerFactor: number;
  totalKwhToday: number;
  estimatedCostToday: number;
  onlineMetersCount: number;
  totalMetersCount: number;
  activeAlertsCount: number;
  criticalIncidentsCount: number;
}
