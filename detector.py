from scapy.all import sniff, IP, TCP, ICMP
from collections import Counter
from datetime import datetime
import os
import json
import requests

# ================= CONFIGURACIÓN =================

THRESHOLD = 20                 # Umbral de paquetes
INTERFACE = "ens33"            # Interfaz de red

WHITELIST = {"172.20.10.3"}    # IPs permitidas (no se bloquean)

BOT_TOKEN = "8583665521:AAFXVk2mboBdS07zdktM4jq8VsfuJaOPaK4"
CHAT_ID = "-1003544580196"

EVENTS_FILE = "events.json"

# ================================================

packet_count = Counter()
blocked_ips = set()


def get_protocol(packet):
    if packet.haslayer(ICMP):
        return "ICMP"
    if packet.haslayer(TCP):
        if packet[TCP].dport == 80:
            return "HTTP"
        if packet[TCP].dport == 443:
            return "HTTPS"
        return "TCP"
    return "OTHER"


def block_ip(ip):
    os.system(f"iptables -A INPUT -s {ip} -j DROP")


def save_event(ip, protocol, packets):
    event = {
        "ip": ip,
        "protocol": protocol,
        "packets": packets,
        "time": datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    }

    try:
        with open(EVENTS_FILE, "r") as f:
            data = json.load(f)
    except:
        data = []

    data.append(event)

    with open(EVENTS_FILE, "w") as f:
        json.dump(data, f, indent=4)


def send_telegram_alert(ip, protocol, packets):
    message = (
        "🚨 ALERTA IPS 🚨\n"
        f"IP: {ip}\n"
        f"Protocol: {protocol}\n"
        f"Paquets: {packets}\n"
        f"Hora: {datetime.now().strftime('%H:%M:%S')}"
    )

    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    requests.post(url, data={"chat_id": CHAT_ID, "text": message})


def analyze_packet(packet):
    if not packet.haslayer(IP):
        return

    src_ip = packet[IP].src

    if src_ip in WHITELIST:
        return

    protocol = get_protocol(packet)
    packet_count[(src_ip, protocol)] += 1
    count = packet_count[(src_ip, protocol)]

    print(f"[TRAFFIC] {src_ip} | {protocol} | {count}")

    if count >= THRESHOLD and src_ip not in blocked_ips:
        blocked_ips.add(src_ip)
        block_ip(src_ip)
        save_event(src_ip, protocol, count)
        send_telegram_alert(src_ip, protocol, count)
        print(f"[BLOCKED] {src_ip}")


print("=== IPS ACTIVO ===")
sniff(iface=INTERFACE, prn=analyze_packet, store=False)
