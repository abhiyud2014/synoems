import { GoogleGenAI, Type } from '@google/genai';
import { AIDiagnosis, KiotMeterReading } from './types';

let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

/**
 * Generate AI-Driven Root Cause Analysis and Action Steps for an Anomaly
 */
export async function generateIncidentDiagnosis(
  incidentTitle: string,
  incidentCategory: string,
  meterReading: KiotMeterReading
): Promise<AIDiagnosis> {
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
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are an expert power system diagnostic engineer for heavy industrial manufacturing facilities. Provide strictly verified electrical engineering insights, mentioning specific mitigation devices like APFC capacitor banks, active harmonic filters (AHF), detuned reactors, and CT/PT inspection.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              rootCause: {
                type: Type.STRING,
                description: 'Clear, technically precise physical explanation of what caused the anomaly.',
              },
              impactAnalysis: {
                type: Type.STRING,
                description: 'Financial, equipment lifespan, tariff penalty, and transformer thermal impact.',
              },
              actionSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3-4 actionable sequential steps for plant engineers to resolve the issue.',
              },
              equipmentRisk: {
                type: Type.STRING,
                enum: ['CRITICAL', 'MODERATE', 'LOW'],
                description: 'Severity risk to plant machinery and switchgear.',
              },
              estimatedCostPenaltyPerHour: {
                type: Type.STRING,
                description: 'Estimated financial loss or utility penalty per hour.',
              },
              recommendedHardwareSetting: {
                type: Type.STRING,
                description: 'Specific hardware knob or switchgear setting (e.g. APFC stage +25kVAR).',
              },
            },
            required: ['rootCause', 'impactAnalysis', 'actionSteps', 'equipmentRisk'],
          },
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        return {
          ...parsed,
          generatedAt: new Date().toISOString(),
        };
      }
    } catch (err) {
      console.warn('Gemini API diagnosis call failed, falling back to rule-based engine:', err);
    }
  }

  // Fallback domain-expert diagnostic generator
  return generateRuleBasedDiagnosis(incidentTitle, incidentCategory, meterReading);
}

/**
 * Domain Expert Rule-Based Diagnostic Generator for Offline or Instant Mode
 */
