import argparse
import sys
import json
import os
import time

# Ensure output is unbuffered
sys.stdout.reconfigure(line_buffering=True)

def check_gpu():
    try:
        import torch
        available = torch.cuda.is_available()
        device_name = torch.cuda.get_device_name(0) if available else None
        print(json.dumps({"available": available, "device": device_name}))
    except ImportError:
        print(json.dumps({"available": False, "error": "torch not installed"}))
    except Exception as e:
        print(json.dumps({"available": False, "error": str(e)}))

def download_model(model_name):
    try:
        from huggingface_hub import snapshot_download

        print(json.dumps({"status": "starting", "model": model_name}))

        # We can't easily get granular progress from snapshot_download to JSON stdout
        # without hooking into internal tqdm.
        # For now, we report starting and completion.

        path = snapshot_download(repo_id=model_name)

        print(json.dumps({"status": "complete", "path": path}))
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))

def run_server(model_name):
    # Heavy imports here
    import logging
    import warnings

    # Suppress heavy logs
    logging.getLogger("nemo_logger").setLevel(logging.ERROR)
    warnings.filterwarnings("ignore")

    try:
        import torch
        import nemo.collections.asr as nemo_asr
    except ImportError:
        print(json.dumps({"type": "error", "message": "NeMo/Torch not installed"}), flush=True)
        sys.exit(1)

    class NemotronService:
        def __init__(self):
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            if self.device == "cpu":
                # Warn but allow? Nemotron on CPU is likely too slow.
                pass

            # Load model
            # This is blocking and slow (3-5s)
            self.model = nemo_asr.models.ASRModel.from_pretrained(model_name)
            self.model.freeze()
            self.model.to(self.device)

        def transcribe(self, file_path):
            # NeMo transcribe returns a list of strings
            transcriptions = self.model.transcribe([file_path])
            return transcriptions[0] if transcriptions else ""

    try:
        service = NemotronService()
        print(json.dumps({"type": "status", "status": "ready", "device": service.device}), flush=True)

        for line in sys.stdin:
            if not line.strip(): continue
            try:
                req = json.loads(line)
                command = req.get("command")

                if command == "transcribe":
                    file_path = req.get("file_path")
                    req_id = req.get("id")

                    if not os.path.exists(file_path):
                        print(json.dumps({"type": "error", "message": "File not found", "id": req_id}), flush=True)
                        continue

                    text = service.transcribe(file_path)
                    print(json.dumps({"type": "result", "text": text, "file_path": file_path, "id": req_id}), flush=True)

                elif command == "ping":
                    print(json.dumps({"type": "pong"}), flush=True)

                elif command == "exit":
                    break

            except Exception as e:
                print(json.dumps({"type": "error", "message": str(e)}), flush=True)

    except Exception as e:
        print(json.dumps({"type": "fatal", "message": str(e)}), flush=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["check-gpu", "download", "server"])
    parser.add_argument("--model", default="nvidia/nemotron-speech-streaming-en-0.6b")
    args = parser.parse_args()

    if args.mode == "check-gpu":
        check_gpu()
    elif args.mode == "download":
        download_model(args.model)
    elif args.mode == "server":
        run_server(args.model)
