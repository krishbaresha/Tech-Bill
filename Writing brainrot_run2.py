#!/usr/bin/env python3
"""
Daily Brainrot YouTube Shorts Generator
"""

import os, json, random, subprocess, time, sys, base64
from google import genai
from google.genai import types

api_key = os.environ.get("GEMINI_API_KEY_") or os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

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

def generate_with_retry(model, contents, max_retries=3):
    for attempt in range(max_retries):
        try:
            return client.models.generate_content(model=model, contents=contents)
        except Exception as e:
            err = str(e)
            if "429" in err or "RESOURCE_EXHAUSTED" in err:
                wait = 30 * (attempt + 1)
                print(f"  Rate limit hit, waiting {wait}s... (attempt {attempt+1}/{max_retries})")
                time.sleep(wait)
            else:
                raise
    raise RuntimeError(f"Failed after {max_retries} retries")

# ── Step 1: Pick random theme ──────────────────────────────────────────────
theme = random.choice(THEMES)
print(f"🎲 Theme selected: {theme['name']}")

# Try models in order of preference
MODELS = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash"]

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

Output ONLY the spoken script text, nothing else."""

script_text = None
used_model = None
for m in MODELS:
    try:
        print(f"  Trying model: {m}")
        resp = client.models.generate_content(model=m, contents=script_prompt)
        script_text = resp.text.strip()
        used_model = m
        break
    except Exception as e:
        print(f"  {m} failed: {str(e)[:80]}")
        time.sleep(5)

if not script_text:
    # Fallback: hardcoded script
    print("  Using fallback script (all models exhausted)")
    scripts = {
        "skibidi_chaos": "YO WAIT NO CAP, this sigma Ohio rizz just hit different fr fr! We bussin absolute gyatt energy, skibidi certified no cap! The brain cells? GONE. The vibes? IMMACULATE. This ain't it chief but also it IS it! Slay bestie, main character moment unlocked. Subscribe NOW or your rizz expires midnight! No cap fr fr bussin lowkey highkey based!",
        "wild_facts": "HOLD UP your brain is about to EXPLODE! Octopuses have THREE hearts and blue blood! A day on Venus is LONGER than a year on Venus! Cleopatra lived closer in time to the Moon landing than to the pyramids being built! Your body replaces itself ENTIRELY every 7 years! You are LITERALLY not the same person! Subscribe for more mind-melting facts EVERY DAY!",
        "meme_narration": "POV: you're the main character and the universe just dropped a PLOT TWIST! That one guy who said you couldn't do it? He's watching your glow-up compilation RIGHT NOW! The villain arc was temporary, the SIGMA arc is PERMANENT! Nobody saw this coming, not even the algorithm! This is unironically peak cinema! Like and subscribe before the reality simulation resets!",
        "absurd_story": "A potato gained sentience on a Tuesday, ran for president, WON, and immediately banned Mondays. The moon was SO offended it filed a lawsuit. The judge? A sentient traffic cone named Gerald. Gerald ruled in favor of the potato but only if it learned the Macarena. IT DID. We all did. None of us were ever the same. Subscribe for daily unhinged lore drops!"
    }
    script_text = scripts[theme["name"]]
    used_model = "fallback"

print(f"\n📝 Script (via {used_model}):\n{script_text}\n")

# ── Step 3: Generate title & description ──────────────────────────────────
meta_prompt = f"""Create YouTube Shorts metadata for this brainrot video.
Script: {script_text[:150]}
Theme: {theme['name']}

Return ONLY valid JSON:
{{"title": "catchy title under 60 chars with emojis", "description": "fun description 150 chars max with hashtags", "tags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8"]}}"""

meta = None
for m in MODELS:
    try:
        resp = client.models.generate_content(model=m, contents=meta_prompt)
        meta_text = resp.text.strip()
        if "```" in meta_text:
            meta_text = meta_text.split("```")[1]
            if meta_text.startswith("json"):
                meta_text = meta_text[4:]
        meta = json.loads(meta_text.strip())
        break
    except Exception as e:
        print(f"  Meta {m} failed: {str(e)[:60]}")
        time.sleep(3)

if not meta:
    titles = {
        "skibidi_chaos": "💀 Skibidi Sigma Rizz Chaos!! No Cap Fr Fr 🔥",
        "wild_facts": "🤯 Facts So Wild Your Brain Will EXPLODE 💥",
        "meme_narration": "😭 POV: You're the Main Character RIGHT NOW 🎬",
        "absurd_story": "🥔 A Potato Became President & It Gets Weirder 🌙"
    }
    meta = {
        "title": titles[theme["name"]],
        "description": f"Daily brainrot energy ⚡ {theme['name'].replace('_',' ').title()} vibes #Shorts #Brainrot #Viral",
        "tags": ["Shorts", "brainrot", "viral", "fyp", "funny", "meme", "AI", "trending"]
    }

print(f"📌 Title: {meta['title']}")

# ── Step 4: Generate TTS voiceover ────────────────────────────────────────
print("🎙️ Generating voiceover...")
tts_response = client.models.generate_content(
    model="gemini-2.5-flash-preview-tts",
    contents=script_text,
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
audio_raw = tts_response.candidates[0].content.parts[0].inline_data.data
decoded_audio = base64.b64decode(audio_raw) if isinstance(audio_raw, str) else audio_raw
with open(audio_path, "wb") as f:
    f.write(decoded_audio)
print(f"✅ Voiceover saved ({len(decoded_audio):,} bytes)")

# ── Step 5: Generate video with Veo ──────────────────────────────────────
video_prompt_text = (
    f"YouTube Shorts brainrot video, portrait 9:16 format, ultra-fast chaotic energy, "
    f"{theme['visual']}, loud saturated colors, viral TikTok meme aesthetic, "
    f"pure visual chaos with high-energy movement, no text overlays"
)

print("🎬 Generating Veo video clip (this takes 1-3 min)...")
operation = client.models.generate_videos(
    model="veo-3.0-fast-generate-001",
    prompt=video_prompt_text,
    config=types.GenerateVideoConfig(
        aspect_ratio="9:16",
        number_of_videos=1,
        duration_seconds=8,
    ),
)

poll_count = 0
while not operation.done:
    time.sleep(15)
    operation = client.operations.get(operation)
    poll_count += 1
    print(f"  ⏳ Generating... ({poll_count * 15}s elapsed)")

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

print(f"🔗 Merging video + audio...")
merge = subprocess.run([
    "ffmpeg", "-y",
    "-stream_loop", str(loops_needed), "-i", raw_video_path,
    "-i", audio_path,
    "-t", str(audio_duration),
    "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1",
    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
    "-c:a", "aac", "-b:a", "192k",
    "-movflags", "+faststart",
    final_video_path
], capture_output=True, text=True)

if merge.returncode != 0:
    print(f"FFmpeg error: {merge.stderr[-500:]}", file=sys.stderr)
    sys.exit(1)

file_size = os.path.getsize(final_video_path)
print(f"✅ Final video ready: {final_video_path} ({file_size/1024/1024:.1f} MB)")

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
    sys.exit(1)

upload_data = json.loads(upload_result.stdout)
video_id = upload_data.get("id", "unknown")
video_url = f"https://www.youtube.com/shorts/{video_id}"
print(f"\n🚀 POSTED! {video_url}")

print(json.dumps({"type": "generated_file", "path": final_video_path, "name": "final_short.mp4"}))
print(json.dumps({
    "video_url": video_url,
    "title": meta["title"],
    "theme": theme["name"],
    "audio_duration": round(audio_duration, 1),
    "script_preview": script_text[:120]
}))
