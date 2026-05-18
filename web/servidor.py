from flask import Flask, jsonify, send_from_directory, request
import json
import os

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EVENTS_FILE = os.path.join(BASE_DIR, "..", "events.json")

@app.route("/")
def home():
    return send_from_directory("paginas", "index.html")

@app.route("/recursos/<path:archivo>")
def recursos(archivo):
    return send_from_directory("recursos", archivo)

@app.route("/eventos")
def eventos():
    try:
        with open(EVENTS_FILE) as f:
            data = json.load(f)
    except:
        data = []
    return jsonify(data)

@app.route("/desbloquear", methods=["POST"])
def desbloquear():
    ip = request.json.get("ip")
    if not ip:
        return jsonify({"error": "IP no válida"}), 400

    os.system(f"iptables -D INPUT -s {ip} -j DROP")

    try:
        with open(EVENTS_FILE) as f:
            data = json.load(f)
    except:
        data = []

    data = [e for e in data if e["ip"] != ip]

    with open(EVENTS_FILE, "w") as f:
        json.dump(data, f, indent=4)

    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
