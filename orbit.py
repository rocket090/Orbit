import math
import datetime
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import tkinter as tk
from tkinter import scrolledtext

# ------------------------------------------------------------------------------
# 1. ユリウス日(JD)変換
# ------------------------------------------------------------------------------
J2000 = datetime.datetime(2000, 1, 1, 12, 0, 0)  # J2000.0 (UTC)
JD_J2000 = 2451545.0

def to_julian_day_from_str(date_str):
    """
    "YYYY.M.D" の形式の日付文字列をパースし、ユリウス日(JD)を返す。
    例: "2020.1.1" -> JD(2020/01/01 00:00:00)
    """
    year, month, day = map(int, date_str.split("."))
    dt = datetime.datetime(year, month, day, 0, 0, 0)
    delta = dt - J2000
    jd = JD_J2000 + delta.days + delta.seconds/86400.0
    return jd

# ------------------------------------------------------------------------------
# 2. JPL近似式パラメータ（"L": 平黄経, "p": 近日点経度, "Omega": 昇交点経度 など）
#    参考: https://ssd.jpl.nasa.gov/planets/approx_pos.html
#    ここでは「3000 B.C. ～ 3000 A.D.」向け近似の値を使用。
#    ※ ϖ (varpi) = longitude of perihelion, L = mean longitude
# ------------------------------------------------------------------------------
JPL_PARAMS = {
    # Mercury
    "Mercury": {
        "L0": 252.250906, "L1": 149472.6746358,
        "p0": 77.456119,  "p1": 0.1588643,    # longitude of perihelion
        "Omega0": 48.330893, "Omega1": -0.1254229,
        "a": 0.387098,
        "e0": 0.20563069, "e1": 0.00001906,
        "i0": 7.004986,   "i1": -0.0059516
    },
    # Venus
    "Venus": {
        "L0": 181.979801, "L1": 58517.8156760,
        "p0": 131.563707, "p1": 0.0048646,
        "Omega0": 76.679920, "Omega1": -0.2780080,
        "a": 0.723329,
        "e0": 0.00677188, "e1": -0.000047766,
        "i0": 3.394662,   "i1": -0.0008568
    },
    # Earth
    "Earth": {
        "L0": 100.466457, "L1": 35999.3728565,
        "p0": 102.937348, "p1": 0.3225557,
        "Omega0": 0.0,       "Omega1": 0.0,
        "a": 1.000001018,
        "e0": 0.01670862, "e1": -0.000042037,
        "i0": 0.00005,    "i1": -4.694e-5  # 46.94e-6 と同等
    },
    # Mars
    "Mars": {
        "L0": 355.433,    "L1": 19140.2993039,
        "p0": 286.5016,   "p1": 0.000292961,   # 2.92961e-4
        "Omega0": 49.558093, "Omega1": 0.7720959,
        "a": 1.523679,
        "e0": 0.09340065, "e1": 0.000090484,
        "i0": 1.849726,   "i1": -0.0081479
    },
    # Jupiter
    "Jupiter": {
        "L0": 34.351484,  "L1": 3034.9056746,
        "p0": 273.8777,   "p1": 0.000164505,   # 1.64505e-4
        "Omega0": 100.464407, "Omega1": 0.1767232,
        "a": 5.20260,
        "e0": 0.04849793, "e1": 0.000163225,
        "i0": 1.303267,   "i1": -0.0019877
    },
    # Saturn
    "Saturn": {
        "L0": 50.077471,  "L1": 1222.11379404,
        "p0": 338.3078,   "p1": 0.000108516,   # 1.08516e-4
        "Omega0": 113.665503, "Omega1": 0.8770880,
        "a": 9.554909,
        "e0": 0.05554814, "e1": -0.0003446641,
        "i0": 2.488878,   "i1": -0.0037362
    },
    # Uranus
    "Uranus": {
        "L0": 314.055005, "L1": 428.4669983,
        "p0": 98.99931,   "p1": 0.0002135,   # 2.135e-4
        "Omega0": 74.005957, "Omega1": 0.5211278,
        "a": 19.218446,
        "e0": 0.04629590, "e1": -0.000027337,
        "i0": 0.773196,   "i1": -0.0016869
    },
    # Neptune
    "Neptune": {
        "L0": 304.348665, "L1": 218.4862002,
        "p0": 276.045,    "p1": 0.000302,   # ~ 3.02e-4
        "Omega0": 131.784057, "Omega1": 0.0061651,
        "a": 30.110386,
        "e0": 0.00898809, "e1": 0.000006408,
        "i0": 1.769952,   "i1": -0.0002557
    },
    # Itokawa
    "Itokawa": {
        "L0": 304.348665, "L1": 218.4862002,
        "p0": 276.045,    "p1": 0.000302,   # ~ 3.02e-4
        "Omega0": 69.081, "Omega1": 0.0061651,
        "a": 1.3241,
        "e0": 0.2801, "e1": 0.000006408,
        "i0": 1.6214,   "i1": -0.0002557
    },
    # Ryugu
    "Ryugu": {
        "L0": 304.348665, "L1": 218.4862002,
        "p0": 276.045,    "p1": 0.000302,   # ~ 3.02e-4
        "Omega0": 251.62, "Omega1": 0.0061651,
        "a": 1.1896,
        "e0": 0.1902, "e1": 0.000006408,
        "i0": 5.8837,   "i1": -0.0002557
    },
}

