const API_URL = "http://192.168.0.100:5000";

let graficaPaquetes;
let graficaBloqueadas;
let graficaSeguridad;

let historialPaquetes = [];
let etiquetasTiempo = [];

function crearGraficas() {
    graficaPaquetes = new Chart(
        document.getElementById("grafica-paquetes"),
        {
            type: "line",
            data: {
                labels: [],
                datasets: [{
                    label: "Paquetes",
                    data: [],
                    borderColor: "#1976d2",
                    backgroundColor: "rgba(25, 118, 210, 0.15)",
                    tension: 0.3
                }]
            }
        }
    );

    graficaBloqueadas = new Chart(
        document.getElementById("grafica-bloqueadas"),
        {
            type: "bar",
            data: {
                labels: ["IPs bloqueadas"],
                datasets: [{
                    label: "Cantidad",
                    data: [0],
                    backgroundColor: "#d32f2f"
                }]
            }
        }
    );

    graficaSeguridad = new Chart(
        document.getElementById("grafica-seguridad"),
        {
            type: "doughnut",
            data: {
                labels: ["Seguro", "Alerta", "Ataque"],
                datasets: [{
                    data: [1, 0, 0],
                    backgroundColor: ["#4caf50", "#ffeb3b", "#f44336"]
                }]
            }
        }
    );
}

function actualizarDashboard() {
    fetch(`${API_URL}/eventos`)
        .then(response => response.json())
        .then(data => {
            let totalPaquetes = 0;
            let ips = new Set();

            const tabla = document.getElementById("tabla-ips");
            tabla.innerHTML = "";

            data.forEach(evento => {
                totalPaquetes += evento.packets;
                ips.add(evento.ip);

                tabla.innerHTML += `
                    <tr>
                        <td>${evento.ip}</td>
                        <td>${evento.protocol}</td>
                        <td>${evento.packets}</td>
                        <td>${evento.time}</td>
                        <td>
                            <button onclick="desbloquear('${evento.ip}')">
                                Desbloquear
                            </button>
                        </td>
                    </tr>
                `;
            });

            const ahora = new Date().toLocaleTimeString();

            etiquetasTiempo.push(ahora);
            historialPaquetes.push(totalPaquetes);

            if (historialPaquetes.length > 10) {
                historialPaquetes.shift();
                etiquetasTiempo.shift();
            }

            graficaPaquetes.data.labels = etiquetasTiempo;
            graficaPaquetes.data.datasets[0].data = historialPaquetes;
            graficaPaquetes.update();

            graficaBloqueadas.data.datasets[0].data = [ips.size];
            graficaBloqueadas.update();

            let seguro = 1;
            let alerta = 0;
            let ataque = 0;

            if (ips.size === 0) {
                seguro = 1;
            } else if (ips.size < 3) {
                seguro = 0;
                alerta = 1;
            } else {
                seguro = 0;
                ataque = 1;
            }

            graficaSeguridad.data.datasets[0].data = [seguro, alerta, ataque];
            graficaSeguridad.update();
        })
        .catch(error => {
            console.error("Error al cargar eventos:", error);
        });
}

function desbloquear(ip) {
    fetch(`${API_URL}/desbloquear`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ ip })
    })
        .then(response => response.json())
        .then(() => actualizarDashboard())
        .catch(error => {
            console.error("Error al desbloquear IP:", error);
        });
}

crearGraficas();
actualizarDashboard();
setInterval(actualizarDashboard, 3000);
