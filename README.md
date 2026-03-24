# Helm AI

AI-powered voice tutor for maritime oral exam preparation. Users select their exam ticket type, then have a voice conversation with an AI examiner that drills them on real exam questions.

## How It Works

1. **Select** your certificate type (OOW, Master, Yacht Master, etc.)
2. **Speak** to the AI examiner via your microphone
3. **Listen** to the examiner's questions and follow-ups via ElevenLabs TTS
4. **Review** your performance in the post-session report

The examiner adapts to your level, references specific regulations (COLREGS, SOLAS, STCW), and uses real-world scenarios.

## Setup

```bash
# Clone the repo
git clone https://github.com/lukemoore9-creator/helm-ai.git
cd helm-ai

# Install dependencies
npm install

# Create your environment file
cp .env.example .env.local

# Add your API keys to .env.local (see below)

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in Chrome or Edge (required for speech recognition).

## Environment Variables

| Variable | Description | Where to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API key for the AI examiner | [console.anthropic.com](https://console.anthropic.com/) |
| `ELEVENLABS_API_KEY` | Text-to-speech API key | [elevenlabs.io](https://elevenlabs.io/) |
| `ELEVENLABS_VOICE_ID` | Voice ID (default: Rachel) | ElevenLabs voice library |

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 4
- **AI:** Claude Sonnet 4 via Anthropic SDK
- **TTS:** ElevenLabs Multilingual v2
- **STT:** Browser SpeechRecognition API
- **Animation:** Framer Motion
- **Icons:** Lucide React

## Folder Structure

```
src/
  app/                          # Next.js pages and API routes
    page.tsx                    # Landing page
    select/page.tsx             # Exam type selector (14 certificate types)
    session/page.tsx            # Voice exam session (core product)
    report/page.tsx             # Post-session performance report
    api/chat/route.ts           # Claude examiner endpoint
    api/tts/route.ts            # ElevenLabs TTS proxy
    api/report/route.ts         # Session analysis endpoint

  components/
    voice/Orb.tsx               # Animated orb (state-reactive)
    voice/TranscriptPanel.tsx   # Conversation transcript display
    layout/Header.tsx           # Top navigation bar
    landing/Hero.tsx            # Landing page hero section

  lib/
    knowledge-loader.ts         # Reads course files and question banks
    prompts.ts                  # Builds the examiner system prompt
    types.ts                    # Shared TypeScript types
    utils.ts                    # Utility functions
    hooks/
      useVoiceSession.ts        # Main voice interaction hook
      useSpeechRecognition.ts   # Browser speech-to-text
      useAudioPlayer.ts         # Audio playback with Web Audio API

  data/
    courses/<ticket-type>/      # Markdown study content (12 topics each)
    questions/<ticket-type>/    # JSON question banks (12 topics each)
```

## Adding Course Content

Each ticket type can have course content and question banks in `src/data/`.

### Course Content (Markdown)

Create a markdown file in `src/data/courses/<ticket-slug>/`:

```markdown
# COLREGS -- OOW Unlimited

## Overview
Brief intro to the topic...

## Key Regulations
- Rule 5: Lookout
- Rule 7: Risk of Collision
...

## Core Concepts
...
```

### Question Banks (JSON)

Create a JSON file in `src/data/questions/<ticket-slug>/`:

```json
[
  {
    "id": "colregs-001",
    "question": "What actions should be taken when...",
    "key_points": ["Rule 14 applies", "Alter to starboard"],
    "follow_ups": ["What if the other vessel doesn't alter?"],
    "difficulty": "intermediate",
    "examiner_notes": "Candidates often forget..."
  }
]
```

### Topics

Each ticket type can have up to 12 topic files:

`colregs`, `navigation`, `safety`, `solas`, `meteorology`, `stability`, `marpol`, `stcw`, `cargo`, `gmdss`, `bridge-equipment`, `maritime-law`

## Adding a New Ticket Type

1. Add the ticket to the `tickets` array in `src/app/select/page.tsx`
2. Add a display name mapping in `src/lib/knowledge-loader.ts` (`SLUG_MAP`)
3. Create content directories: `src/data/courses/<slug>/` and `src/data/questions/<slug>/`
4. Add topic markdown and JSON files

The examiner will automatically use the knowledge base when available, and fall back to its general maritime knowledge when content hasn't been added yet.

## Browser Requirements

- **Chrome** or **Edge** required (Web Speech API for voice input)
- Microphone access required
- Works on desktop and mobile (Chrome Android)
