#!/usr/bin/env python3
"""
Daily Brainrot YouTube Shorts Generator
"""

import os, json, random, subprocess, time, sys
from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

FILES_DIR = os.path.join(os.getcwd(), "files")
os.makedirs(FILES_DIR, exist_ok=True)

THEMES = [
    {
        "name": "skibidi_chaos",
        "desc": "Gen-Z brainrot slang chaos — skibidi, rizz, gyatt, sigma, ohio, no cap, bussin, slay",
        "visual": "chaotic colorful 3D cartoon characters dancing wildly, glitch digital effects, neon colors, meme faces exploding on screen, viral internet aesthetic, hyper-energetic motion"
    },
    {
        "name": "wild_facts",
        "desc": "Mind-blowing insane random facts that sound fake but are true — wild science, nature, history",
        "visual": "fast-paced surreal nature scenes, exploding stars in space, deep sea bioluminescent creatures, extreme close-ups, chaotic montage energy, vivid supersaturated colors"
    },
    {
        "name": "meme_narration",
        "desc": "Narrating internet memes and viral moments with hyper-dramatic commentary",
        "visual": "retro internet aesthetic, pixel art animations, rage comic art style, chaotic pop-art explosions, glitching old school computer screen vibes"
    },
    {
        "name": "absurd_story",
        "desc": "An absurd short AI-generated story with wild plot twists — completely unhinged and random",
        "visual": "surreal dreamlike animation, melting reality distortion, impossible geometry, neon dreamscape with random objects flying everywhere, Dali meets TikTok aesthetic"
    }
]

# ── Step 1: Pick random theme ──────────────────────────────────────────────
theme = random.choice(THEMES)
print(f"🎲 Theme selected: {theme['name']}")

# ── Step 2: Generate brainrot script ──────────────────────────────────────
script_prompt = f"""You are the ultimate brainrot content creator for YouTube Shorts.
Generate a hyper-energetic, chaotic 30-second video script (around 75-90 words spoken fast).
Theme: {theme['desc']}

Rules:
- Start with an attention-grabbing hook in the first 3 words
- Use internet slang, meme references, absurd humor
- Fast-paced, punchy sentences
- Must be WILDLY entertaining and shareable
- End with a call to action like "FOLLOW for more!" or "Subscribe NOW!"
- NO asterisks, NO stage directions, ONLY the spoken words
- Make it feel unhinged but catchy

Output ONLY the spoken script text, nothing else."""

response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents=script_prompt
)
script_text = response.text.strip()
print(f"\n📝 Script:\n{script_text}\n")

# ── Step 3: Generate title & description ──────────────────────────────────
meta_prompt = f"""Create YouTube Shorts metadata for this brainrot video.
Script: {script_text[:150]}
Theme: {theme['name']}

Return ONLY valid JSON with these exact keys:
{{
  "title": "catchy title under 60 chars with emojis",
  "description": "fun description with hashtags, 150 chars max",
  "tags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8"]
}}"""

meta_resp = client.models.generate_content(
    model="gemini-2.0-flash",
    contents=meta_prompt
)
meta_text = meta_resp.text.strip()
# clean markdown fences
if "```" in meta_text:
    meta_text = meta_text.split("```")[1]
    if meta_text.startswith("json"):
        meta_text = meta_text[4:]
meta = json.loads(meta_text.strip())
print(f"📌 Title: {meta['title']}")

# ── Step 4: Generate TTS voiceover ────────────────────────────────────────
print("🎙️ Generating voiceover...")
voiced_text = script_text
tts_response = client.models.generate_content(
    model="gemini-2.5-flash-preview-tts",
    contents=voiced_text,
    config=types.GenerateContentConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Fenrir")
            )
        ),
    ),
)

audio_path = os.path.join(FILES_DIR, "voiceover.wav")
audio_data = tts_response.candidates[0].content.parts[0].inline_data.data
# audio_data is base64 encoded bytes from the API
import base64
decoded_audio = base64.b64decode(audio_data) if isinstance(audio_data, str) else audio_data
with open(audio_path, "wb") as f:
    f.write(decoded_audio)
