# GMDSS (Global Maritime Distress and Safety System) — OOW Unlimited

## Overview

The Global Maritime Distress and Safety System is an internationally agreed set of safety procedures, types of equipment, and communication protocols used to increase safety and make it easier to rescue distressed ships, boats, and aircraft. GMDSS was implemented under SOLAS Chapter IV and became fully operational on 1 February 1999. For the OOW Unlimited candidate, understanding GMDSS is essential — the OOW must be able to operate all GMDSS equipment on the bridge, send and receive distress alerts, and manage routine safety communications. The MCA examiner will expect candidates to demonstrate practical competence with GMDSS procedures and equipment.

## Key Regulations / Standards

- **SOLAS Chapter IV** — Radiocommunications
- **SOLAS Regulation IV/1-18** — GMDSS requirements
- **ITU Radio Regulations** — International Telecommunication Union
- **IMO Resolution A.801(19)** — Provision of radio services for GMDSS
- **STCW Code A-IV/2** — Mandatory minimum requirements for certification of GMDSS radio operators
- **IMO Resolution MSC.68(68)** — Performance standards for shipborne equipment
- **MCA MSN 1863** — Radio installations and GMDSS requirements

## Core Concepts

### Sea Areas

GMDSS defines four sea areas based on the coverage of shore-based communication facilities:

- **Sea Area A1**: Within range of at least one VHF coast station with continuous DSC alerting capability (typically 20-30 nautical miles from coast).
- **Sea Area A2**: Beyond A1 but within range of at least one MF coast station with continuous DSC alerting capability (typically up to 150 nautical miles).
- **Sea Area A3**: Beyond A2 but within coverage of an Inmarsat geostationary satellite (approximately 70N to 70S latitude).
- **Sea Area A4**: All other areas (polar regions — beyond Inmarsat coverage). Requires HF DSC and/or Iridium capability.

The equipment carried on board depends on the sea area(s) in which the vessel operates.

### Functional Requirements

GMDSS is designed to perform nine communications functions:

1. **Ship-to-shore distress alerting** (by at least two independent means)
2. **Shore-to-ship distress alerting**
3. **Ship-to-ship distress alerting**
4. **SAR coordinating communications** (on-scene)
5. **Locating signals** (SART, AIS-SART, EPIRB)
6. **Maritime Safety Information (MSI)** broadcasts — NAVTEX, SafetyNET
7. **General radiocommunications** (ship-to-shore, shore-to-ship, ship-to-ship)
8. **Bridge-to-bridge communications**
9. **Signals for locating** (homing signals)

### Key Equipment

**VHF (Very High Frequency)**:
- VHF DSC (Digital Selective Calling) on Channel 70 — distress alerting and calling.
- VHF voice on Channel 16 — distress, urgency, safety, and calling.
- Channel 13 — bridge-to-bridge safety of navigation.
- Range: approximately 20-30 nm (line of sight).
- Two VHF sets required on SOLAS vessels (at least one with DSC).

**MF/HF (Medium Frequency / High Frequency)**:
- MF DSC on 2187.5 kHz — distress alerting (A2 area).
- HF DSC on designated frequencies (4, 6, 8, 12, 16 MHz bands) — long-range alerting (A3/A4 areas).
- MF/HF voice and NBDP (Narrow Band Direct Printing — radiotelex).
- HF propagation depends on ionospheric conditions and time of day — frequency selection is critical.

**Inmarsat**:
- Inmarsat-C: Data terminal for distress alerting, SafetyNET MSI reception, and general communications. No voice capability. Mandatory for A3 area vessels (alternative to HF).
- Inmarsat Fleet Broadband / VSAT: Voice, data, and video communications.
- Inmarsat operates via geostationary satellites — coverage limited to approximately 70N-70S.

**NAVTEX**:
- Automatic reception of MSI on 518 kHz (international — English) and 490 kHz (national language).
- Range: approximately 300-400 nm from the transmitting station.
- Receiver automatically prints messages selected by the operator (message categories: navigational warnings, meteorological forecasts, SAR information, ice reports, etc.).
- The OOW must ensure the receiver is set to the correct station identifiers for the area of operation.

