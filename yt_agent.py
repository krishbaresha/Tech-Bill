#!/usr/bin/env python3
"""
Daily Brainrot YouTube Shorts Generator
Generates a 30-sec brainrot video and posts to YouTube every evening.
"""

import os, json, random, subprocess, time, sys, tempfile
import google.generativeai as genai

# ── Setup ──────────────────────────────────────────────────────────────────
genai.configure(api_key=os.environ["GEMINI_API_KEY"])
model = genai.GenerativeModel("gemini-2.0-flash")

FILES_DIR = os.path.join(os.getcwd(), "files")
os.makedirs(FILES_DIR, exist_ok=True)

THEMES = [
    {
        "name": "skibidi_chaos",
        "desc": "Gen-Z brainrot slang chaos — skibidi, rizz, gyatt, sigma, ohio, no cap, bussin, slay",
        "visual": "chaotic colorful 3D cartoon characters dancing, glitch effects, neon colors, meme faces, viral internet aesthetic, hyper-energetic"
    },
    {
        "name": "wild_facts",
        "desc": "Mind-blowing insane random facts that sound fake but are true — wild science, nature, history",
        "visual": "fast-paced montage of surreal nature scenes, space explosions, deep sea creatures, extreme close-ups, documentary style but chaotic"
    },
    {
        "name": "meme_narration",
        "desc": "Narrating internet memes and viral moments with hyper-dramatic commentary",
        "visual": "retro internet meme aesthetic, old school 2000s internet vibes, rage comic colors, chaotic pop art, pixel art glitches"
    },
    {
        "name": "absurd_story",
        "desc": "An absurd short AI-generated story with plot twists — completely unhinged and random",
        "visual": "surreal dreamlike animation, melting reality, impossible geometry, neon dreamscape, random objects flying, Dali-meets-TikTok aesthetic"
    }
]

# ── Step 1: Pick random theme ──────────────────────────────────────────────
theme = random.choice(THEMES)
print(f"🎲 Theme: {theme['name']}")

# ── Step 2: Generate brainrot script ──────────────────────────────────────
script_prompt = f"""
You are the ultimate brainrot content creator for YouTube Shorts.
Generate a hyper-energetic, chaotic 30-second video script (around 75-90 words when spoken fast).
Theme: {theme['desc']}

Rules:
- Start with an attention-grabbing hook in the first 3 words
- Use internet slang, meme references, absurd humor
- Fast-paced, punchy sentences
- Must be WILDLY entertaining and shareable
- End with a call to action like "FOLLOW for more!" or "Subscribe NOW!"
- NO asterisks, NO stage directions, ONLY the spoken words
- Make it feel unhinged but catchy

Output ONLY the spoken script text, nothing else.
"""

response = model.generate_content(script_prompt)
script_text = response.text.strip()
print(f"\n📝 Script:\n{script_text}\n")

# ── Step 3: Generate video title & description ─────────────────────────────
meta_prompt = f"""
Create YouTube Shorts metadata for this brainrot video.
Script preview: {script_text[:100]}...
Theme: {theme['name']}

Return ONLY valid JSON with these exact keys:
{{
  "title": "catchy title under 60 chars with emojis",
  "description": "description with hashtags, 150 chars max",
  "tags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8"]
}}
"""
meta_resp = model.generate_content(meta_prompt)
meta_text = meta_resp.text.strip().strip("```json").strip("```").strip()
meta = json.loads(meta_text)
print(f"📌 Title: {meta['title']}")

# ── Step 4: Generate TTS voiceover ────────────────────────────────────────
from google import genai as genai2
from google.genai import types as gtypes

client = genai2.Client(api_key=os.environ["GEMINI_API_KEY"])

voiced_text = f"[enthusiasm] {script_text}"
tts_response = client.models.generate_content(
    model="gemini-2.5-flash-preview-tts",
    contents=voiced_text,
    config=gtypes.GenerateContentConfig(
        response_modalities=["AUDIO"],
        speech_config=gtypes.SpeechConfig(
            voice_config=gtypes.VoiceConfig(
                prebuilt_voice_config=gtypes.PrebuiltVoiceConfig(voice_name="Fenrir")
            )
        ),
    ),
)

audio_path = os.path.join(FILES_DIR, "voiceover.wav")
audio_data = tts_response.candidates[0].content.parts[0].inline_data.data
with open(audio_path, "wb") as f:
    f.write(audio_data)
print(f"🎙️ Voiceover saved: {audio_path}")

# ── Step 5: Generate video with Veo ──────────────────────────────────────
video_prompt_text = f"""
YouTube Shorts brainrot video, portrait 9:16, ultra-fast cuts, {theme['visual']},
loud colors, meme energy, viral TikTok aesthetic, 8 seconds of pure chaos,
no text overlays, high energy movement throughout, trending internet visual style
"""

veo_client = genai2.Client(api_key=os.environ["GEMINI_API_KEY"])
operation = veo_client.models.generate_videos(
    model="veo-3.0-fast-generate-001",
    prompt=video_prompt_text,
    config=gtypes.GenerateVideoConfig(
        aspect_ratio="9:16",
        number_of_videos=1,
        duration_seconds=8,
    ),
)

print("🎬 Generating video (waiting)...")
while not operation.done:
    time.sleep(10)
    operation = veo_client.operations.get(operation)

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

# ── Step 7: Loop video to match audio length, merge ──────────────────────
final_video_path = os.path.join(FILES_DIR, "final_short.mp4")
loops_needed = int(audio_duration / 8) + 2  # enough loops

subprocess.run([
    "ffmpeg", "-y",
    "-stream_loop", str(loops_needed), "-i", raw_video_path,
    "-i", audio_path,
    "-t", str(audio_duration),
    "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
    "-c:a", "aac", "-b:a", "192k",
    "-shortest", "-movflags", "+faststart",
    final_video_path
], check=True)
print(f"🎞️ Final video: {final_video_path}")

# ── Step 8: Upload to YouTube ─────────────────────────────────────────────
upload_args = json.dumps({
    "title": meta["title"],
    "description": meta["description"] + "\n\n#Shorts #Brainrot #Viral",
    "filePath": final_video_path,
    "privacyStatus": "public",
    "tags": meta["tags"] + ["Shorts", "brainrot", "viral", "fyp"]
})

upload_result = subprocess.run(
    ["node", "/home/user/servers/youtube/run.mjs", "uploadVideo", upload_args],
    capture_output=True, text=True
)

print(f"📤 YouTube upload result:\n{upload_result.stdout}")
if upload_result.returncode != 0:
    print(f"❌ Error: {upload_result.stderr}", file=sys.stderr)
    sys.exit(1)

upload_data = json.loads(upload_result.stdout)
video_id = upload_data.get("id", "unknown")
video_url = f"https://www.youtube.com/shorts/{video_id}"

print(f"\n✅ Posted! {video_url}")
print(json.dumps({
    "type": "generated_file",
    "path": final_video_path,
    "name": "final_short.mp4"
}))

# ── Session summary ───────────────────────────────────────────────────────
print(json.dumps({
    "video_url": video_url,
    "title": meta["title"],
    "theme": theme["name"],
    "audio_duration": round(audio_duration, 1)
}))