print(f"✅ Voiceover saved ({len(decoded_audio)} bytes)")

# ── Step 5: Generate video with Veo ──────────────────────────────────────
video_prompt_text = (
    f"YouTube Shorts brainrot video, portrait 9:16 format, ultra-fast chaotic energy, "
    f"{theme['visual']}, loud saturated colors, viral TikTok meme aesthetic, "
    f"pure visual chaos with high-energy movement, no text overlays"
)

print("🎬 Generating Veo video clip...")
operation = client.models.generate_videos(
    model="veo-3.0-fast-generate-001",
    prompt=video_prompt_text,
    config=types.GenerateVideoConfig(
        aspect_ratio="9:16",
        number_of_videos=1,
        duration_seconds=8,
    ),
)

# Poll until done
poll_count = 0
while not operation.done:
    time.sleep(15)
    operation = client.operations.get(operation)
    poll_count += 1
    print(f"  ⏳ Waiting... ({poll_count * 15}s elapsed)")

raw_video_path = os.path.join(FILES_DIR, "raw_clip.mp4")
operation.result.generated_videos[0].video.save(raw_video_path)
print(f"✅ Raw video saved: {raw_video_path}")

# ── Step 6: Get audio duration ────────────────────────────────────────────
result = subprocess.run(
    ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", audio_path],
    capture_output=True, text=True
)
audio_info = json.loads(result.stdout)
audio_duration = float(audio_info["streams"][0]["duration"])
print(f"⏱️ Audio duration: {audio_duration:.1f}s")

# ── Step 7: Loop video + merge audio ─────────────────────────────────────
final_video_path = os.path.join(FILES_DIR, "final_short.mp4")
loops_needed = max(1, int(audio_duration / 8) + 2)

print(f"🔗 Merging video + audio (looping {loops_needed}x)...")
subprocess.run([
    "ffmpeg", "-y",
    "-stream_loop", str(loops_needed), "-i", raw_video_path,
    "-i", audio_path,
    "-t", str(audio_duration),
    "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1",
    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
    "-c:a", "aac", "-b:a", "192k",
    "-movflags", "+faststart",
    final_video_path
], check=True, capture_output=True)
print(f"✅ Final video ready: {final_video_path}")

# ── Step 8: Upload to YouTube ─────────────────────────────────────────────
print("📤 Uploading to YouTube...")
upload_args = json.dumps({
    "title": meta["title"],
    "description": meta["description"] + "\n\n#Shorts #Brainrot #Viral #AI #fyp",
    "filePath": final_video_path,
    "privacyStatus": "public",
    "tags": meta["tags"] + ["Shorts", "brainrot", "viral", "fyp", "AI"]
})

upload_result = subprocess.run(
    ["node", "/home/user/servers/youtube/run.mjs", "uploadVideo", upload_args],
    capture_output=True, text=True
)

if upload_result.returncode != 0:
    print(f"❌ Upload error: {upload_result.stderr}", file=sys.stderr)
    # Still output partial results for the session
    print(json.dumps({
        "video_url": "upload_failed",
        "title": meta["title"],
        "theme": theme["name"],
        "audio_duration": round(audio_duration, 1),
        "error": upload_result.stderr[:200]
    }))
    sys.exit(1)

upload_data = json.loads(upload_result.stdout)
video_id = upload_data.get("id", "unknown")
video_url = f"https://www.youtube.com/shorts/{video_id}"
print(f"\n🚀 POSTED! {video_url}")

# Emit file marker
print(json.dumps({
    "type": "generated_file",
    "path": final_video_path,
    "name": "final_short.mp4"
}))

# Session data (last JSON line)
print(json.dumps({
    "video_url": video_url,
    "title": meta["title"],
    "theme": theme["name"],
    "audio_duration": round(audio_duration, 1),
    "script_preview": script_text[:120] + "..."
}))
