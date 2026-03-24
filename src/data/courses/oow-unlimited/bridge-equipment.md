# Bridge Equipment — OOW Unlimited

## Overview

An OOW must be thoroughly familiar with the operation, capabilities, and limitations of all bridge equipment. The MCA examiner will test the candidate's ability to use radar, ARPA, ECDIS, AIS, echo sounders, gyro and magnetic compasses, and other navigational aids effectively and safely. Critically, the examiner will probe the candidate's understanding of equipment limitations — blind reliance on any single piece of equipment is a significant weakness. The competent OOW uses bridge equipment as tools within a broader system of safe navigation, cross-checking between sources and maintaining situational awareness.

## Key Regulations / Standards

- **SOLAS Regulation V/19** — Carriage requirements for shipborne navigational systems
- **IMO Resolution MSC.232(82)** — Revised performance standards for ECDIS
- **IMO Resolution MSC.192(79)** — Revised performance standards for radar
- **IMO Resolution A.694(17)** — Guidelines for ARPA performance standards
- **IMO Resolution MSC.74(69)** — Performance standards for AIS
- **IMO Resolution A.424(XI)** — Performance standards for gyro compasses
- **IMO Resolution MSC.256(84)** — BNWAS performance standards
- **SOLAS Regulation V/19.2** — Equipment list by vessel tonnage
- **IMO Resolution MSC.191(79)** — Performance standards for voyage data recorders (VDR)

## Core Concepts

### Radar and ARPA

**Radar fundamentals:**
- Two radar sets required on SOLAS vessels of 3,000 GT and above: one operating on X-band (3cm / 9 GHz) and one on S-band (10cm / 3 GHz).
- X-band: Better target discrimination, detects SART responses, but more affected by rain clutter.
- S-band: Better performance in rain and sea clutter, but lower resolution.

**Controls the OOW must master:**
- **Gain**: Adjusts receiver sensitivity. Too much gain creates noise; too little misses weak targets.
- **Sea clutter (STC — Sensitivity Time Control)**: Reduces returns from waves near the ship. Should be adjusted carefully — over-use can suppress small targets close to the vessel.
- **Rain clutter (FTC — Fast Time Constant)**: Reduces returns from precipitation. Again, over-use can suppress genuine targets.
- **Tuning**: Ensures the receiver is matched to the transmitter frequency. Most modern radars auto-tune, but manual tuning should be checked.
- **Brilliance and contrast**: For optimal display visibility.
- **Range scale selection**: Use appropriate range scales — a long-range scale for early detection and a shorter range for close-quarters monitoring. The OOW should regularly change range scales.

**ARPA (Automatic Radar Plotting Aid):**
- Acquires and tracks targets, computing CPA (Closest Point of Approach) and TCPA (Time to CPA), plus target course and speed.
- **CPA alarm**: Set to the vessel's CPA policy (typically 1-2 nm in open waters, adjusted for traffic density).
- **Guard zones**: Alarm triggered when a target enters a defined area.
- **Limitations**: ARPA calculations are based on a steady-state model. Targets that alter course or speed will have inaccurate vectors until the tracker settles (typically 1-3 minutes). Target swap (tracking jumps to a different target) can occur in congested waters. Radar shadow zones, rain clutter, and sea clutter can all degrade ARPA performance.
- **Trial manoeuvre**: Allows the OOW to simulate the effect of a course or speed change on all tracked targets before executing it. Essential tool for collision avoidance.

### ECDIS (Electronic Chart Display and Information System)

**Mandatory carriage** for all SOLAS vessels (phased in from 2012-2018).

**Key features and settings:**
- **Safety contour**: The depth contour that defines the boundary between safe and unsafe water for the vessel. Set based on the vessel's draught plus squat plus UKC policy.
- **Safety depth**: Individual soundings less than this value are highlighted. Set to the vessel's draught plus required UKC.
- **Anti-grounding alarm**: Triggers when the vessel approaches the safety contour. Must be properly configured.
- **Route checking**: ECDIS checks planned routes against safety contours, hazards, and restricted areas. All alerts must be reviewed and acknowledged during passage planning.

**Limitations the OOW must understand:**
- ECDIS is only as good as the underlying ENC data. Some areas have poor survey data (ZOC — Zone of Confidence — categories A1, A2, B, C, D, and U indicate survey quality).
- Datum issues: ENCs use WGS 84, but older surveys may have been conducted on different datums. Some charts carry a datum shift warning.
- Over-scaling: Zooming in beyond the ENC's compilation scale gives a false sense of precision.
- ECDIS requires regular software and ENC updates.
- The OOW must not become fixated on the ECDIS display at the expense of looking out the window.

