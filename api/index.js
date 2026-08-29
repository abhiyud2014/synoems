var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api/backend/geminiService.ts
var geminiService_exports = {};
__export(geminiService_exports, {
  askEnergyCopilot: () => askEnergyCopilot,
  generateIncidentDiagnosis: () => generateIncidentDiagnosis
});
function getGenAI() {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return genAIClient;
}
async function generateIncidentDiagnosis(incidentTitle, incidentCategory, meterReading) {
  const ai = getGenAI();
  if (ai) {
    try {
      const prompt = `You are a Principal Industrial Electrical Engineer & Power Quality Specialist analyzing a telemetry alert from a KIOT Energy Monitoring System.
Alert Title: "${incidentTitle}"
Category: "${incidentCategory}"
Meter Name: "${meterReading.device_name}" (ID: ${meterReading.device_id})
Snapshot Telemetry:
- Status: online=${meterReading.status.online}, last_update=${meterReading.status.last_update_seconds}s
- Voltages: Phase R-N=${meterReading.electrical.V_RN}V, Y-N=${meterReading.electrical.V_YN}V, B-N=${meterReading.electrical.V_BN}V, Line R-Y=${meterReading.electrical.V_RY}V
- Currents: I_R=${meterReading.electrical.I_R}A, I_Y=${meterReading.electrical.I_Y}A, I_B=${meterReading.electrical.I_B}A, I_N=${meterReading.electrical.I_N}A
- Powers: Active=${meterReading.electrical.kW}kW, Apparent=${meterReading.electrical.kVA}kVA, Reactive=${meterReading.electrical.kVAR}kVAR
- Power Factor: ${meterReading.electrical.PF} (Frequency: ${meterReading.electrical.Freq}Hz)
- Harmonics THD_V: R=${meterReading.electrical.THD_V_R}%, Y=${meterReading.electrical.THD_V_Y}%, B=${meterReading.electrical.THD_V_B}%
- Harmonics THD_I: R=${meterReading.electrical.THD_I_R}%, Y=${meterReading.electrical.THD_I_Y}%, B=${meterReading.electrical.THD_I_B}%

Provide a concise, high-impact industrial diagnosis in JSON matching the schema.`;
      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert power system diagnostic engineer for heavy industrial manufacturing facilities. Provide strictly verified electrical engineering insights, mentioning specific mitigation devices like APFC capacitor banks, active harmonic filters (AHF), detuned reactors, and CT/PT inspection.",
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              rootCause: {
                type: import_genai.Type.STRING,
                description: "Clear, technically precise physical explanation of what caused the anomaly."
              },
              impactAnalysis: {
                type: import_genai.Type.STRING,
                description: "Financial, equipment lifespan, tariff penalty, and transformer thermal impact."
              },
              actionSteps: {
                type: import_genai.Type.ARRAY,
                items: { type: import_genai.Type.STRING },
                description: "3-4 actionable sequential steps for plant engineers to resolve the issue."
              },
              equipmentRisk: {
                type: import_genai.Type.STRING,
                enum: ["CRITICAL", "MODERATE", "LOW"],
                description: "Severity risk to plant machinery and switchgear."
              },
              estimatedCostPenaltyPerHour: {
                type: import_genai.Type.STRING,
                description: "Estimated financial loss or utility penalty per hour."
              },
              recommendedHardwareSetting: {
                type: import_genai.Type.STRING,
                description: "Specific hardware knob or switchgear setting (e.g. APFC stage +25kVAR)."
              }
            },
            required: ["rootCause", "impactAnalysis", "actionSteps", "equipmentRisk"]
          }
        }
      });
      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        return {
          ...parsed,
          generatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
    } catch (err) {
      console.warn("Gemini API diagnosis call failed, falling back to rule-based engine:", err);
    }
  }
  return generateRuleBasedDiagnosis(incidentTitle, incidentCategory, meterReading);
}
function generateRuleBasedDiagnosis(title, category, reading) {
  const isHighThd = reading.electrical.THD_I_R > 5 || reading.electrical.THD_V_R > 5;
  const isLowPf = reading.electrical.PF < 0.85;
  const isOffline = reading.status.online === 0 || reading.status.last_update_seconds > 120;
  const isSentinel = reading.electrical.PF === 9999 || reading.electrical.kW === 999999;
  if (isOffline) {
    return {
      rootCause: `Gateway communication timeout (${reading.status.last_update_seconds}s elapsed without Modbus polling update). Possible RS-485 loop disconnect or auxiliary power failure.`,
      impactAnalysis: "Telemetry blackout impedes real-time maximum demand tracking and time-of-day tariff rate monitoring.",
      actionSteps: [
        "Check 24V DC auxiliary PSU on KIOT Gateway terminal A+/B-.",
        "Verify RS-485 bus terminating resistor (120 ohm) integrity.",
        "Ping IoT Gateway IP and cycle power if DHCP lease dropped."
      ],
      equipmentRisk: "CRITICAL",
      estimatedCostPenaltyPerHour: "$0.00 (Blackout Risk)",
      recommendedHardwareSetting: "Check Gateway DIP switches & RS-485 Baud Rate (9600 8-N-1)",
      generatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  if (isSentinel) {
    return {
      rootCause: `Meter Modbus register sentinel 9999/999999 returned. This indicates disconnected CT secondary terminals or out-of-bounds register scaling overflow.`,
      impactAnalysis: "Corrupted energy telemetry invalidates cumulative kWh accounting and false-trips automated billing logs.",
      actionSteps: [
        "Inspect CT shorting blocks on R, Y, B phases in meter cubicle.",
        "Check PT secondary voltage fuses (FU1-FU3).",
        "Verify Modbus register map offset address configuration in KIOT gateway."
      ],
      equipmentRisk: "MODERATE",
      estimatedCostPenaltyPerHour: "Billing Data Invalidation",
      recommendedHardwareSetting: "Verify CT primary:secondary ratio (e.g., 200:5A)",
      generatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  if (isHighThd) {
    const maxThd = Math.max(reading.electrical.THD_I_R, reading.electrical.THD_I_Y, reading.electrical.THD_I_B);
    return {
      rootCause: `High non-linear harmonic distortion (${maxThd.toFixed(1)}% THD_I) caused by unfiltered 6-pulse / 12-pulse variable frequency drives (VFDs) and induction heaters.`,
      impactAnalysis: `Generates severe eddy current heating in step-down distribution transformers, neutral conductor overheating, and nuisance tripping of sensitive electronic relays.`,
      actionSteps: [
        "Energize Active Harmonic Filter (AHF-01) on Feeder Bus.",
        "Verify tuned 5th & 7th harmonic passive LC trap filter contactors.",
        "Schedule thermographic IR scan on main busbar joints and neutral links."
      ],
      equipmentRisk: "CRITICAL",
      estimatedCostPenaltyPerHour: `$24.50 / hr (Transformer Thermal Loss & K-Factor Derating)`,
      recommendedHardwareSetting: "Engage AHF-01 Active Harmonic Filter in Selective Harmonic Compensation Mode",
      generatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  if (isLowPf) {
    return {
      rootCause: `Power factor dropped to ${reading.electrical.PF} (lagging). Highly inductive reactive power draw of ${reading.electrical.kVAR} kVAR exceeds baseline compensation.`,
      impactAnalysis: `Discom utility low power factor penalty tariff applies (typically 2.0% - 3.5% billing surcharge when PF < 0.85), plus increased I\xB2R heating losses in plant feeder cables.`,
      actionSteps: [
        "Engage APFC Capacitor Bank Stage 2 (+25 kVAR) or Stage 3 (+50 kVAR).",
        "Inspect APFC automatic stepping relay controller for stuck contactors.",
        "Verify power factor capacitors for capacitance degradation with microfarad meter."
      ],
      equipmentRisk: "MODERATE",
      estimatedCostPenaltyPerHour: `$18.20 / hr (Utility Surcharge & kVA Demand Penalty)`,
      recommendedHardwareSetting: "Switch APFC Controller to Automatic Hunting Mode (Target PF: 0.985)",
      generatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  return {
    rootCause: `Telemetry variations observed within normal operating parameters for ${reading.device_name}.`,
    impactAnalysis: "System operating within nominal industrial grid limits.",
    actionSteps: [
      "Continue standard routine monitoring.",
      "Maintain periodic preventive maintenance logs."
    ],
    equipmentRisk: "LOW",
    estimatedCostPenaltyPerHour: "$0.00 / hr",
    recommendedHardwareSetting: "Standard Nominal Configuration",
    generatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function askEnergyCopilot(query, contextData) {
  const ai = getGenAI();
  if (ai) {
    try {
      const systemContext = `You are the KIOT Industrial Energy AI Copilot. You are an expert electrical engineer, power quality specialist, and plant energy manager.
Current Plant Summary:
- Total Active Power: ${contextData.plantSummary.totalActivePowerKw} kW
- Total Apparent Power: ${contextData.plantSummary.totalApparentPowerKva} kVA
- Total Reactive Power: ${contextData.plantSummary.totalReactivePowerKvar} kVAR
- Average Plant PF: ${contextData.plantSummary.averagePowerFactor}
- Active Incidents: ${contextData.incidents.filter((i) => i.status !== "RESOLVED").length}
- Online Meters: ${contextData.plantSummary.onlineMetersCount} / ${contextData.plantSummary.totalMetersCount}

Meter Telemetry Highlights:
${contextData.meters.map(
        (m) => `\u2022 ${m.device_name} (${m.device_id}): kW=${m.electrical.kW}, PF=${m.electrical.PF}, THD_V=${m.electrical.THD_V_R}%, THD_I=${m.electrical.THD_I_R}%, Status=${m.status.online === 1 ? "Online" : "Fault/Offline"}`
      ).join("\n")}

Active Incidents:
${contextData.incidents.filter((i) => i.status !== "RESOLVED").map((i) => `\u2022 [${i.severity}] ${i.title} (Assigned to: ${i.assignedTo}, Status: ${i.status})`).join("\n")}

Answer the plant operator's question directly, clearly, with concise technical precision and actionable energy efficiency recommendations.`;
      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: query,
        config: {
          systemInstruction: systemContext
        }
      });
      if (response.text) {
        return response.text;
      }
    } catch (err) {
      console.warn("Gemini Copilot chat error:", err);
    }
  }
  return `### KIOT Industrial Energy Copilot (Offline Heuristic Mode)

**Analysis of Plant State:**
- **Active Load**: Total plant load is running at **${contextData.plantSummary.totalActivePowerKw} kW** (${contextData.plantSummary.totalApparentPowerKva} kVA apparent demand).
- **Power Factor**: Plant average is **${contextData.plantSummary.averagePowerFactor}** (${contextData.plantSummary.averagePowerFactor < 0.85 ? "\u26A0\uFE0F Surcharge Risk (< 0.85)" : "\u2705 Healthy"}).
- **Incident Summary**: There are **${contextData.incidents.filter((i) => i.status !== "RESOLVED").length} open incidents** requiring operator action.

**Operator Recommendation:**
1. **Power Factor Optimization**: ${contextData.plantSummary.averagePowerFactor < 0.9 ? "Engage APFC bank stage +50 kVAR to raise average PF above 0.95 and eliminate utility penalties." : "Power factor is maintained above penalty threshold."}
2. **Harmonics Mitigation**: Ensure Active Harmonic Filters (AHF) are active on production lines with high VFD concentration to suppress 5th and 7th harmonic orders below 5% THD.
3. **Peak Shaving**: Consider staggering compressor startup cycles during peak tariff windows (09:00 - 18:00) to lower maximum demand charges.`;
}
var import_genai, genAIClient;
var init_geminiService = __esm({
  "api/backend/geminiService.ts"() {
    import_genai = require("@google/genai");
    genAIClient = null;
  }
});

// api/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => handler
});
module.exports = __toCommonJS(index_exports);

// api/backend/kiotSimulator.ts
var METERS = [
  {
    device_id: "e46347828fce",
    device_name: "MAIN_PANEL_001",
    location: "Substation-A Main 415V Incomer",
    feeder_type: "MAIN_INCOMER",
    rated_capacity_kva: 100
  },
  {
    device_id: "e46347828fcf",
    device_name: "HVAC_CHILLER_PLANT",
    location: "Utility Yard - Chiller #2 & Cooling Towers",
    feeder_type: "HVAC_CHILLER",
    rated_capacity_kva: 45
  },
  {
    device_id: "e46347828fd0",
    device_name: "COMPRESSOR_HOUSE_B",
    location: "Utility Block - Atlas Copco Screw Comp 150HP",
    feeder_type: "COMPRESSOR",
    rated_capacity_kva: 35
  },
  {
    device_id: "e46347828fd1",
    device_name: "PRODUCTION_LINE_01",
    location: "Assembly Hall - Robotics & VFD Conveyor Banks",
    feeder_type: "PRODUCTION_LINE",
    rated_capacity_kva: 50
  },
  {
    device_id: "e46347828fd2",
    device_name: "SOLAR_SUBSTATION_04",
    location: "Roof Grid-Tie Solar PV 40kW Inverter Array",
    feeder_type: "SOLAR_PV",
    rated_capacity_kva: 40
  },
  {
    device_id: "e46347828fd3",
    device_name: "ARC_FURNACE_ZONE_C",
    location: "Foundry Bay - 750kW Induction Melting Furnace",
    feeder_type: "FURNACE",
    rated_capacity_kva: 80
  }
];
var KiotSimulatorEngine = class {
  constructor() {
    this.latestReadings = /* @__PURE__ */ new Map();
    this.historicalData = /* @__PURE__ */ new Map();
    this.activeFaults = /* @__PURE__ */ new Map();
    this.incidents = [];
    this.baseKwh = /* @__PURE__ */ new Map();
    this.autoFaultsEnabled = true;
    this.tickCount = 0;
    this.intervalTimer = null;
    this.initializeMeters();
    this.seedHistoricalData();
    this.startSimulationLoop();
  }
  initializeMeters() {
    const baseEnergy = [15482.65, 8421.3, 6120.45, 12930.8, 4810.15, 24100.9];
    METERS.forEach((meter, idx) => {
      this.baseKwh.set(meter.device_id, baseEnergy[idx] || 1e4);
      this.latestReadings.set(meter.device_id, this.generateReadingForMeter(meter.device_id, /* @__PURE__ */ new Date()));
    });
  }
  seedHistoricalData() {
    const now = Date.now();
    const totalPoints = 120;
    const intervalMs = 12 * 60 * 1e3;
    METERS.forEach((meter) => {
      const history = [];
      let runningKwh = (this.baseKwh.get(meter.device_id) || 1e4) - 240;
      for (let i = totalPoints; i >= 0; i--) {
        const pointTime = new Date(now - i * intervalMs);
        const hour = pointTime.getHours();
        const isPeak = hour >= 9 && hour <= 18;
        const loadFactor = isPeak ? 0.75 + Math.sin((hour - 9) / 9 * Math.PI) * 0.2 : 0.35 + Math.random() * 0.15;
        const ratedKva = meter.rated_capacity_kva;
        const kva = +(ratedKva * loadFactor + (Math.random() * 2 - 1)).toFixed(2);
        let pf = +(0.92 + (Math.random() * 0.05 - 0.02)).toFixed(3);
        let thd_v = +(1.8 + Math.random() * 0.8).toFixed(1);
        let thd_i = +(3.8 + Math.random() * 1.2).toFixed(1);
        let isFault = false;
        let faultReason = void 0;
        if (meter.device_id === "e46347828fd1" && i >= 35 && i <= 45) {
          pf = +(0.76 + Math.random() * 0.04).toFixed(3);
          thd_i = +(11.5 + Math.random() * 2.5).toFixed(1);
          isFault = true;
          faultReason = "Poor Power Factor (0.76) & High VFD Harmonics";
        }
        if (meter.device_id === "e46347828fce" && i >= 75 && i <= 80) {
          thd_v = +(6.4 + Math.random() * 1.2).toFixed(1);
          isFault = true;
          faultReason = "Voltage Harmonic Distortion THD_V (6.8%) Exceeded 5% Grid Limit";
        }
        const kw = +(kva * pf).toFixed(2);
        const kvar = +Math.sqrt(Math.max(0, kva * kva - kw * kw)).toFixed(2);
        runningKwh += +(kw * (intervalMs / 36e5)).toFixed(2);
        const v_rn = +(239.5 + (Math.random() * 2 - 1)).toFixed(1);
        const i_avg = +(kva * 1e3 / (Math.sqrt(3) * 415)).toFixed(1);
        history.push({
          timestamp: pointTime.toISOString(),
          kW: kw,
          kVA: kva,
          kVAR: kvar,
          PF: pf,
          Freq: +(50 + (Math.random() * 0.08 - 0.04)).toFixed(2),
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
          faultReason
        });
      }
      this.historicalData.set(meter.device_id, history);
      this.baseKwh.set(meter.device_id, runningKwh);
    });
    this.seedInitialIncidents();
  }
  seedInitialIncidents() {
    const mainMeter = METERS[0];
    const prodMeter = METERS[3];
    const hvacMeter = METERS[1];
    const initialIncident1 = {
      id: `INC-2026-0801`,
      title: `Harmonic Current Distortion (THD_I = 14.8%) on Production VFD Feeder`,
      description: `Non-linear harmonic current distortion exceeded statutory 5% IEEE-519 limits on ${prodMeter.device_name}. Phase R THD_I reaching 14.8%.`,
      category: "POWER_QUALITY",
      severity: "HIGH",
      status: "IN_PROGRESS",
      deviceId: prodMeter.device_id,
      deviceName: prodMeter.device_name,
      timestamp: new Date(Date.now() - 42 * 60 * 1e3).toISOString(),
      assignedTo: "Senior Electrical Engineer",
      slaMinutesTotal: 60,
      slaDeadline: new Date(Date.now() + 18 * 60 * 1e3).toISOString(),
      isSlaBreached: false,
      telemetrySnapshot: this.generateReadingForMeter(prodMeter.device_id, new Date(Date.now() - 42 * 60 * 1e3), "high_thd_current"),
      aiDiagnosis: {
        rootCause: "Heavy 6-pulse variable frequency drives (VFDs) operating without tuned passive or active harmonic filters on Line 1 conveyor drive train.",
        impactAnalysis: "Excessive eddy current heating in upstream step-down transformer (estimated 6.2% additional thermal losses) and potential neutral line resonance.",
        actionSteps: [
          "Switch on the 5th & 7th harmonic active filter at Sub-Distribution Panel 3.",
          "Verify DC choke inductors on VFD 4 & 5.",
          "Perform thermal camera scan of neutral busbar connectors."
        ],
        equipmentRisk: "MODERATE",
        estimatedCostPenaltyPerHour: "$18.50 / hr (Transformer Overheating & Efficiency Loss)",
        recommendedHardwareSetting: "Enable Active Harmonic Filter (AHF-01) Step 2 Mode",
        generatedAt: new Date(Date.now() - 40 * 60 * 1e3).toISOString()
      },
      activityLog: [
        {
          id: "ACT-1",
          timestamp: new Date(Date.now() - 42 * 60 * 1e3).toISOString(),
          author: "AI Telemetry Engine",
          action: "Incident automatically created and assigned to Senior Electrical Engineer (THD > 5%)."
        },
        {
          id: "ACT-2",
          timestamp: new Date(Date.now() - 25 * 60 * 1e3).toISOString(),
          author: "R. Sharma (Senior Electrical Engineer)",
          action: "Acknowledged ticket. Checked VFD bank 3 harmonic trap status.",
          note: "Operator confirmed batch start with full robot arm cycle."
        }
      ]
    };
    const initialIncident2 = {
      id: `INC-2026-0802`,
      title: `Low Power Factor (PF = 0.77) on HVAC Chiller Plant Substation`,
      description: `Power factor dropped below the 0.85 utility penalty threshold on ${hvacMeter.device_name} (Current PF: 0.778 lagging).`,
      category: "POWER_QUALITY",
      severity: "HIGH",
      status: "NEW",
      deviceId: hvacMeter.device_id,
      deviceName: hvacMeter.device_name,
      timestamp: new Date(Date.now() - 14 * 60 * 1e3).toISOString(),
      assignedTo: "Senior Electrical Engineer",
      slaMinutesTotal: 60,
      slaDeadline: new Date(Date.now() + 46 * 60 * 1e3).toISOString(),
      isSlaBreached: false,
      telemetrySnapshot: this.generateReadingForMeter(hvacMeter.device_id, new Date(Date.now() - 14 * 60 * 1e3), "low_pf"),
      aiDiagnosis: {
        rootCause: "Inductive reactive power surge caused by uncompensated secondary chiller compressor startup while Automatic Power Factor Controller (APFC) bank #3 was offline.",
        impactAnalysis: "Discom low power factor surcharge penalty of 2.5% applied on monthly tariff if average PF remains < 0.85, resulting in ~$420/day excess expenditure.",
        actionSteps: [
          "Trigger manual switch-in for APFC Capacitor Bank 2 (25 kVAR).",
          "Inspect APFC automatic switching contactor relay 3.",
          "Verify chiller motor soft-starter power factor compensation capacitors."
        ],
        equipmentRisk: "LOW",
        estimatedCostPenaltyPerHour: "$14.20 / hr (Surcharge Tariff Risk)",
        recommendedHardwareSetting: "Step APFC Bank to +50 kVAR Compensation",
        generatedAt: new Date(Date.now() - 12 * 60 * 1e3).toISOString()
      },
      activityLog: [
        {
          id: "ACT-10",
          timestamp: new Date(Date.now() - 14 * 60 * 1e3).toISOString(),
          author: "AI Telemetry Engine",
          action: "Incident automatically created due to PF 0.77 < 0.85 threshold."
        }
      ]
    };
    this.incidents.push(initialIncident1, initialIncident2);
  }
  generateReadingForMeter(deviceId, now = /* @__PURE__ */ new Date(), overrideFault) {
    const meter = METERS.find((m) => m.device_id === deviceId) || METERS[0];
    const activeFault = overrideFault || this.activeFaults.get(deviceId);
    const hour = now.getHours();
    const isPeak = hour >= 9 && hour <= 18;
    let currentKwh = this.baseKwh.get(deviceId) || 15e3;
    const deltaKwh = +(0.015 + Math.random() * 0.02).toFixed(4);
    currentKwh += deltaKwh;
    this.baseKwh.set(deviceId, currentKwh);
    let v_rn = 239.5 + (Math.random() * 1.8 - 0.9);
    let v_yn = 240.2 + (Math.random() * 1.6 - 0.8);
    let v_bn = 238.8 + (Math.random() * 1.7 - 0.85);
    let loadRatio = isPeak ? 0.65 + Math.random() * 0.25 : 0.35 + Math.random() * 0.15;
    if (meter.feeder_type === "SOLAR_PV") {
      loadRatio = hour >= 7 && hour <= 17 ? Math.sin((hour - 7) / 10 * Math.PI) * 0.9 : 0.02;
    }
    const ratedKva = meter.rated_capacity_kva;
    let kva = ratedKva * loadRatio;
    let pf = 0.925 + (Math.random() * 0.04 - 0.02);
    let thd_v_r = 2.1 + (Math.random() * 0.5 - 0.25);
    let thd_v_y = 2.4 + (Math.random() * 0.4 - 0.2);
    let thd_v_b = 2 + (Math.random() * 0.4 - 0.2);
    let thd_i_r = 4.8 + (Math.random() * 0.8 - 0.4);
    let thd_i_y = 5.1 + (Math.random() * 0.7 - 0.35);
    let thd_i_b = 4.5 + (Math.random() * 0.8 - 0.4);
    let onlineStatus = 1;
    let lastUpdateSeconds = Math.floor(Math.random() * 15) + 2;
    if (activeFault === "low_pf") {
      pf = 0.74 + Math.random() * 0.06;
      kva = kva * 1.25;
    } else if (activeFault === "high_thd_current") {
      thd_i_r = 16.4 + Math.random() * 4;
      thd_i_y = 15.2 + Math.random() * 3.5;
      thd_i_b = 14.8 + Math.random() * 3.2;
    } else if (activeFault === "high_thd_voltage") {
      thd_v_r = 7.8 + Math.random() * 2.2;
      thd_v_y = 8.1 + Math.random() * 1.8;
      thd_v_b = 7.2 + Math.random() * 1.9;
    } else if (activeFault === "gateway_offline") {
      onlineStatus = 0;
      lastUpdateSeconds = 185 + Math.floor(Math.random() * 45);
    } else if (activeFault === "sensor_sentinel_fault") {
      onlineStatus = 2;
      return {
        device_id: meter.device_id,
        device_name: meter.device_name,
        timestamp: now.toISOString(),
        status: {
          online: 2,
          last_update_seconds: 14
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
          THD_I_B: 9999
        }
      };
    } else if (activeFault === "undervoltage_sag") {
      v_rn = 184.2 + Math.random() * 4;
      v_yn = 182.5 + Math.random() * 3;
      v_bn = 185.1 + Math.random() * 4;
    } else if (activeFault === "overvoltage_spike") {
      v_rn = 272.4 + Math.random() * 5;
      v_yn = 274.1 + Math.random() * 4;
      v_bn = 271.8 + Math.random() * 5;
    }
    const v_ry = +Math.sqrt(v_rn * v_rn + v_yn * v_yn - 2 * v_rn * v_yn * Math.cos(120 * Math.PI / 180)).toFixed(1);
    const v_yb = +Math.sqrt(v_yn * v_yn + v_bn * v_bn - 2 * v_yn * v_bn * Math.cos(120 * Math.PI / 180)).toFixed(1);
    const v_br = +Math.sqrt(v_bn * v_bn + v_rn * v_rn - 2 * v_bn * v_rn * Math.cos(120 * Math.PI / 180)).toFixed(1);
    const avgV = (v_rn + v_yn + v_bn) / 3;
    let baseI = kva * 1e3 / (3 * avgV);
    let i_r = +(baseI * (1 + (Math.random() * 0.06 - 0.03))).toFixed(1);
    let i_y = +(baseI * (1 + (Math.random() * 0.06 - 0.03))).toFixed(1);
    let i_b = +(baseI * (1 + (Math.random() * 0.06 - 0.03))).toFixed(1);
    let i_n = +(Math.abs(i_r - i_y) * 0.3 + 1.1).toFixed(1);
    if (activeFault === "phase_imbalance") {
      i_r = +(baseI * 1.65).toFixed(1);
      i_y = +(baseI * 0.65).toFixed(1);
      i_b = +(baseI * 0.85).toFixed(1);
      i_n = +(baseI * 0.82).toFixed(1);
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
        last_update_seconds: lastUpdateSeconds
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
        THD_I_B: +thd_i_b.toFixed(1)
      }
    };
  }
  startSimulationLoop() {
    if (process.env.VERCEL) return;
    this.intervalTimer = setInterval(() => {
      this.tick();
    }, 5e3);
  }
  tick() {
    this.tickCount++;
    const now = /* @__PURE__ */ new Date();
    if (this.autoFaultsEnabled && this.tickCount % 24 === 0) {
      this.randomlyInjectOrClearFault();
    }
    METERS.forEach((meter) => {
      const reading = this.generateReadingForMeter(meter.device_id, now);
      this.latestReadings.set(meter.device_id, reading);
      const history = this.historicalData.get(meter.device_id) || [];
      const isSentinel = reading.electrical.PF === 9999;
      const v_avg = isSentinel ? 0 : (reading.electrical.V_RN + reading.electrical.V_YN + reading.electrical.V_BN) / 3;
      const i_avg = isSentinel ? 0 : (reading.electrical.I_R + reading.electrical.I_Y + reading.electrical.I_B) / 3;
      const thd_v_avg = isSentinel ? 0 : (reading.electrical.THD_V_R + reading.electrical.THD_V_Y + reading.electrical.THD_V_B) / 3;
      const thd_i_avg = isSentinel ? 0 : (reading.electrical.THD_I_R + reading.electrical.THD_I_Y + reading.electrical.THD_I_B) / 3;
      let isFault = false;
      let faultReason = void 0;
      if (reading.status.online === 0 || reading.status.last_update_seconds > 120) {
        isFault = true;
        faultReason = "Gateway Communication Offline";
      } else if (isSentinel) {
        isFault = true;
        faultReason = "Sensor Corrupted Telemetry (Sentinel 9999)";
      } else if (reading.electrical.PF < 0.85) {
        isFault = true;
        faultReason = `Low Power Factor (${reading.electrical.PF}) < 0.85`;
      } else if (thd_v_avg > 5 || thd_i_avg > 5) {
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
        faultReason
      });
      if (history.length > 500) {
        history.shift();
      }
      this.historicalData.set(meter.device_id, history);
      this.evaluateAnomalyRule(reading);
    });
  }
  randomlyInjectOrClearFault() {
    const faultKeys = ["low_pf", "high_thd_current", "high_thd_voltage", "phase_imbalance", "gateway_offline", "sensor_sentinel_fault"];
    const randomMeter = METERS[Math.floor(Math.random() * METERS.length)];
    if (this.activeFaults.size > 0 && Math.random() > 0.4) {
      const keys = Array.from(this.activeFaults.keys());
      const clearKey = keys[Math.floor(Math.random() * keys.length)];
      this.activeFaults.delete(clearKey);
    } else {
      const randomFault = faultKeys[Math.floor(Math.random() * faultKeys.length)];
      this.activeFaults.set(randomMeter.device_id, randomFault);
    }
  }
  evaluateAnomalyRule(reading) {
    const { device_id, device_name, status, electrical } = reading;
    const isSentinel = electrical.PF === 9999 || electrical.kW === 999999;
    let alertTriggered = null;
    if (status.online === 0 || status.last_update_seconds > 120) {
      alertTriggered = {
        category: "GATEWAY_OFFLINE",
        severity: "CRITICAL",
        title: `Gateway Offline / Communication Dropout on ${device_name}`,
        description: `KIOT gateway failed to respond for ${status.last_update_seconds}s (online status: ${status.online}). Loss of real-time telemetry stream.`,
        assignee: "IoT Field Technician",
        slaMinutes: 30,
        aiRootCause: "Modbus RS-485 serial communication dropout or Ethernet gateway DHCP network timeout.",
        aiImpact: "Inability to track peak demand or detect transient electrical overloads; risking unmonitored power quality degradation.",
        aiSteps: [
          "Inspect physical RS-485 twisted pair wiring between meter and gateway.",
          "Verify 24V DC auxiliary power supply to KIOT IoT gateway module.",
          "Ping gateway IP address on Plant Substation VLAN."
        ],
        costPenalty: "$0 direct (Operational Blindspot Risk)"
      };
    } else if (isSentinel || status.online === 2) {
      alertTriggered = {
        category: "SENSOR_CORRUPTION",
        severity: "HIGH",
        title: `Corrupted Modbus Telemetry (Sentinel 9999/999999) on ${device_name}`,
        description: `Meter registers returned error sentinel 9999/999999 across parameters. Possible CT/PT disconnection or register overflow.`,
        assignee: "IoT Field Technician",
        slaMinutes: 45,
        aiRootCause: "Potential Modbus register address mismatch or disconnected Current Transformer (CT) secondary wiring.",
        aiImpact: "Corrupt energy billing records and failure to accumulate valid plant kilowatt-hour metrics.",
        aiSteps: [
          "Test CT secondary terminal block shorting links.",
          "Verify parity and baud rate setting (typically 9600 8-N-1) on energy meter.",
          "Reboot meter communication interface card."
        ],
        costPenalty: "Billing Data Invalidation Risk"
      };
    } else if (electrical.THD_I_R > 5 || electrical.THD_I_Y > 5 || electrical.THD_I_B > 5) {
      const maxThd = Math.max(electrical.THD_I_R, electrical.THD_I_Y, electrical.THD_I_B);
      alertTriggered = {
        category: "POWER_QUALITY",
        severity: maxThd > 12 ? "CRITICAL" : "HIGH",
        title: `High Current THD (${maxThd.toFixed(1)}% > 5%) Detected on ${device_name}`,
        description: `Current total harmonic distortion breached IEEE-519 5% recommended threshold on ${device_name}.`,
        assignee: "Senior Electrical Engineer",
        slaMinutes: maxThd > 12 ? 30 : 60,
        aiRootCause: "Heavy non-linear semiconductor switching loads (VFDs, Rectifiers, Arc Furnaces) injecting 5th & 7th harmonic orders into the bus.",
        aiImpact: "High neutral conductor overheating, premature insulation degradation in distribution transformers, and nuisance relay tripping.",
        aiSteps: [
          "Engage Active Harmonic Filter (AHF) unit on Feeder Bus.",
          "Inspect tuned L-C harmonic filter capacitor banks for blown fuses.",
          "Stagger start times of large variable speed drive motors."
        ],
        costPenalty: `$22.00 / hr (Transformer Degradation & K-Factor Derating)`
      };
    } else if (electrical.THD_V_R > 5 || electrical.THD_V_Y > 5 || electrical.THD_V_B > 5) {
      const maxVThd = Math.max(electrical.THD_V_R, electrical.THD_V_Y, electrical.THD_V_B);
      alertTriggered = {
        category: "POWER_QUALITY",
        severity: "HIGH",
        title: `Voltage Harmonic Distortion THD_V (${maxVThd.toFixed(1)}%) on ${device_name}`,
        description: `Bus voltage waveform distortion exceeding 5% grid limit, risking sensitive CNC and PLC hardware malfunction.`,
        assignee: "Senior Electrical Engineer",
        slaMinutes: 60,
        aiRootCause: "System resonance between power factor correction capacitors and distribution line inductance at harmonic frequencies.",
        aiImpact: "Risk of voltage notch damage to digital control power supplies and PLCs.",
        aiSteps: [
          "Verify detuning reactors on all online capacitor banks (minimum 7% detuned).",
          "Measure harmonic spectrum (3rd, 5th, 7th orders) at main incomer."
        ],
        costPenalty: "$15.00 / hr (Control Equipment Failure Risk)"
      };
    } else if (electrical.PF < 0.85) {
      alertTriggered = {
        category: "POWER_QUALITY",
        severity: "HIGH",
        title: `Low Power Factor Penalty Alert (PF = ${electrical.PF}) on ${device_name}`,
        description: `Operating Power Factor of ${electrical.PF} is below the 0.85 utility penalty threshold, causing high reactive power draw (${electrical.kVAR} kVAR).`,
        assignee: "Senior Electrical Engineer",
        slaMinutes: 60,
        aiRootCause: "High inductive load from uncompensated induction motors operating under partial load without adequate capacitor bank stages.",
        aiImpact: "Discom utility penalty surcharge applied to monthly electricity bill plus increased $I^2R$ copper losses in internal distribution cables.",
        aiSteps: [
          "Energize APFC Capacitor Bank Stage 2 (+25 kVAR) or Stage 3 (+50 kVAR).",
          "Inspect APFC automatic controller current sensor sensitivity setting.",
          "Check contactors for welded contacts or open fuses."
        ],
        costPenalty: `$16.80 / hr (Tariff Surcharge & Transmission Loss)`
      };
    }
    if (alertTriggered) {
      const existing = this.incidents.find(
        (inc) => inc.deviceId === device_id && inc.category === alertTriggered.category && (inc.status === "NEW" || inc.status === "IN_PROGRESS")
      );
      if (!existing) {
        const incId = `INC-2026-${String(this.incidents.length + 801).padStart(4, "0")}`;
        const newIncident = {
          id: incId,
          title: alertTriggered.title,
          description: alertTriggered.description,
          category: alertTriggered.category,
          severity: alertTriggered.severity,
          status: "NEW",
          deviceId: device_id,
          deviceName: device_name,
          timestamp: reading.timestamp,
          assignedTo: alertTriggered.assignee,
          slaMinutesTotal: alertTriggered.slaMinutes,
          slaDeadline: new Date(Date.now() + alertTriggered.slaMinutes * 60 * 1e3).toISOString(),
          isSlaBreached: false,
          telemetrySnapshot: reading,
          aiDiagnosis: {
            rootCause: alertTriggered.aiRootCause,
            impactAnalysis: alertTriggered.aiImpact,
            actionSteps: alertTriggered.aiSteps,
            equipmentRisk: alertTriggered.severity === "CRITICAL" ? "CRITICAL" : "MODERATE",
            estimatedCostPenaltyPerHour: alertTriggered.costPenalty,
            generatedAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          activityLog: [
            {
              id: `ACT-${Date.now()}`,
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              author: "AI Telemetry Engine",
              action: `Alert triggered: ${alertTriggered.title}. Auto-assigned to ${alertTriggered.assignee}.`
            }
          ]
        };
        this.incidents.unshift(newIncident);
        if (this.incidents.length > 100) {
          this.incidents.pop();
        }
      }
    }
  }
  // Helper to resolve device_id or device_name to canonical device_id
  resolveCanonicalMeter(deviceIdOrName) {
    if (!deviceIdOrName) return void 0;
    return METERS.find(
      (m) => m.device_id.toLowerCase() === deviceIdOrName.toLowerCase() || m.device_name.toLowerCase() === deviceIdOrName.toLowerCase()
    );
  }
  // API Methods
  getDiscoveredMeters() {
    return METERS;
  }
  getLatestReading(deviceId) {
    const meter = this.resolveCanonicalMeter(deviceId);
    if (!meter) return null;
    return this.latestReadings.get(meter.device_id) || null;
  }
  getAllLatestReadings() {
    return METERS.map((m) => {
      let reading = this.latestReadings.get(m.device_id);
      if (!reading) {
        reading = this.generateReadingForMeter(m.device_id, /* @__PURE__ */ new Date());
        this.latestReadings.set(m.device_id, reading);
      }
      return reading;
    });
  }
  getHistory(deviceId, range = "24h") {
    const meter = this.resolveCanonicalMeter(deviceId);
    if (!meter) return [];
    const history = this.historicalData.get(meter.device_id) || [];
    if (range === "1h") {
      return history.slice(-12);
    } else if (range === "6h") {
      return history.slice(-30);
    } else if (range === "12h") {
      return history.slice(-60);
    }
    return history;
  }
  getIncidents() {
    const now = Date.now();
    return this.incidents.map((inc) => {
      const deadline = new Date(inc.slaDeadline).getTime();
      const isBreached = inc.status !== "RESOLVED" && now > deadline;
      return {
        ...inc,
        isSlaBreached: isBreached
      };
    });
  }
  updateIncidentStatus(incidentId, status, author = "Control Room Operator", note) {
    const incident = this.incidents.find((i) => i.id === incidentId);
    if (!incident) return null;
    incident.status = status;
    if (status === "RESOLVED") {
      incident.resolvedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    incident.activityLog.push({
      id: `ACT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      author,
      action: `Status updated to ${status.replace("_", " ")}`,
      note
    });
    return incident;
  }
  updateIncidentDiagnosis(incidentId, diagnosis) {
    const incident = this.incidents.find((i) => i.id === incidentId);
    if (!incident) return null;
    incident.aiDiagnosis = diagnosis;
    return incident;
  }
  injectFault(deviceId, fault) {
    const meter = this.resolveCanonicalMeter(deviceId) || METERS[0];
    const canonicalId = meter.device_id;
    if (fault === "none") {
      this.activeFaults.delete(canonicalId);
    } else {
      this.activeFaults.set(canonicalId, fault);
    }
    const reading = this.generateReadingForMeter(canonicalId, /* @__PURE__ */ new Date());
    this.latestReadings.set(canonicalId, reading);
    this.evaluateAnomalyRule(reading);
    return true;
  }
  clearAllFaults() {
    this.activeFaults.clear();
    METERS.forEach((m) => {
      const reading = this.generateReadingForMeter(m.device_id, /* @__PURE__ */ new Date());
      this.latestReadings.set(m.device_id, reading);
    });
  }
  setAutoFaults(enabled) {
    this.autoFaultsEnabled = enabled;
  }
  getSimulationState() {
    const currentFaults = {};
    this.activeFaults.forEach((v, k) => {
      currentFaults[k] = v;
    });
    return {
      autoFaultsEnabled: this.autoFaultsEnabled,
      tickIntervalSeconds: 5,
      currentFaults,
      totalReadingsGenerated: this.tickCount * METERS.length + 720,
      activeIncidentsCount: this.incidents.filter((i) => i.status !== "RESOLVED").length
    };
  }
  getPlantSummary() {
    const readings = this.getAllLatestReadings();
    let totalKw = 0;
    let totalKva = 0;
    let totalKvar = 0;
    let validPfs = [];
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
    const activeAlerts = this.incidents.filter((i) => i.status === "NEW").length;
    const criticalIncidents = this.incidents.filter((i) => i.severity === "CRITICAL" && i.status !== "RESOLVED").length;
    return {
      totalActivePowerKw: +totalKw.toFixed(2),
      totalApparentPowerKva: +totalKva.toFixed(2),
      totalReactivePowerKvar: +totalKvar.toFixed(2),
      averagePowerFactor: +avgPf.toFixed(3),
      totalKwhToday: +(totalKw * 8.4).toFixed(1),
      // daily consumption proxy
      estimatedCostToday: +(totalKw * 8.4 * 0.12).toFixed(2),
      // @ $0.12 / kWh
      onlineMetersCount: onlineCount,
      totalMetersCount: METERS.length,
      activeAlertsCount: activeAlerts,
      criticalIncidentsCount: criticalIncidents
    };
  }
};
var _instance = null;
function getEngine() {
  if (!_instance) {
    _instance = new KiotSimulatorEngine();
  }
  return _instance;
}
var simulatorEngine = new Proxy({}, {
  get(_t, prop) {
    return getEngine()[prop];
  }
});

// api/index.ts
function json(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}
function parseBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}
function matchRoute(url, pattern) {
  const [path, qs] = url.split("?");
  const query = {};
  if (qs) qs.split("&").forEach((p) => {
    const [k, v] = p.split("=");
    query[decodeURIComponent(k)] = decodeURIComponent(v || "");
  });
  const patternParts = pattern.split("/");
  const pathParts = path.split("/");
  const params = {};
  if (patternParts.length !== pathParts.length) return { match: false, params, query };
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return { match: false, params, query };
    }
  }
  return { match: true, params, query };
}
var _gemService = null;
async function getGemService() {
  if (!_gemService) {
    _gemService = await Promise.resolve().then(() => (init_geminiService(), geminiService_exports));
  }
  return _gemService;
}
async function handler(req, res) {
  const url = req.url || "/";
  const method = req.method || "GET";
  const path = url.split("?")[0];
  try {
    if (path === "/health") {
      return json(res, { status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    }
    if (path === "/api/meters/discover" || path === "/api/meters") {
      const meters = simulatorEngine.getDiscoveredMeters();
      return json(res, meters.map((m2) => ({ device_id: m2.device_id, device_name: m2.device_name, location: m2.location, feeder_type: m2.feeder_type, rated_capacity_kva: m2.rated_capacity_kva })));
    }
    if (path === "/api/meters-all/latest") {
      return json(res, simulatorEngine.getAllLatestReadings());
    }
    if (path === "/api/plant/summary") {
      return json(res, simulatorEngine.getPlantSummary());
    }
    if (path === "/api/incidents" && method === "GET") {
      return json(res, simulatorEngine.getIncidents());
    }
    if (path === "/api/simulation/status" || path === "/api/simulation/state") {
      return json(res, simulatorEngine.getSimulationState());
    }
    const m = matchRoute(path, "/api/meters/:device_id/latest");
    if (m.match) {
      const reading = simulatorEngine.getLatestReading(m.params.device_id);
      if (!reading) return json(res, { error: "Device not Found" }, 404);
      return json(res, reading);
    }
    const h = matchRoute(path, "/api/meters/:device_id/history");
    if (h.match) {
      const range = h.query.range || "24h";
      const meter = METERS.find((mt) => mt.device_id === h.params.device_id);
      const name = meter ? meter.device_name : "Unknown";
      return json(res, { device_id: h.params.device_id, device_name: name, range, data: simulatorEngine.getHistory(h.params.device_id, range) });
    }
    const s = matchRoute(path, "/api/incidents/:id/status");
    if (s.match && method === "POST") {
      const body = await parseBody(req);
      if (!body.status) return json(res, { error: "Status is required" }, 400);
      const updated = simulatorEngine.updateIncidentStatus(s.params.id, body.status, body.author, body.note);
      if (!updated) return json(res, { error: "Incident not found" }, 404);
      return json(res, { success: true, incident: updated, ...updated });
    }
    const d = matchRoute(path, "/api/incidents/:id/diagnose");
    if (d.match && method === "POST") {
      const incidents = simulatorEngine.getIncidents();
      const incident = incidents.find((i) => i.id === d.params.id);
      if (!incident) return json(res, { error: "Incident not found" }, 404);
      try {
        const gem = await getGemService();
        const diagnosis = await gem.generateIncidentDiagnosis(incident.title, incident.category, incident.telemetrySnapshot);
        simulatorEngine.updateIncidentDiagnosis(d.params.id, diagnosis);
        return json(res, { success: true, diagnosis, incident: simulatorEngine.getIncidents().find((i) => i.id === d.params.id) });
      } catch (err) {
        return json(res, { error: "Diagnosis failed", details: err.message }, 500);
      }
    }
    if (path === "/api/simulation/inject-fault" || path === "/api/simulation/fault") {
      if (method !== "POST") return json(res, { error: "Method not allowed" }, 405);
      const body = await parseBody(req);
      const device_id = body.device_id || body.deviceId;
      const fault_type = body.fault_type || body.faultType;
      if (!device_id || !fault_type) return json(res, { error: "device_id and fault_type are required" }, 400);
      simulatorEngine.injectFault(device_id, fault_type);
      return json(res, { success: true, message: `Fault ${fault_type} injected into ${device_id}` });
    }
    if (path === "/api/simulation/clear-faults" || path === "/api/simulation/clear") {
      if (method !== "POST") return json(res, { error: "Method not allowed" }, 405);
      simulatorEngine.clearAllFaults();
      return json(res, { success: true, message: "All simulation faults cleared" });
    }
    if (path === "/api/simulation/toggle-auto" || path === "/api/simulation/auto") {
      if (method !== "POST") return json(res, { error: "Method not allowed" }, 405);
      const body = await parseBody(req);
      const enabled = body.enabled !== void 0 ? body.enabled : true;
      simulatorEngine.setAutoFaults(Boolean(enabled));
      return json(res, { success: true, autoFaultsEnabled: Boolean(enabled) });
    }
    if (path === "/api/ai/copilot" && method === "POST") {
      const body = await parseBody(req);
      if (!body.query) return json(res, { error: "Query is required" }, 400);
      try {
        const gem = await getGemService();
        const reply = await gem.askEnergyCopilot(body.query, { meters: simulatorEngine.getAllLatestReadings(), incidents: simulatorEngine.getIncidents(), plantSummary: simulatorEngine.getPlantSummary() });
        return json(res, { reply });
      } catch (err) {
        return json(res, { error: "AI Copilot failed", details: err.message }, 500);
      }
    }
    return json(res, { error: "Not Found" }, 404);
  } catch (err) {
    console.error("Handler error:", err);
    return json(res, { error: "Internal Server Error", details: err.message }, 500);
  }
}
