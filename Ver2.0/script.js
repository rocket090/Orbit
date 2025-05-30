
      // テーブル操作用の関数
      function addRow() {
        var tbody = document
          .getElementById("timelineTable")
          .getElementsByTagName("tbody")[0];
        var newRow = tbody.insertRow();
        var cell1 = newRow.insertCell(0);
        var cell2 = newRow.insertCell(1);
        var cell3 = newRow.insertCell(2);
        cell1.innerHTML = `
          <select onchange="submitAndRun()">
            <option value="Mercury">Mercury</option>
            <option value="Venus">Venus</option>
            <option value="Earth">Earth</option>
            <option value="Mars">Mars</option>
            <option value="Jupiter">Jupiter</option>
            <option value="Saturn">Saturn</option>
            <option value="Uranus">Uranus</option>
            <option value="Neptune">Neptune</option>
            <option value="Itokawa">Itokawa</option>
            <option value="Ryugu">Ryugu</option>
            <option value="Moon">Moon</option>
          </select>
        `;
        cell2.innerHTML = '<input type="date" onchange="submitAndRun()">';
        cell3.innerHTML = `
          <div class="dropdown">
            <button style="border: none;cursor: pointer;"><b>⋮</b></button>
            <div class="dropdown-content">
              <button onclick="removeRow(this)">削除</button>
              <button onclick="moveRowUp(this)">上へ移動</button>
              <button onclick="moveRowDown(this)">下へ移動</button>
            </div>
          </div>
        `;
      }

      function removeRow(btn) {
        var row = btn.parentNode.parentNode.parentNode.parentNode;
        row.parentNode.removeChild(row);
        submitAndRun(); // 削除後に軌道描画を更新
      }

      // 行を上に移動する関数
      function moveRowUp(btn) {
        var row = btn.parentNode.parentNode.parentNode.parentNode;
        var previousRow = row.previousElementSibling;
        if (previousRow) {
          row.parentNode.insertBefore(row, previousRow);
          submitAndRun();
        }
      }

      // 行を下に移動する関数
      function moveRowDown(btn) {
        var row = btn.parentNode.parentNode.parentNode.parentNode;
        var nextRow = row.nextElementSibling;
        if (nextRow) {
          row.parentNode.insertBefore(nextRow, row);
          submitAndRun();
        }
      }

      // Pyodide関連
      let pyodide = null;
      async function main() {
        pyodide = await loadPyodide();
        await pyodide.loadPackage(["matplotlib", "numpy"]);
        document.getElementById("loading").style.display = "none";
        // Pythonコード（軌道計算・描画）
        let pythonCode = `
import math
import datetime
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io, base64, json

# J2000とJDの定義
J2000 = datetime.datetime(2000, 1, 1, 12, 0, 0)
JD_J2000 = 2451545.0

def to_julian_day_from_str(date_str):
    year, month, day = map(int, date_str.split("."))
    dt = datetime.datetime(year, month, day, 0, 0, 0)
    delta = dt - J2000
    jd = JD_J2000 + delta.days + delta.seconds/86400.0
    return jd

# JPL近似式パラメータ
JPL_PARAMS = {
    "Mercury": {
        "L0": 252.250906, "L1": 149472.6746358,
        "p0": 77.456119,  "p1": 0.1588643,
        "Omega0": 48.330893, "Omega1": -0.1254229,
        "a": 0.387098,
        "e0": 0.20563069, "e1": 0.00001906,
        "i0": 7.004986,   "i1": -0.0059516
    },
    "Venus": {
        "L0": 181.979801, "L1": 58517.8156760,
        "p0": 131.563707, "p1": 0.0048646,
        "Omega0": 76.679920, "Omega1": -0.2780080,
        "a": 0.723329,
        "e0": 0.00677188, "e1": -0.000047766,
        "i0": 3.394662,   "i1": -0.0008568
    },
    "Earth": {
        "L0": 100.466457, "L1": 35999.3728565,
        "p0": 102.937348, "p1": 0.3225557,
        "Omega0": 0.0,       "Omega1": 0.0,
        "a": 1.000001018,
        "e0": 0.01670862, "e1": -0.000042037,
        "i0": 0.00005,    "i1": -4.694e-5
    },
    "Mars": {
        "L0": 355.433,    "L1": 19140.2993039,
        "p0": 286.5016,   "p1": 0.000292961,
        "Omega0": 49.558093, "Omega1": 0.7720959,
        "a": 1.523679,
        "e0": 0.09340065, "e1": 0.000090484,
        "i0": 1.849726,   "i1": -0.0081479
    },
    "Jupiter": {
        "L0": 34.351484,  "L1": 3034.9056746,
        "p0": 273.8777,   "p1": 0.000164505,
        "Omega0": 100.464407, "Omega1": 0.1767232,
        "a": 5.20260,
        "e0": 0.04849793, "e1": 0.000163225,
        "i0": 1.303267,   "i1": -0.0019877
    },
    "Saturn": {
        "L0": 50.077471,  "L1": 1222.11379404,
        "p0": 338.3078,   "p1": 0.000108516,
        "Omega0": 113.665503, "Omega1": 0.8770880,
        "a": 9.554909,
        "e0": 0.05554814, "e1": -0.0003446641,
        "i0": 2.488878,   "i1": -0.0037362
    },
    "Uranus": {
        "L0": 314.055005, "L1": 428.4669983,
        "p0": 98.99931,   "p1": 0.0002135,
        "Omega0": 74.005957, "Omega1": 0.5211278,
        "a": 19.218446,
        "e0": 0.04629590, "e1": -0.000027337,
        "i0": 0.773196,   "i1": -0.0016869
    },
    "Neptune": {
        "L0": 304.348665, "L1": 218.4862002,
        "p0": 276.045,    "p1": 0.000302,
        "Omega0": 131.784057, "Omega1": 0.0061651,
        "a": 30.110386,
        "e0": 0.00898809, "e1": 0.000006408,
        "i0": 1.769952,   "i1": -0.0002557
    },
    "Itokawa": {
        "L0": 356.03,     "L1": 23719.0,
        "p0": 231.33,     "p1": 0.0,
        "Omega0": 69.081,  "Omega1": 0.0061651,
        "a": 1.3241,
        "e0": 0.2801,     "e1": 0.0,
        "i0": 1.6214,     "i1": 0.0
    },
    "Ryugu": {
        "L0": 267.92,     "L1": 27696.0,
        "p0": 103.02,     "p1": 0.0,
        "Omega0": 251.62,  "Omega1": 0.0,
        "a": 1.1896,
        "e0": 0.1902,     "e1": 0.0,
        "i0": 5.8837,     "i1": 0.0
    },
}

planet_sideral_period_days = {
    "Mercury": 87.969,
    "Venus": 224.701,
    "Earth": 365.256,
    "Mars": 686.980,
    "Jupiter": 4332.59,
    "Saturn": 10759.22,
    "Uranus": 30685.4,
    "Neptune": 60189.0,
    "Itokawa": 557.189,
    "Ryugu": 474.833,
}

def planet_heliocentric_position_jpl(planet_name, jd):
    if planet_name not in JPL_PARAMS:
        return (0.0, 0.0)
    p = JPL_PARAMS[planet_name]
    d = jd - JD_J2000
    T = d / 36525.0
    L = math.radians(p["L0"] + p["L1"] * T)
    varpi = math.radians(p["p0"] + p["p1"] * T)
    Omega = math.radians(p["Omega0"] + p["Omega1"] * T)
    i = math.radians(p["i0"] + p["i1"] * T)
    a = p["a"]
    e = p["e0"] + p["e1"] * T
    w = varpi - Omega
    M = L - varpi
    E = M
    for _ in range(10):
        E = E - (E - e * math.sin(E) - M) / (1 - e * math.cos(E))
    v = 2.0 * math.atan2(math.sqrt(1 + e) * math.sin(E / 2),
                         math.sqrt(1 - e) * math.cos(E / 2))
    r = a * (1 - e * math.cos(E))
    x_prime = r * math.cos(v)
    y_prime = r * math.sin(v)
    xw = x_prime * math.cos(w) - y_prime * math.sin(w)
    yw = x_prime * math.sin(w) + y_prime * math.cos(w)
    x_i = xw
    y_i = yw * math.cos(i)
    x_omega = x_i * math.cos(Omega) - y_i * math.sin(Omega)
    y_omega = x_i * math.sin(Omega) + y_i * math.cos(Omega)
    return (x_omega, y_omega)

def create_orbit_segment(planet_name, jd_start, jd_end, steps=200):
    if jd_end < jd_start:
        jd_start, jd_end = jd_end, jd_start
    jd_list = np.linspace(jd_start, jd_end, steps)
    xs, ys = [], []
    for jd in jd_list:
        x, y = planet_heliocentric_position_jpl(planet_name, jd)
        xs.append(x)
        ys.append(y)
    return xs, ys

def create_transfer_orbit(x1, y1, x2, y2, extra_revolutions=0, n=100):
    r1 = math.sqrt(x1**2 + y1**2)
    r2 = math.sqrt(x2**2 + y2**2)
    angle1 = math.atan2(y1, x1)
    angle2 = math.atan2(y2, x2)
    while angle2 < angle1:
        angle2 += 2 * math.pi
    angle_end = angle2 + 2 * math.pi * extra_revolutions
    xs, ys = [], []
    for i in range(n):
        t = i / (n - 1)
        theta_t = angle1 + (angle_end - angle1) * t
        r_t = (r1 + r2) / 2.0 + (r2 - r1) / 2.0 * math.cos(math.pi * (1.0 - t))
        xs.append(r_t * math.cos(theta_t))
        ys.append(r_t * math.sin(theta_t))
    return xs, ys

def create_transfer_orbit_simple(x1, y1, x2, y2, n=100):
    r1 = math.sqrt(x1**2 + y1**2)
    r2 = math.sqrt(x2**2 + y2**2)
    angle1 = math.atan2(y1, x1)
    angle2 = math.atan2(y2, x2)
    while angle2 < angle1:
        angle2 += 2 * math.pi
    if angle2 - angle1 > 2 * math.pi:
        angle2 -= 2 * math.pi
    xs, ys = [], []
    for i in range(n):
        t = i / (n - 1)
        theta_t = angle1 + (angle2 - angle1) * t
        r_t = (r1 + r2) / 2.0 + (r2 - r1) / 2.0 * math.cos(math.pi * (1.0 - t))
        xs.append(r_t * math.cos(theta_t))
        ys.append(r_t * math.sin(theta_t))
    return xs, ys

def plot_trajectory(timeline, disable_multi_orbit=False):
    if len(timeline) % 2 != 0:
        raise ValueError("timelineの要素数が奇数です。[天体][日時]のペアにしてください。")
    pairs = []
    for i in range(0, len(timeline), 2):
        planet_name = timeline[i]
        date_str = timeline[i + 1]
        pairs.append((planet_name, date_str))
    moon_mode = any(planet == "Moon" for planet, _ in pairs)
    plt.figure(figsize=(8, 8))
    ax = plt.gca()
    ax.set_aspect("equal", "box")
    if moon_mode:
        # Moonモードの処理（EarthとMoonのみ許可）
        for planet, _ in pairs:
            if planet not in ("Earth", "Moon"):
                raise ValueError("Moonが含まれる場合はEarthとMoonのみ使用できます。")
        R_geo = 0.000282
        r_moon = 0.00257
        T_moon = 27.321661
        T_sidereal = 0.99726968
        plt.scatter(0, 0, color="blue", marker="o", s=100, label="Earth (中心)")
        theta_vals = np.linspace(0, 2 * math.pi, 300)
        geo_x = R_geo * np.cos(theta_vals)
        geo_y = R_geo * np.sin(theta_vals)
        plt.plot(geo_x, geo_y, "--", label="Geostationary Orbit")
        moon_x = r_moon * np.cos(theta_vals)
        moon_y = r_moon * np.sin(theta_vals)
        plt.plot(moon_x, moon_y, "--", label="Moon Orbit")
        earth_ref = None
        moon_ref = None
        for planet, date in pairs:
            jd = to_julian_day_from_str(date)
            if planet == "Earth" and earth_ref is None:
                earth_ref = jd
            elif planet == "Moon" and moon_ref is None:
                moon_ref = jd
        if earth_ref is None:
            earth_ref = to_julian_day_from_str(pairs[0][1])
        if moon_ref is None:
            moon_ref = to_julian_day_from_str(pairs[0][1])
        def earth_geostationary_position(jd, jd_ref):
            angle = 2 * math.pi * ((jd - jd_ref) / T_sidereal)
            return (R_geo * math.cos(angle), R_geo * math.sin(angle))
        def moon_position(jd, jd_ref):
            angle = 2 * math.pi * ((jd - jd_ref) / T_moon)
            return (r_moon * math.cos(angle), r_moon * math.sin(angle))
        points_xy = []
        labels = []
        for planet, date in pairs:
            jd = to_julian_day_from_str(date)
            if planet == "Earth":
                pos = earth_geostationary_position(jd, earth_ref)
            else:
                pos = moon_position(jd, moon_ref)
            points_xy.append(pos)
            labels.append(f"{planet}\\n{date}")
        for (x, y), lbl in zip(points_xy, labels):
            plt.scatter(x, y, color="green", s=50)
            plt.text(x + 0.00005, y + 0.00005, lbl, fontsize=8)
        def create_orbit_segment_custom(position_func, jd_ref, jd_start, jd_end, steps=150):
            jd_list = np.linspace(jd_start, jd_end, steps)
            xs, ys = [], []
            for jd in jd_list:
                x, y = position_func(jd, jd_ref)
                xs.append(x)
                ys.append(y)
            return xs, ys
        plotted_transfer_label = False
        for i in range(len(pairs) - 1):
            planet1, date1 = pairs[i]
            planet2, date2 = pairs[i + 1]
            jd1 = to_julian_day_from_str(date1)
            jd2 = to_julian_day_from_str(date2)
            if planet1 == planet2:
                if planet1 == "Earth":
                    seg_x, seg_y = create_orbit_segment_custom(
                        earth_geostationary_position, earth_ref, jd1, jd2, steps=150
                    )
                else:
                    seg_x, seg_y = create_orbit_segment_custom(
                        moon_position, moon_ref, jd1, jd2, steps=150
                    )
                plt.plot(seg_x, seg_y, color="green", linewidth=2)
            else:
                x1, y1 = points_xy[i]
                x2, y2 = points_xy[i + 1]
                r1 = math.sqrt(x1**2 + y1**2)
                r2 = math.sqrt(x2**2 + y2**2)
                r_avg = (r1 + r2) / 2.0
                estimated_period = T_moon * (r_avg / r_moon) ** 1.5
                dt = jd2 - jd1
                num_orbits = dt / estimated_period
                extra_revs = int(round(num_orbits))
                if extra_revs <= 1:
                    seg_x, seg_y = create_transfer_orbit_simple(x1, y1, x2, y2, n=150)
                else:
                    seg_x, seg_y = create_transfer_orbit(x1, y1, x2, y2, extra_revolutions=extra_revs, n=150)
                if not plotted_transfer_label:
                    plt.plot(seg_x, seg_y, color="green", linewidth=2, label="Transfer Orbit")
                    plotted_transfer_label = True
                else:
                    plt.plot(seg_x, seg_y, color="green", linewidth=2)
    else:
        plt.scatter(0, 0, color="yellow", marker="o", s=300, label="Sun")
        planet_first_jd = {}
        for planet, date_str in pairs:
            if planet in JPL_PARAMS and planet not in planet_first_jd:
                planet_first_jd[planet] = to_julian_day_from_str(date_str)
        for planet in planet_first_jd:
            jd0 = planet_first_jd[planet]
            if planet in planet_sideral_period_days:
                period = planet_sideral_period_days[planet]
                jd_list = np.linspace(jd0, jd0 + period, 400)
                orbit_x, orbit_y = [], []
                for jd_ in jd_list:
                    x_, y_ = planet_heliocentric_position_jpl(planet, jd_)
                    orbit_x.append(x_)
                    orbit_y.append(y_)
                plt.plot(orbit_x, orbit_y, "--", label=f"{planet} orbit")
        points_xy = []
        labels = []
        for planet, date_str in pairs:
            jd = to_julian_day_from_str(date_str)
            x, y = planet_heliocentric_position_jpl(planet, jd)
            points_xy.append((x, y))
            labels.append(f"{planet}\\n{date_str}")
        for (x, y), lbl in zip(points_xy, labels):
            plt.scatter(x, y, color="green", s=50)
            plt.text(x + 0.02, y + 0.02, lbl, fontsize=8)
        plotted_transfer_label = False
        for i in range(len(pairs) - 1):
            planet1, date1 = pairs[i]
            planet2, date2 = pairs[i + 1]
            x1, y1 = points_xy[i]
            x2, y2 = points_xy[i + 1]
            if planet1 == planet2:
                jd1 = to_julian_day_from_str(date1)
                jd2 = to_julian_day_from_str(date2)
                seg_x, seg_y = create_orbit_segment(planet1, jd1, jd2, steps=150)
                plt.plot(seg_x, seg_y, color="green", linewidth=2)
            else:
                jd1 = to_julian_day_from_str(date1)
                jd2 = to_julian_day_from_str(date2)
                dt = jd2 - jd1
                r1 = math.sqrt(x1**2 + y1**2)
                r2 = math.sqrt(x2**2 + y2**2)
                r_avg = (r1 + r2) / 2.0
                estimated_period = 365.256 * (r_avg ** 1.5)
                num_orbits = dt / estimated_period
                extra_revs = int(round(num_orbits))
                if disable_multi_orbit or extra_revs <= 1:
                    seg_x, seg_y = create_transfer_orbit_simple(x1, y1, x2, y2, n=150)
                else:
                    seg_x, seg_y = create_transfer_orbit(x1, y1, x2, y2, extra_revolutions=extra_revs, n=150)
                if not plotted_transfer_label:
                    plt.plot(seg_x, seg_y, color="green", linewidth=2, label="Transfer Orbit")
                    plotted_transfer_label = True
                else:
                    plt.plot(seg_x, seg_y, color="green", linewidth=2)
    plt.title("Orbit Maker")
    plt.xlabel("X [AU]")
    plt.ylabel("Y [AU]")
    plt.grid(True)
    plt.legend(loc="upper right")
    # plt.show()は呼ばず、画像出力用に後でplt.savefig()で保存する。

def run_orbit():
    timeline = json.loads(timeline_json)
    plot_trajectory(timeline, disable_multi_orbit) # チェックボックスの状態を渡す
    buf = io.BytesIO()
    plt.savefig(buf, format="png")
    buf.seek(0)
    data = base64.b64encode(buf.read()).decode("ascii")
    plt.close()
    return data
        `;
        await pyodide.runPythonAsync(pythonCode);
      }
      main();

      async function submitAndRun() {
        var tbody = document
          .getElementById("timelineTable")
          .getElementsByTagName("tbody")[0];
        var rows = tbody.getElementsByTagName("tr");
        var timeline = [];
        const disableMultiOrbit = document.getElementById("disableMultiOrbit").checked;
        // 入力検証
        for (var i = 0; i < rows.length; i++) {
          var planet = rows[i].getElementsByTagName("select")[0].value;
          var dateInput = rows[i].getElementsByTagName("input")[0].value;
          if (!planet || !dateInput) {
            // 不完全な入力がある場合は再描画しない
            return;
          }
          // 日付をYYYY.MM.DD形式に変換
          const date = new Date(dateInput);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const formattedDate = `${year}.${month}.${day}`;

          timeline.push(planet);
          timeline.push(formattedDate);
        }

        // 天体名の選択肢をグレーアウトと選択不可にする
        let hasMoon = false;
        let hasOther = false;
        for (var i = 0; i < rows.length; i++) {
          var planet = rows[i].getElementsByTagName("select")[0].value;
          if (planet === "Moon") {
            hasMoon = true;
          } else if (planet !== "Earth" && planet !== "") {
            hasOther = true;
          }
        }

        for (var i = 0; i < rows.length; i++) {
          var select = rows[i].getElementsByTagName("select")[0];
          for (var j = 0; j < select.options.length; j++) {
            var option = select.options[j];
            if (hasMoon) {
              if (option.value !== "Moon" && option.value !== "Earth") {
                option.disabled = true;
              } else {
                option.disabled = false;
              }
            } else if (hasOther) {
              if (option.value === "Moon") {
                option.disabled = true;
              } else {
                option.disabled = false;
              }
            } else {
              option.disabled = false;
            }
          }
        }

        // 移動ボタンの有効/無効化
        for (var i = 0; i < rows.length; i++) {
          var dropdownContent = rows[i].getElementsByClassName("dropdown-content")[0];
          var upButton = dropdownContent.getElementsByTagName("button")[1]; // 上に移動ボタン
          var downButton = dropdownContent.getElementsByTagName("button")[2]; // 下に移動ボタン
          upButton.disabled = (i === 0);
          downButton.disabled = (i === rows.length - 1);
        }

        var timelineJson = JSON.stringify(timeline, null, 2);
        pyodide.globals.set("timeline_json", timelineJson);
        pyodide.globals.set("disable_multi_orbit", disableMultiOrbit); // チェックボックスの状態をPythonに渡す
        let base64_png = await pyodide.runPythonAsync("run_orbit()");
        document.getElementById("plotImg").src = "data:image/png;base64," + base64_png;
      }