**Backup:** Either a second independent ECDIS or an appropriate portfolio of corrected paper charts.

### AIS (Automatic Identification System)

- Mandatory on all SOLAS vessels of 300 GT and above on international voyages, and all passenger ships.
- **Broadcasts**: MMSI, vessel name, position, COG, SOG, heading, rate of turn, navigational status, vessel type and dimensions, draught, destination, ETA.
- **AIS is NOT a collision avoidance tool.** It supplements radar but does not replace it. Not all vessels carry AIS (fishing boats, pleasure craft, warships may not). AIS positions may be inaccurate if the vessel's GPS is poorly calibrated. AIS can be switched off.
- **AIS SART and AIS MOB devices**: Transmit position for SAR purposes.

### Gyro Compass and Magnetic Compass

**Gyro compass:**
- North-seeking gyroscope — finds true north independently. Subject to errors: latitude error, speed error, course/speed change error (settling time).
- Must be checked regularly against celestial observations, transit bearings, or GPS bearing comparisons.
- Repeaters on the bridge wings, steering position, and radar/ECDIS.

**Magnetic compass:**
- Independent of electrical power — the ultimate backup for heading reference.
- Subject to variation (geographic) and deviation (vessel-caused).
- Deviation card must be current (checked by compass adjuster, typically annually or after significant structural changes).
- The OOW should compare gyro and magnetic compass headings at regular intervals and record any discrepancy.

### Echo Sounder

- Measures depth beneath the keel (or below the transducer — know which your vessel is set to).
- Limitations: False echoes from aeration, thermoclines, or biological layers. Side echoes in shoal waters. Fish or kelp can give misleading readings.
- The OOW must ensure the echo sounder is operational and monitored when navigating in shallow or restricted waters.

### BNWAS (Bridge Navigational Watch Alarm System)

- Mandatory on all SOLAS vessels (phased in from 2011).
- Detects operator incapacity by monitoring bridge activity. If no activity detected within a set period (typically 3-12 minutes), an alarm sequence begins: visual alarm on bridge, then audible alarm on bridge, then alarm to Master/backup officer.
- Must NOT be disabled during normal watchkeeping operations.

### Voyage Data Recorder (VDR)

- Records bridge audio, radar image, ECDIS data, AIS, depth, engine orders, alarms, rudder angle, wind speed/direction, and other parameters.
- Data capsule is float-free (similar to an aircraft "black box").
- Records on a continuous 12-hour loop. Data is preserved after an incident.
- Mandatory on passenger ships and cargo ships of 3,000 GT and above (simplified VDR for cargo ships of 3,000 GT and above built before July 2002).

## Common Exam Questions

1. What are the limitations of ARPA and how do you account for them?
2. Describe how you would set up ECDIS safety settings for a coastal passage.
3. What is the difference between X-band and S-band radar, and when would you use each?
4. Your gyro compass fails. What actions do you take?
5. Explain what Zone of Confidence means on an ENC and how it affects your navigation.
6. What is AIS and what are its limitations as a collision avoidance tool?
7. How does the BNWAS work, and when should it be operational?
8. Describe the ARPA trial manoeuvre function and when you would use it.

## Key Points to Remember

- **Radar sea clutter suppression is the most dangerous control** — over-suppression will hide small targets (yachts, buoys, ice) close to the vessel. Adjust carefully and check.
- **ECDIS over-scaling gives false confidence** — always check the data quality (ZOC) and compilation scale before trusting charted detail.
- **AIS is a supplement, not a replacement for radar.** Some vessels do not carry it, some switch it off, and some have incorrect data. Never assume AIS gives you the complete traffic picture.
- **Gyro error check**: At least once per watch, compare gyro heading with magnetic compass (applying variation and deviation) or use a transit bearing.
- **ARPA vectors lag reality** — when a target alters course, the ARPA vector will initially be wrong. Maintain visual and radar watch, not just ARPA watch.
- **The echo sounder measures depth at the transducer location**, not ahead of the vessel. In shoaling water, you may ground before the echo sounder shows shallow water.

## Examiner Focus Areas

Examiners will test practical operating knowledge by asking candidates to describe how they set up and use specific equipment. They are particularly interested in radar/ARPA limitations, ECDIS configuration and limitations, and the candidate's ability to identify when equipment data may be unreliable. Candidates who can describe a systematic approach to cross-checking equipment (comparing GPS with radar fixes, gyro with magnetic, echo sounder with charted depth) will score well. The examiner may present failure scenarios (gyro failure, GPS loss, ECDIS blackout) and expect the candidate to articulate a safe response using backup systems.