function generateRuleBasedDiagnosis(
  title: string,
  category: string,
  reading: KiotMeterReading
): AIDiagnosis {
  const isHighThd = reading.electrical.THD_I_R > 5 || reading.electrical.THD_V_R > 5;
  const isLowPf = reading.electrical.PF < 0.85;
  const isOffline = reading.status.online === 0 || reading.status.last_update_seconds > 120;
  const isSentinel = reading.electrical.PF === 9999 || reading.electrical.kW === 999999;

  if (isOffline) {
    return {
      rootCause: `Gateway communication timeout (${reading.status.last_update_seconds}s elapsed without Modbus polling update). Possible RS-485 loop disconnect or auxiliary power failure.`,
      impactAnalysis: 'Telemetry blackout impedes real-time maximum demand tracking and time-of-day tariff rate monitoring.',
      actionSteps: [
        'Check 24V DC auxiliary PSU on KIOT Gateway terminal A+/B-.',
        'Verify RS-485 bus terminating resistor (120 ohm) integrity.',
        'Ping IoT Gateway IP and cycle power if DHCP lease dropped.',
      ],
      equipmentRisk: 'CRITICAL',
      estimatedCostPenaltyPerHour: '$0.00 (Blackout Risk)',
      recommendedHardwareSetting: 'Check Gateway DIP switches & RS-485 Baud Rate (9600 8-N-1)',
      generatedAt: new Date().toISOString(),
    };
  }

  if (isSentinel) {
    return {
      rootCause: `Meter Modbus register sentinel 9999/999999 returned. This indicates disconnected CT secondary terminals or out-of-bounds register scaling overflow.`,
      impactAnalysis: 'Corrupted energy telemetry invalidates cumulative kWh accounting and false-trips automated billing logs.',
      actionSteps: [
        'Inspect CT shorting blocks on R, Y, B phases in meter cubicle.',
        'Check PT secondary voltage fuses (FU1-FU3).',
        'Verify Modbus register map offset address configuration in KIOT gateway.',
      ],
      equipmentRisk: 'MODERATE',
      estimatedCostPenaltyPerHour: 'Billing Data Invalidation',
      recommendedHardwareSetting: 'Verify CT primary:secondary ratio (e.g., 200:5A)',
      generatedAt: new Date().toISOString(),
    };
  }

  if (isHighThd) {
    const maxThd = Math.max(reading.electrical.THD_I_R, reading.electrical.THD_I_Y, reading.electrical.THD_I_B);
    return {
      rootCause: `High non-linear harmonic distortion (${maxThd.toFixed(1)}% THD_I) caused by unfiltered 6-pulse / 12-pulse variable frequency drives (VFDs) and induction heaters.`,
      impactAnalysis: `Generates severe eddy current heating in step-down distribution transformers, neutral conductor overheating, and nuisance tripping of sensitive electronic relays.`,
      actionSteps: [
        'Energize Active Harmonic Filter (AHF-01) on Feeder Bus.',
        'Verify tuned 5th & 7th harmonic passive LC trap filter contactors.',
        'Schedule thermographic IR scan on main busbar joints and neutral links.',
      ],
      equipmentRisk: 'CRITICAL',
      estimatedCostPenaltyPerHour: `$24.50 / hr (Transformer Thermal Loss & K-Factor Derating)`,
      recommendedHardwareSetting: 'Engage AHF-01 Active Harmonic Filter in Selective Harmonic Compensation Mode',
      generatedAt: new Date().toISOString(),
    };
  }

  if (isLowPf) {
    return {
      rootCause: `Power factor dropped to ${reading.electrical.PF} (lagging). Highly inductive reactive power draw of ${reading.electrical.kVAR} kVAR exceeds baseline compensation.`,
      impactAnalysis: `Discom utility low power factor penalty tariff applies (typically 2.0% - 3.5% billing surcharge when PF < 0.85), plus increased I²R heating losses in plant feeder cables.`,
      actionSteps: [
        'Engage APFC Capacitor Bank Stage 2 (+25 kVAR) or Stage 3 (+50 kVAR).',
        'Inspect APFC automatic stepping relay controller for stuck contactors.',
        'Verify power factor capacitors for capacitance degradation with microfarad meter.',
      ],
      equipmentRisk: 'MODERATE',
      estimatedCostPenaltyPerHour: `$18.20 / hr (Utility Surcharge & kVA Demand Penalty)`,
      recommendedHardwareSetting: 'Switch APFC Controller to Automatic Hunting Mode (Target PF: 0.985)',
      generatedAt: new Date().toISOString(),
    };
  }

  return {
    rootCause: `Telemetry variations observed within normal operating parameters for ${reading.device_name}.`,
    impactAnalysis: 'System operating within nominal industrial grid limits.',
    actionSteps: [
      'Continue standard routine monitoring.',
      'Maintain periodic preventive maintenance logs.',
    ],
    equipmentRisk: 'LOW',
    estimatedCostPenaltyPerHour: '$0.00 / hr',
    recommendedHardwareSetting: 'Standard Nominal Configuration',
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Energy Copilot Conversational Assistant
 */
export async function askEnergyCopilot(
  query: string,
  contextData: {
    meters: KiotMeterReading[];
    incidents: any[];
    plantSummary: any;
  }
): Promise<string> {
  const ai = getGenAI();

  if (ai) {
    try {
      const systemContext = `You are the KIOT Industrial Energy AI Copilot. You are an expert electrical engineer, power quality specialist, and plant energy manager.
Current Plant Summary:
- Total Active Power: ${contextData.plantSummary.totalActivePowerKw} kW
- Total Apparent Power: ${contextData.plantSummary.totalApparentPowerKva} kVA
- Total Reactive Power: ${contextData.plantSummary.totalReactivePowerKvar} kVAR
- Average Plant PF: ${contextData.plantSummary.averagePowerFactor}
- Active Incidents: ${contextData.incidents.filter((i) => i.status !== 'RESOLVED').length}
- Online Meters: ${contextData.plantSummary.onlineMetersCount} / ${contextData.plantSummary.totalMetersCount}

Meter Telemetry Highlights:
${contextData.meters
  .map(
    (m) =>
      `• ${m.device_name} (${m.device_id}): kW=${m.electrical.kW}, PF=${m.electrical.PF}, THD_V=${m.electrical.THD_V_R}%, THD_I=${m.electrical.THD_I_R}%, Status=${m.status.online === 1 ? 'Online' : 'Fault/Offline'}`
  )
  .join('\n')}

Active Incidents:
${contextData.incidents
  .filter((i) => i.status !== 'RESOLVED')
  .map((i) => `• [${i.severity}] ${i.title} (Assigned to: ${i.assignedTo}, Status: ${i.status})`)
  .join('\n')}

Answer the plant operator's question directly, clearly, with concise technical precision and actionable energy efficiency recommendations.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: query,
        config: {
          systemInstruction: systemContext,
        },
      });

      if (response.text) {
        return response.text;
      }
    } catch (err) {
      console.warn('Gemini Copilot chat error:', err);
    }
  }

  // Smart domain-aware fallback response
  return `### KIOT Industrial Energy Copilot (Offline Heuristic Mode)

**Analysis of Plant State:**
- **Active Load**: Total plant load is running at **${contextData.plantSummary.totalActivePowerKw} kW** (${contextData.plantSummary.totalApparentPowerKva} kVA apparent demand).
- **Power Factor**: Plant average is **${contextData.plantSummary.averagePowerFactor}** (${contextData.plantSummary.averagePowerFactor < 0.85 ? '⚠️ Surcharge Risk (< 0.85)' : '✅ Healthy'}).
- **Incident Summary**: There are **${contextData.incidents.filter((i) => i.status !== 'RESOLVED').length} open incidents** requiring operator action.

**Operator Recommendation:**
1. **Power Factor Optimization**: ${contextData.plantSummary.averagePowerFactor < 0.90 ? 'Engage APFC bank stage +50 kVAR to raise average PF above 0.95 and eliminate utility penalties.' : 'Power factor is maintained above penalty threshold.'}
2. **Harmonics Mitigation**: Ensure Active Harmonic Filters (AHF) are active on production lines with high VFD concentration to suppress 5th and 7th harmonic orders below 5% THD.
3. **Peak Shaving**: Consider staggering compressor startup cycles during peak tariff windows (09:00 - 18:00) to lower maximum demand charges.`;
}
