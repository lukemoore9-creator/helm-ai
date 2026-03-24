# Stability — OOW Unlimited

## Overview

Ship stability is a fundamental area of knowledge for OOW Unlimited candidates. An officer must understand the principles of hydrostatics and stability, be able to use the ship's stability data to assess the vessel's condition, and recognise situations where stability may be compromised. The MCA examiner expects candidates to demonstrate both theoretical understanding and the practical ability to calculate stability parameters, assess loading conditions, and take corrective action when stability is at risk. Poor stability assessment has been a contributing factor in numerous maritime casualties.

## Key Regulations / Standards

- **SOLAS Chapter II-1** — Subdivision, stability, and related requirements
- **IMO International Code on Intact Stability, 2008 (2008 IS Code)** — MSC.267(85)
- **IMO Resolution MSC.216(82)** — Amendments on damage stability
- **International Load Line Convention 1966** — Protocol of 1988
- **MARPOL Annex I** — Damage stability requirements for oil tankers
- **MCA MSN 1752** — Stability information booklet requirements
- **Grain Code (International Code for the Safe Carriage of Grain in Bulk)**

## Core Concepts

### Basic Stability Principles

- **Centre of Gravity (G)**: The point through which the total weight of the vessel acts vertically downward. Its position depends on the distribution of weights aboard.
- **Centre of Buoyancy (B)**: The geometric centre of the underwater volume of the hull. Its position changes with the vessel's draught and trim.
- **Metacentre (M)**: The point about which the vessel rotates at small angles of heel. For small angles, M is considered fixed.
- **GM (Metacentric Height)**: The distance from G to M. This is the primary indicator of initial stability.
  - Positive GM: The vessel is stable (G is below M) and will return to upright after being heeled.
  - Negative GM: The vessel is unstable (G is above M) and will loll to one side.
  - GM too large: Excessive stability — the vessel will be "stiff," with a short, sharp rolling period that is uncomfortable and can damage cargo and structure.
  - GM too small: Insufficient stability — the vessel will be "tender," with a long, slow rolling period.

### Key Stability Calculations

- **KM**: Keel to metacentre — obtained from hydrostatic data for the vessel's mean draught.
- **KG**: Keel to centre of gravity — calculated from the loading condition using moments: KG = Total moment / Total displacement.
- **GM = KM - KG**: The fundamental equation for initial stability.
- **GZ (Righting Lever)**: At larger angles of heel, GZ is the horizontal distance between the lines of action of gravity and buoyancy. GZ = GM x sin(theta) for small angles.
- **Free Surface Effect (FSE)**: Liquids in slack tanks reduce effective GM. The virtual rise of G depends on the tank dimensions (proportional to the breadth of the tank cubed) and the density of the liquid. Always calculate FSE and apply the correction: GM(fluid) = GM(solid) - FSE correction.

### Stability Curves (GZ Curve)

- The curve of statical stability (GZ curve) plots righting lever against angle of heel.
- **Key features**: Initial slope (proportional to GM), maximum GZ (typically 30-40 degrees for a cargo ship), angle of vanishing stability, range of positive stability, and area under the curve.
- **2008 IS Code criteria**:
  - Area under GZ curve up to 30 degrees: not less than 0.055 metre-radians
  - Area under GZ curve up to 40 degrees (or angle of flooding if less): not less than 0.09 metre-radians
  - Area between 30 and 40 degrees: not less than 0.03 metre-radians
  - Maximum GZ at an angle of heel not less than 25 degrees
  - Initial GM not less than 0.15m
  - Maximum GZ not less than 0.20m

### Trim

- **Trim**: The difference between the forward and aft draughts. Trim by the stern is normal for most vessels (propeller efficiency, directional stability).
- **LCG and LCB**: Trim depends on the longitudinal positions of the centre of gravity and centre of buoyancy.
- **Moment to Change Trim by 1cm (MCTC or MCT1cm)**: Used to calculate the effect of loading, discharging, or shifting weights on trim.

### The Inclining Experiment

- Required by SOLAS before a new vessel enters service (and after significant modification).
- Purpose: To determine the lightship weight and position of G (KG) for the vessel in the lightship condition.
- Procedure: Known weights are shifted transversely, and the resulting heel is measured using a pendulum. GM is calculated from the tangent of the heel angle, and KG is derived.
- All results are recorded in the stability information booklet.

### Dangerous Conditions

- **Negative GM (Loll)**: The vessel lists to one side and oscillates about the list angle rather than upright. Caused by high KG. Corrective action: Lower G by filling double-bottom tanks (low down), NOT by filling high tanks.
- **Free surface effect**: Even partially-filled tanks low in the ship can be dangerous. Press up or empty tanks where possible.
- **Icing**: Accumulation of ice on the superstructure raises G significantly. Can cause rapid loss of stability. Remove ice as soon as safely possible.
- **Cargo shift**: Grain, ore, or other cargo shifting in heavy weather displaces G off the centreline, causing a permanent list that may worsen.

## Common Exam Questions

1. Define GM and explain its significance to the stability of a vessel.
2. What is free surface effect and how do you minimise it?
3. Your vessel is listing to port with a negative GM. What corrective action would you take?
4. What are the intact stability criteria under the 2008 IS Code?
5. Describe the inclining experiment and its purpose.
6. How would you assess the stability of your vessel before loading cargo?
7. What is the effect of icing on stability, and what action would you take?

## Key Points to Remember

- **GM is not everything**: A vessel can meet GM criteria but still be unsafe if the GZ curve is poor (low range of stability, low maximum GZ). Always check the full GZ curve, not just initial GM.
- **Free surface correction**: Apply to ALL slack tanks, regardless of their position. The correction is additive — multiple slack tanks compound the problem.
- **When correcting a loll**: NEVER shift weights to the high side first. Fill the lowest available tank on the centreline or on the low side. Only then address other tanks.
- **Rolling period and GM**: T = (2 x C x B) / sqrt(GM), where T is the rolling period in seconds, C is a constant (typically 0.78-0.80 for cargo ships), and B is the beam. A tender ship has a long period (>14 seconds is concerning); a stiff ship has a short period.
- **Stability information booklet**: Must be onboard and approved by the Administration. Contains all necessary data for the OOW to assess stability.

## Examiner Focus Areas

Examiners will test both theoretical understanding and practical application. They may present a loading scenario and ask the candidate to calculate GM, or describe a situation (sudden list, heavy weather, cargo shift) and expect corrective actions. Candidates must be able to explain free surface effect clearly and demonstrate how they would use the stability information booklet and loading computer. A common pitfall is candidates who can recite formulae but cannot explain what they mean physically — examiners want to see understanding, not just memorisation. The 2008 IS Code criteria should be known, as examiners will ask what minimum values must be met.
