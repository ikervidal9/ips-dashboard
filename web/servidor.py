from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import ipaddress
import json
import os
import subprocess

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EVENTS_FILE = os.path.join(BASE_DIR, "..", "events.json")


def load_events():
    try:
        with open(EVENTS_FILE, "r") as file:
            return json.load(file)
    except FileNotFoundError:
        return []
    except json.JSONDecodeError:
        return []


def save_events(events):
    with open(EVENTS_FILE, "w") as file:
        json.dump(events, file, indent=4)


def is_valid_ip(ip):
    try:
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False


@app.route("/")
def home():
    return send_from_directory("paginas", "index.html")


@app.route("/recursos/<path:archivo>")
def recursos(archivo):
    return send_from_directory("recursos", archivo)


@app.route("/eventos")
def eventos():
    return jsonify(load_events())


@app.route("/desbloquear", methods=["POST"])
def desbloquear():
    data = request.get_json(silent=True) or {}
    ip = data.get("ip")

    if not ip or not is_valid_ip(ip):
        return jsonify({"error": "IP no valida"}), 400

    subprocess.run(
        ["iptables", "-D", "INPUT", "-s", ip, "-j", "DROP"],
        check=False
    )

    events = load_events()
    events = [event for event in events if event.get("ip") != ip]
    save_events(events)

    return jsonify({"ok": True, "ip": ip})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
