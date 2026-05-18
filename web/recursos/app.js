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
    fetch("/eventos")
        .then(r => r.json())
        .then(data => {
            let totalPaquetes = 0;
            let ips = new Set();

            const tabla = document.getElementById("tabla-ips");
            tabla.innerHTML = "";

            data.forEach(e => {
                totalPaquetes += e.packets;
                ips.add(e.ip);

                tabla.innerHTML += `
                    <tr>
                        <td>${e.ip}</td>
                        <td>
                            <button onclick="desbloquear('${e.ip}')">
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

            let seguro = 1, alerta = 0, ataque = 0;

            if (ips.size === 0) {
                seguro = 1;
            } else if (ips.size < 3) {
                alerta = 1;
            } else {
                ataque = 1;
            }

            graficaSeguridad.data.datasets[0].data = [seguro, alerta, ataque];
            graficaSeguridad.update();
        });
}

function desbloquear(ip) {
    fetch("/desbloquear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip })
    }).then(() => actualizarDashboard());
}

crearGraficas();
setInterval(actualizarDashboard, 3000);