# 各惑星の公転周期(恒星日)目安（軌道1周を描画する際のサンプリング用）
planet_sideral_period_days = {
    "Mercury":  87.969,
    "Venus":  224.701,
    "Earth":  365.256,
    "Mars":  686.980,
    "Jupiter":  4332.59,
    "Saturn":  10759.22,
    "Uranus":30685.4,
    "Neptune":60189.0,
    "Itokawa":557.189,
    "Ryugu":474.833,
}

# ------------------------------------------------------------------------------



# ------------------------------------------------------------------------------
# 3. 惑星の太陽中心座標 (x,y) [AU] を計算
#    ※ JPL式では "L - varpi" = mean anomaly, "omega = varpi - Omega"
# ------------------------------------------------------------------------------
def planet_heliocentric_position_jpl(planet_name, jd):
    if planet_name not in JPL_PARAMS:
        return (0.0, 0.0)  # 未定義の場合

    p = JPL_PARAMS[planet_name]
    d = jd - JD_J2000
    T = d / 36525.0

    # Mean Longitude [deg -> rad]
    L = math.radians(p["L0"] + p["L1"] * T)
    # Longitude of Perihelion [deg -> rad]
    varpi = math.radians(p["p0"] + p["p1"] * T)
    # Ascending Node [deg -> rad]
    Omega = math.radians(p["Omega0"] + p["Omega1"] * T)

    # Inclination [deg -> rad]
    i = math.radians(p["i0"] + p["i1"] * T)
    # Semi-major axis
    a = p["a"]
    # Eccentricity
    e = p["e0"] + p["e1"] * T

    # Argument of Perihelion = varpi - Omega
    w = varpi - Omega
    # Mean Anomaly = L - varpi
    M = L - varpi

    # ケプラー方程式 (Mean Anomaly M → Eccentric Anomaly E) を反復で解く
    E = M
    for _ in range(10):
        E = E - (E - e * math.sin(E) - M) / (1 - e * math.cos(E))

    # True Anomaly v, 距離 r
    v = 2.0 * math.atan2(
        math.sqrt(1+e) * math.sin(E/2),
        math.sqrt(1-e) * math.cos(E/2)
    )
    r = a * (1 - e * math.cos(E))

    # 軌道平面上の座標 (x', y')
    x_prime = r * math.cos(v)
    y_prime = r * math.sin(v)

    # 3次元変換 (w, i, Omega)
    # 1) 回転 w (z軸周り)
    xw = x_prime * math.cos(w) - y_prime * math.sin(w)
    yw = x_prime * math.sin(w) + y_prime * math.cos(w)
    # 2) x軸回転 i
    x_i = xw
    y_i = yw * math.cos(i)
    z_i = yw * math.sin(i)
    # 3) z軸回転 Omega
    x_omega = x_i * math.cos(Omega) - y_i * math.sin(Omega)
    y_omega = x_i * math.sin(Omega) + y_i * math.cos(Omega)
    # z_omega = z_i (使わない)

    return (x_omega, y_omega)


# ------------------------------------------------------------------------------
# 4. 「同じ天体」を結ぶ場合は、その天体の軌道を時刻 t1→t2 でサンプリングして描画
# ------------------------------------------------------------------------------
def create_orbit_segment(planet_name, jd_start, jd_end, steps=200):
    """
    jd_start から jd_end まで、その惑星の軌道をステップ数でサンプリングし
    (x, y) のリストを返す。
    時間が逆転している場合は、昇順に直す。
    """
    if jd_end < jd_start:
        jd_start, jd_end = jd_end, jd_start  # swap

    jd_list = np.linspace(jd_start, jd_end, steps)
    xs, ys = [], []
    for jd in jd_list:
        x, y = planet_heliocentric_position_jpl(planet_name, jd)
        xs.append(x)
        ys.append(y)
    return xs, ys


# ------------------------------------------------------------------------------
# 5. 「異なる天体」を結ぶ場合は、反時計回りの弾道風スパイラルで接続
# ------------------------------------------------------------------------------
def create_transfer_orbit(x1, y1, x2, y2, n=100):
    """
    (x1,y1) -> (x2,y2) を反時計回りで滑らかに結ぶ。
    """
    r1 = math.sqrt(x1**2 + y1**2)
    r2 = math.sqrt(x2**2 + y2**2)
    angle1 = math.atan2(y1, x1)
    angle2 = math.atan2(y2, x2)

    # 反時計回りになるよう angle2 >= angle1 に補正
    while angle2 < angle1:
        angle2 += 2.0*math.pi
    # 多周回しないように
    if angle2 - angle1 > 2.0*math.pi:
        angle2 -= 2.0*math.pi

    xs, ys = [], []
    for i in range(n):
        t = i/(n-1)
        # θ(t): angle1 → angle2 の線形補間
        theta_t = angle1 + (angle2 - angle1)*t
        # r(t): 半コサインカーブで補間
        r_t = (r1 + r2)/2.0 + (r2 - r1)/2.0 * math.cos(math.pi*(1.0 - t))

        x_t = r_t*math.cos(theta_t)
        y_t = r_t*math.sin(theta_t)
        xs.append(x_t)
        ys.append(y_t)

    return xs, ys


