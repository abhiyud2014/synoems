# KIOT Industrial Energy Management System (EMS) & SCADA Web Application

An AI-enabled Industrial Energy Management System (EMS) and Power Quality Monitoring Application built to strictly adhere to the **KIOT Energy Monitoring System API Schema**.

---

## ⚡ Key Capabilities

### 1. Synthetic Telemetry Engine (`server/kiotSimulator.ts`)
- **Strict KIOT Schema Adherence**: Mimics Modbus RTU / TCP gateway data structures across multiple 3-phase plant meters (`MAIN_PANEL_001`, `HVAC_CHILLER_PLANT`, `PRODUCTION_LINE_01`, `SOLAR_INVERTER_01`, `ARC_FURNACE_01`).
- **Comprehensive Electrical Matrix**:
  - **Voltages**: Phase Voltages ($V_{RN}, V_{YN}, V_{BN}$) and Line-to-Line Voltages ($V_{RY}, V_{YB}, V_{BR}$).
  - **Currents**: Phase Currents ($I_R, I_Y, I_B$) and Neutral Vector ($I_N$).
  - **Powers**: Active Power ($kW$), Apparent Power ($kVA$), Reactive Power ($kVAR$), Cumulative Energy ($kWh$).
  - **Power Quality**: 3-Phase Power Factor ($PF$), Voltage Harmonic Distortion ($THD\_V\_R, THD\_V\_Y, THD\_V\_B$), Current Harmonic Distortion ($THD\_I\_R, THD\_I\_Y, THD\_I\_B$), and Grid Frequency ($Freq$ Hz).
- **Gateway Status Code Enforcement**:
  - `0`: Disconnected (`last_update_seconds > 120s`)
  - `1`: Connected / Valid Parameters
  - `2`: Partial / Invalid Parameters
  - `3`: Waiting on Data (Bootstrapping)
- **Modbus Sentinel Detection**: Explicit detection of corrupted registers returning `9999` or `999999`.

### 2. Real-Time SCADA Operations Dashboard
- **Gauges & Visualizers**:
  - Custom SVG Power Factor Dial highlighting statutory penalty zone ($< 0.85$) and optimal zone ($> 0.95$).
  - IEEE-519 Harmonics Bar Gauges with statutory 5% limit guidelines.
  - 3-Phase Phasor Diagram showing current vector balance and neutral return current $I_N$.
- **Raw JSON Inspector**: Direct inspection and clipboard copying of the live `GET /api/meters/{device_id}/latest` REST payload.
- **Configurable Polling Loop**: 2s, 5s, 10s, 30s auto-refresh intervals with live pause/resume.

### 3. Historical Data Analytics & Historian
- **Interactive Recharts Visualizations**:
  - **Demand Profile**: Active Power ($kW$) vs Apparent Power ($kVA$) vs Reactive Power ($kVAR$).
  - **Harmonics Distortion Trends**: Phase-by-phase $THD_I$ and $THD_V$ tracking with 5% IEEE-519 limit reference line.
  - **Cumulative Energy & Cost**: $kWh$ energy consumption profile with tariff cost estimations.
  - **Phase Balance**: Phase Currents ($I_R, I_Y, I_B$) vs Neutral Current ($I_N$).
- **CSV Data Export**: Download raw time-series records for reporting and audits.

### 4. Automated Incident Management & Kanban
- **Dynamic SLA Timers**: Live countdown timers with SLA breach flags for overdue incidents.
- **Intelligent Role Auto-Assignment**:
  - Senior Electrical Engineer (THD / Power Quality)
  - IoT Field Technician (Gateway Offline / Sentinel Faults)
  - Plant Energy Manager (Excessive kW Demand / Energy Surge)
  - Substation Operator (Low Power Factor & Reactive Draw)
- **Pipeline Workflow**: `New Alerts` ➔ `In Progress` ➔ `Pending Verification` ➔ `Resolved`.
- **Failure Snapshot**: Millisecond telemetry snapshot at the exact moment of threshold breach.

### 5. AI Energy Copilot & Diagnostics (`server/geminiService.ts`)
- **Server-Side Gemini 3.7 Flash Engine**: Analyzes failure conditions, evaluates root causes, assesses grid/equipment risks, and provides actionable remediation steps.
- **APFC Capacitor Sizing Calculator**: Calculates exact reactive compensation $Q_{cap} (kVAR) = P \times (\tan\phi_1 - \tan\phi_2)$ and stages capacitor banks.
- **Conversational Assistant**: Ground-truth Q&A on IEEE-519 harmonics, transformer derating, and peak demand charge reduction.

### 6. Fault Injection & Anomaly Simulation Lab
- Interactive control panel to inject anomalies in real time:
  - Low Power Factor ($PF = 0.74$)
  - Non-linear VFD Current Harmonics ($THD_I = 16.4\%$)
  - Busbar Voltage Distortion ($THD_V = 7.8\%$)
  - Severe Phase Imbalance ($I_R \gg I_Y, I_B$)
  - Gateway Disconnect ($online = 0, \Delta t > 120s$)
  - Modbus Register Corruption ($9999 / 999999$)
  - Voltage Sags & Spikes

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Recharts, Lucide Icons
- **Backend**: Express.js (Port 3000), Node.js
- **AI Integration**: Google Gen AI SDK (`@google/genai`), Gemini 3.7 Flash
- **Build System**: Vite, tsx, esbuild

---

## 🚀 Local Development & Execution

```bash
# 1. Install dependencies
npm install

# 2. Start full-stack development server (Express + Vite on Port 3000)
npm run dev

# 3. Production Build
npm run build

# 4. Production Launch
npm start
```