**EPIRB (Emergency Position Indicating Radio Beacon)**:
- 406 MHz satellite-detected with GPS position.
- Float-free mounting with HRU (activates at approximately 4m depth).
- Can also be manually activated.
- Must be registered with the flag state — unregistered EPIRBs waste SAR resources.
- Battery life: minimum 48 hours transmission.
- Annual testing required.

**SART (Search and Rescue Transponder)**:
- 9 GHz radar transponder — detected by any X-band (3cm) radar.
- Display on radar: 12 dots in a line (becoming arcs as the searching vessel approaches) at the SART's position.
- Battery life: 96 hours standby, 8 hours continuous transmission when triggered.
- AIS-SART: Alternative — transmits AIS signal with position, displayed on AIS-equipped vessels and ECDIS.
- Minimum 2 SARTs required on vessels of 500 GT and above.

### Distress Communications Procedures

**DSC Distress Alert:**
1. If time permits, select the nature of distress (fire, flooding, collision, grounding, listing, sinking, disabled, abandoning, piracy, MOB, undesignated).
2. Press and hold the distress button (typically covered by a protective flap) for 3-5 seconds.
3. The DSC controller automatically transmits the vessel's MMSI, position (from GPS), time, and nature of distress on Channel 70 (VHF) or 2187.5 kHz (MF) or HF distress frequencies.
4. After DSC alert is sent, switch to Channel 16 (VHF) or 2182 kHz (MF) and broadcast a voice MAYDAY message.

**MAYDAY Voice Procedure:**
MAYDAY MAYDAY MAYDAY — This is [vessel name x3, callsign, MMSI] — MAYDAY [vessel name, callsign] — My position is [lat/long or bearing and distance from known point] — Nature of distress — Assistance required — Number of persons on board — Any other useful information — OVER.

**Urgency (PAN PAN):** For urgent situations not involving immediate danger to the vessel or persons (e.g., medical emergency, loss of steering). Broadcast on Channel 16 / 2182 kHz.

**Safety (SECURITE):** For navigation or meteorological warnings. Broadcast on Channel 16 / 2182 kHz, followed by the message on a working frequency.

### False Alerts

False distress alerts waste SAR resources and must be cancelled immediately:
- Cancel on the same frequency/system used to send the alert.
- Inform the nearest coast station / MRCC.
- Complete a false alert report form.
- GMDSS equipment should have appropriate safeguards to prevent accidental activation.

## Common Exam Questions

1. Describe the equipment your vessel carries for GMDSS and the sea areas it is equipped for.
2. Walk me through the procedure for sending a DSC distress alert and follow-up voice message.
3. What is the difference between a SART and an AIS-SART?
4. You accidentally send a DSC distress alert. What do you do?
5. Explain the NAVTEX system and how you would set it up for a coastal passage.
6. What are the nine functional requirements of GMDSS?
7. How does GMDSS equipment differ between Sea Area A1 and Sea Area A3?

## Key Points to Remember

- **Channel 70 is for DSC ONLY** — never use it for voice communications.
- **Channel 16 is continuously monitored** for voice distress and safety communications.
- **Two independent means of distress alerting** must be available — e.g., VHF DSC + EPIRB, or Inmarsat-C + MF DSC.
- **EPIRB registration**: An unregistered EPIRB cannot be linked to a vessel — SAR authorities cannot identify the ship. Registration is mandatory and must be kept up to date.
- **GMDSS radio log**: All distress, urgency, and safety communications must be logged. Equipment tests and maintenance also recorded.
- **Annual testing of EPIRB and SART**: Required by SOLAS and verified at PSC inspections.
- **DSC self-test**: Run daily. Do NOT transmit a live distress test — use the built-in test mode.

## Examiner Focus Areas

Examiners expect the OOW candidate to demonstrate practical competence with GMDSS equipment. They will ask candidates to describe the distress alert procedure step by step, explain how to cancel a false alert, and discuss the equipment carried for different sea areas. Knowledge of NAVTEX and MSI is frequently tested — the examiner may ask what message types are available and how to select them. Candidates must understand the difference between DSC alerting and voice procedures, and know the correct frequencies for each. The examiner may also explore the candidate's understanding of EPIRB and SART operation, including battery life, testing procedures, and the HRU mechanism.
