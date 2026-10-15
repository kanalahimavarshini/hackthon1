from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import json
from pathlib import Path
from datetime import datetime, timezone

app = Flask(__name__)

# For local development only. Restrict origins before deployment.
CORS(app)

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "carboniq.db"

# Illustrative demo values. Replace with verified local values.
EMISSION_FACTOR = 0.7  # kg CO2 per kWh
ELECTRICITY_RATE = 8.0  # INR per kWh

DEFAULT_MACHINES = [
    {
        "id": "motor",
        "name": "Production Motor",
        "zone": "Zone A",
        "power_kw": 5.0,
        "hours": 8,
        "on": True
    },
    {
        "id": "hvac",
        "name": "Ventilation System",
        "zone": "Zone B",
        "power_kw": 3.0,
        "hours": 8,
        "on": True
    },
    {
        "id": "lights",
        "name": "Factory Lighting",
        "zone": "Zone C",
        "power_kw": 2.0,
        "hours": 10,
        "on": True
    }
]


def connect_db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_db():
    with connect_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS machines (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                zone TEXT NOT NULL,
                power_kw REAL NOT NULL,
                hours REAL NOT NULL,
                is_on INTEGER NOT NULL
            )
        """)

        db.execute("""
            CREATE TABLE IF NOT EXISTS simulations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                energy_kwh REAL NOT NULL,
                emissions_kg REAL NOT NULL,
                cost_inr REAL NOT NULL,
                machine_data TEXT NOT NULL
            )
        """)

        count = db.execute(
            "SELECT COUNT(*) FROM machines"
        ).fetchone()[0]

        if count == 0:
            for machine in DEFAULT_MACHINES:
                db.execute("""
                    INSERT INTO machines
                    (id, name, zone, power_kw, hours, is_on)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    machine["id"],
                    machine["name"],
                    machine["zone"],
                    machine["power_kw"],
                    machine["hours"],
                    int(machine["on"])
                ))


def read_machines():
    with connect_db() as db:
        rows = db.execute(
            "SELECT * FROM machines ORDER BY id"
        ).fetchall()

    return [
        {
            "id": row["id"],
            "name": row["name"],
            "zone": row["zone"],
            "power_kw": row["power_kw"],
            "hours": row["hours"],
            "on": bool(row["is_on"])
        }
        for row in rows
    ]


def validate_machines(data):
    if not isinstance(data, list) or not data:
        raise ValueError("machines must be a non-empty list.")

    if len(data) > 100:
        raise ValueError("Maximum 100 machines per simulation.")

    clean = []
    seen_ids = set()

    for item in data:
        if not isinstance(item, dict):
            raise ValueError("Each machine must be an object.")

        machine_id = item.get("id")
        if not isinstance(machine_id, str) or not machine_id.strip():
            raise ValueError("Every machine needs a valid id.")

        if machine_id in seen_ids:
            raise ValueError("Machine IDs must be unique.")
        seen_ids.add(machine_id)

        try:
            power = float(item["power_kw"])
            hours = float(item["hours"])
        except (KeyError, TypeError, ValueError):
            raise ValueError("Each machine needs numeric power_kw and hours.")

        if power < 0 or power > 100000:
            raise ValueError("power_kw must be between 0 and 100000.")

        if hours < 0 or hours > 24:
            raise ValueError("hours must be between 0 and 24.")

        if not isinstance(item.get("on"), bool):
            raise ValueError("on must be true or false.")

        clean.append({
            "id": machine_id,
            "name": str(item.get("name", machine_id))[:100],
            "power_kw": power,
            "hours": hours,
            "on": item["on"]
        })

    return clean


def calculate(machines):
    energy = sum(
        m["power_kw"] * m["hours"] if m["on"] else 0
        for m in machines
    )

    return {
        "energy_kwh": round(energy, 3),
        "emissions_kg": round(energy * EMISSION_FACTOR, 3),
        "cost_inr": round(energy * ELECTRICITY_RATE, 2)
    }


@app.get("/")
def home():
    return jsonify({
        "app": "CarbonIQ Digital Twin API",
        "status": "running",
        "message": "Use /api/health to check the backend."
    })


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "database": "connected"})


@app.get("/api/machines")
def get_machines():
    return jsonify({"machines": read_machines()})


@app.post("/api/simulate")
def simulate():
    try:
        payload = request.get_json(silent=True) or {}
        machines = validate_machines(payload.get("machines"))
        result = calculate(machines)

        with connect_db() as db:
            # Persist the latest settings for known machines.
            for machine in machines:
                db.execute("""
                    INSERT INTO machines
                    (id, name, zone, power_kw, hours, is_on)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        name = excluded.name,
                        power_kw = excluded.power_kw,
                        hours = excluded.hours,
                        is_on = excluded.is_on
                """, (
                    machine["id"],
                    machine["name"],
                    "Unassigned",
                    machine["power_kw"],
                    machine["hours"],
                    int(machine["on"])
                ))

            cursor = db.execute("""
                INSERT INTO simulations
                (created_at, energy_kwh, emissions_kg, cost_inr, machine_data)
                VALUES (?, ?, ?, ?, ?)
            """, (
                datetime.now(timezone.utc).isoformat(),
                result["energy_kwh"],
                result["emissions_kg"],
                result["cost_inr"],
                json.dumps(machines)
            ))

            result["simulation_id"] = cursor.lastrowid

        result["machines"] = machines
        result["emission_factor_kg_per_kwh"] = EMISSION_FACTOR
        result["electricity_rate_inr_per_kwh"] = ELECTRICITY_RATE
        result["data_type"] = "simulated"

        return jsonify(result), 201

    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@app.get("/api/history")
def history():
    with connect_db() as db:
        rows = db.execute("""
            SELECT id, created_at, energy_kwh, emissions_kg, cost_inr
            FROM simulations
            ORDER BY id DESC
            LIMIT 50
        """).fetchall()

    return jsonify({
        "history": [dict(row) for row in rows]
    })


@app.get("/api/history/<int:simulation_id>")
def get_simulation(simulation_id):
    with connect_db() as db:
        row = db.execute("""
            SELECT * FROM simulations WHERE id = ?
        """, (simulation_id,)).fetchone()

    if row is None:
        return jsonify({"error": "Simulation not found."}), 404

    result = dict(row)
    result["machines"] = json.loads(result.pop("machine_data"))
    return jsonify(result)


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found."}), 404


@app.errorhandler(500)
def server_error(error):
    return jsonify({"error": "Internal server error."}), 500


initialize_db()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)