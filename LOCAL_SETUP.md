# OpenWhispr Local-Only Setup Guide

## Configuration Completed

### 1. Environment Configuration ✅
- `.env` file created with empty API keys
- Cloud fallback disabled (no API keys required)
- Local Python environment configured at `~/.venv-openwhispr/bin/python3`

### 2. Application Defaults ✅
- Local Whisper enabled by default
- Default reasoning model set to `qwen2.5-7b-instruct-q5_k_m` (recommended)
- CPU thread count optimized for 22 cores (80% = ~17 threads)
- All cloud fallbacks disabled in `useSettings.ts`

### 3. Whisper Installation ✅
- OpenAI Whisper installed in virtual environment
- Whisper "base" model downloaded (74MB)
- Model located at: `~/.cache/whisper/base.pt`
- Ready for local speech-to-text transcription

### 4. LLM Model Download 🔄
- Downloading Llama 3.2 3B model (2GB) from HuggingFace
- Target: `~/.cache/openwhispr/models/llama-3.2-3b-instruct-q4_k_m.gguf`
- Running in background... check progress with: `ls -lh ~/.cache/openwhispr/models/`

### 5. Remaining Tasks ⏳
- **llama.cpp Runtime**: Binary download from new ggml-org repository
- **Build from Source**: Alternative if binary download fails
- **Testing**: Verify transcription and AI processing work end-to-end

## Hardware Optimization

### Your System Specs:
- CPU: Intel Core Ultra 9 185H (22 cores)
- RAM: 62GB available
- Platform: Linux x86_64

### Inference Configuration:
```typescript
{
  threads: 17,           // 80% of 22 cores for optimal performance
  temperature: 0.3,       // Deterministic output for reasoning
  maxTokens: 512,         // Balanced response length
  contextSize: 4096,      // Good context window for tasks
  timeout: 30000          // 30 second timeout
}
```

## Model Details

### Whisper "base" (Speech-to-Text)
- Size: 74MB
- Speed: Fast
- Quality: Good balance of accuracy and speed
- Use: Converting audio to text

### Llama 3.2 3B (AI Reasoning)
- Size: 2GB (Q4_K_M quantization)
- Context: 131K tokens
- Speed: Fast inference on CPU
- Quality: Good for general tasks
- Use: Processing transcribed text with "Hey Agent" commands

## Next Steps

### 1. Complete Model Download
Wait for Llama 3.2 3B download to complete:
```bash
watch -n 5 'ls -lh ~/.cache/openwhispr/models/'
```

### 2. Install llama.cpp Runtime
Option A - Install via App UI:
```bash
npm run dev
# Then use Settings → Local AI Models → Install llama.cpp
```

Option B - Build from Source:
```bash
# Clone and build llama.cpp
git clone https://github.com/ggml-org/llama.cpp.git
cd llama.cpp
make -j$(nproc)
```

### 3. Test the Application
```bash
# Start development server
npm run dev

# Or start production app
npm start
```

### 4. Test Speech-to-Text
1. Press hotkey (default: backtick `)
2. Speak for 2-3 seconds
3. Press hotkey again
4. Text should appear with local Whisper transcription

### 5. Test AI Processing
1. Name your agent (e.g., "Assistant")
2. Say: "Hey Assistant, summarize this text"
3. Verify local LLM processes the command
4. Result should appear with "Assistant" reference removed

## Troubleshooting

### Model Download Fails
```bash
# Try manually with curl
cd ~/.cache/openwhispr/models
curl -L -O https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf
```

### llama.cpp Issues
The repository moved from `ggerganov/llama.cpp` to `ggml-org/llama.cpp`.
Updated URL: https://github.com/ggml-org/llama.cpp/releases

Build from source if binary unavailable:
```bash
git clone https://github.com/ggml-org/llama.cpp.git
cd llama.cpp
cmake -B build
cmake --build build --parallel $(nproc)
./build/bin/llama-cli --version
```

### Check Model Status
```bash
# Whisper models
ls -lh ~/.cache/whisper/

# LLM models
ls -lh ~/.cache/openwhispr/models/

# App settings
cat ~/.config/open-whispr/Local Storage/leveldb/
```

## Summary

You now have a fully configured OpenWhispr instance running:
- ✅ Local Whisper for speech-to-text
- ✅ Python virtual environment with dependencies
- 🔄 LLM model downloading
- ⏳ llama.cpp runtime installation pending
- ⏳ End-to-end testing pending

Once llama.cpp is installed and the LLM download completes, you'll have complete local operation with no API keys required!