# ------------------------------------------------------------------------------
# 6. メイン描画
#    - タイムライン: [天体, "YYYY.M.D", 天体, "YYYY.M.D", ...]
#    - 同じ天体同士なら軌道サンプリング
#    - 異なる天体同士ならスパイラル遷移
# ------------------------------------------------------------------------------
def plot_trajectory(timeline):
    if len(timeline) % 2 != 0:
        raise ValueError("timelineの要素数が奇数です。[天体][日時]のペアにしてください。")

    # (planet, date_str) のペアに分解
    pairs = []
    for i in range(0, len(timeline), 2):
        planet_name = timeline[i]
        date_str = timeline[i+1]
        pairs.append((planet_name, date_str))

    # 登場惑星を抽出
    unique_planets = set(p[0] for p in pairs if p[0] in JPL_PARAMS.keys())

    # 各惑星が最初に出てきた日時を記録 → 軌道1周の描画に使う
    planet_first_jd = {}
    for planet, date_str in pairs:
        if planet in JPL_PARAMS and planet not in planet_first_jd:
            planet_first_jd[planet] = to_julian_day_from_str(date_str)

    # プロット開始
    plt.figure(figsize=(8, 8))
    ax = plt.gca()
    ax.set_aspect('equal', 'box')

    # 太陽
    plt.scatter(0, 0, color='yellow', marker='o', s=300, label='Sun')

    # (1) タイムラインに登場した惑星の軌道(1周ぶん)を描画
    for planet in unique_planets:
        jd0 = planet_first_jd[planet]
        if planet in planet_sideral_period_days:
            period = planet_sideral_period_days[planet]
            jd_list = np.linspace(jd0, jd0 + period, 400)
            orbit_x, orbit_y = [], []
            for jd_ in jd_list:
                x_, y_ = planet_heliocentric_position_jpl(planet, jd_)
                orbit_x.append(x_)
                orbit_y.append(y_)
            plt.plot(orbit_x, orbit_y, '--', label=f"{planet} orbit")

    # (2) 各時刻の惑星位置をプロット & ラベル
    points_xy = []
    labels = []
    for planet, date_str in pairs:
        jd = to_julian_day_from_str(date_str)
        x, y = planet_heliocentric_position_jpl(planet, jd)
        points_xy.append((x, y))
        labels.append(f"{planet}\n{date_str}")

    px = [p[0] for p in points_xy]
    py = [p[1] for p in points_xy]
    plt.scatter(px, py, color='green', s=50)

    for (x, y), lbl in zip(points_xy, labels):
        plt.text(x+0.02, y+0.02, lbl, fontsize=8)

    # (3) 連続する2点を結ぶ軌道
    #     - 同じ天体なら軌道サンプリング
    #     - 異なる天体ならスパイラル
    plotted_transfer_label = False
    for i in range(len(pairs)-1):
        planet1, date1 = pairs[i]
        planet2, date2 = pairs[i+1]
        x1, y1 = points_xy[i]
        x2, y2 = points_xy[i+1]

        if planet1 == planet2:
            # 同じ惑星なら、その公転軌道を t1->t2 でサンプリング
            jd1 = to_julian_day_from_str(date1)
            jd2 = to_julian_day_from_str(date2)
            seg_x, seg_y = create_orbit_segment(planet1, jd1, jd2, steps=150)
            plt.plot(seg_x, seg_y, color='green', linewidth=2)
        else:
            # 異なる惑星 -> 転移軌道(スパイラル)
            seg_x, seg_y = create_transfer_orbit(x1, y1, x2, y2, n=150)
            if not plotted_transfer_label:
                plt.plot(seg_x, seg_y, color='green', linewidth=2, label='Transfer Orbit')
                plotted_transfer_label = True
            else:
                plt.plot(seg_x, seg_y, color='green', linewidth=2)

    plt.title("Orbit Maker")
    plt.xlabel("X [AU]")
    plt.ylabel("Y [AU]")
    plt.grid(True)
    plt.legend(loc='upper right')
    plt.show()


# ------------------------------------------------------------------------------
# 7. サンプル実行
# ------------------------------------------------------------------------------
if __name__ == "__main__":
    # 例: [Earth][2020.1.1][Mars][2021.5.1][Mars][2021.12.1][Earth][2023.4.1]
    timeline_example = [
        "Earth", "2026.10.1",
        "Mars", "2027.8.1",
        "Mars", "2030.11.1",
        "Earth","2031.7.1"
    ]
    plot_trajectory(timeline_example)
