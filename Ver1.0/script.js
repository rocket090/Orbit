 /********************
   * 定数＆スケール設定
   ********************/
  const distanceScale = 20; // 1 AU = 20 scene units
  const earthSize = 0.002;      // 地球の大きさ（シーン上のサイズ単位）
  const sunRadius = 109 * earthSize; // 太陽は地球の109倍の大きさ
  //const uniformPlanetRadius = 0.01;
  //const sunRadiusUniform = 2;
  const planetColor = "#edc328";
  
  const celestialData = {
  "Mercury": { a: 0.39, period: 88, epoch: "2025-08-13T00:00:00Z", radius: 0.38 }, // 地球の約0.38倍
  "Venus": { a: 0.72, period: 225, epoch: "2025-07-12T00:00:00Z", radius: 0.95 }, // 地球の約0.95倍
  "Earth": { a: 1.00, period: 365.25, epoch: "2025-09-23T12:00:00Z", radius: 1.00 }, // 地球を基準
  "Mars": { a: 1.52, period: 687, epoch: "2024-06-15T00:00:00Z", radius: 0.53 }, // 地球の約0.53倍
  "Jupiter": { a: 5.20, period: 4333, epoch: "2022-10-29T00:00:00Z", radius: 11.2 }, // 地球の約11.2倍
  "Saturn": { a: 9.58, period: 10759, epoch: "2026-04-06T00:00:00Z", radius: 9.45 }, // 地球の約9.45倍
  "Uranus": { a: 19.2, period: 30687, epoch: "2012-05-29T00:00:00Z", radius: 4.01 }, // 地球の約4.01倍
  "Neptune": { a: 30.1, period: 60190, epoch: "2027-09-24T00:00:00Z", radius: 3.88 }, // 地球の約3.88倍
  "Pluto": { a: 39.48, period: 90560, epoch: "2077-09-15T00:00:00Z", radius: 0.18 }, // 地球の約0.18倍
  "Itokawa": { a: 1.324, period: 556.4, epoch: "2024-10-23T12:00:00Z", radius: 0.00004 }, // イトカワは非常に小さいので調整
  "Ryugu": { a: 1.189, period: 474.3, epoch: "2025-11-17T00:00:00Z", radius: 0.00005 }, // リュウグウも非常に小さいので調整
};

  const moonData = { a: 0.00257, period: 27.3 };
  const referenceEpoch = new Date("2000-01-01T12:00:00Z");
  
  /********************
   * 右パネル：ミッションシーケンス＆各種コントロール
   ********************/
  const missionContainer = document.getElementById('missionContainer');
  const addOrbitBtn = document.getElementById('addOrbitBtn');
  const missions = [];
  let missionIdCounter = 0;
  
  
  /********************
   * 左パネル：3Dシーン、日時入力、上アングル・各星ボタン・スライダー
   ********************/
  const leftPanel = document.getElementById('leftPanel');
  // レンダラーの初期化（logarithmicDepthBuffer 有効）
const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  logarithmicDepthBuffer: true
});
renderer.setSize(leftPanel.clientWidth, leftPanel.clientHeight);
leftPanel.appendChild(renderer.domElement);
  
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4f4f4);
  scene.scale.z = -1;  // ← これで上下が入れ替わります
  
  // カメラの初期化（near と far をシーンに合わせて調整）
const camera = new THREE.PerspectiveCamera(
  45,
  leftPanel.clientWidth / leftPanel.clientHeight,
  0.01,     // near を小さく設定
  100000    // far を十分大きく設定
);
camera.position.set(0, 70, 70);
  
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  
  const initialCameraPosition = camera.position.clone();
  const initialCameraTarget = controls.target.clone();
  
  // リサイズ時のカメラ更新
window.addEventListener('resize', () => {
  renderer.setSize(leftPanel.clientWidth, leftPanel.clientHeight);
  camera.aspect = leftPanel.clientWidth / leftPanel.clientHeight;
  camera.updateProjectionMatrix();
});
  
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(200, 200, 200);
  scene.add(directionalLight);
  
  function createAxisLine(dir, length) {
  const material = new THREE.LineBasicMaterial({ color: 0xc0c0c0, transparent: true, opacity: 0.5 });
  const points = [ new THREE.Vector3(0,0,0), dir.clone().setLength(length) ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.Line(geometry, material);
}
  const axisLength = 1000;
  const axisX = createAxisLine(new THREE.Vector3(1,0,0), axisLength);
  const axisY = createAxisLine(new THREE.Vector3(0,1,0), axisLength);
  const axisZ = createAxisLine(new THREE.Vector3(0,0,1), axisLength);
  scene.add(axisX, axisY, axisZ);
  
  const title = document.createElement('h2');
title.textContent = "軌道設計アプリ";
title.style.position = 'absolute';
title.style.top = '0px';
title.style.left = '15px';
title.style.color = 'black'; // 文字色を黒に設定
leftPanel.appendChild(title);

  const simTimeDiv = document.createElement('div');
simTimeDiv.style.position = 'absolute';
simTimeDiv.style.top = '61px';
simTimeDiv.style.left = '10px';
simTimeDiv.style.padding = '3px 5px'; // アングルボタンと同じpadding
simTimeDiv.style.backgroundColor = '#fff'; // アングルボタンと同じ背景色
simTimeDiv.style.border = '1px solid #ccc'; // アングルボタンと同じボーダー
simTimeDiv.style.borderRadius = '3px'; // アングルボタンと同じ角丸
simTimeDiv.innerHTML = '<span style="font-size: 13.3px;">日時:</span> <input type="date" id="simTimeInput">'; // span要素で囲む
leftPanel.appendChild(simTimeDiv);

const simTimeInput = document.getElementById('simTimeInput');
const now = new Date();
simTimeInput.value = now.toISOString().slice(0,10);

const topViewBtn = document.createElement('button');
topViewBtn.id = "topViewBtn";
topViewBtn.innerHTML = "上視点";
leftPanel.appendChild(topViewBtn); // simTimeDiv の後に追加

const resetViewBtn = document.createElement('button');
resetViewBtn.id = "resetViewBtn";
resetViewBtn.innerHTML = "初期視点";
leftPanel.appendChild(resetViewBtn); // simTimeDiv の後に追加

// CSVエクスポート・インポートのコントロールを追加
const csvControls = document.createElement('div');
csvControls.id = "csvControls";
csvControls.innerHTML = `
  <button id="exportCsvBtn">保存</button>
  <button id="importCsvBtn">読み込み</button>
`;
leftPanel.appendChild(csvControls); // resetViewBtn の後に追加

// ファイル選択ボタンのイベントリスナー
const importCsvBtn = document.getElementById('importCsvBtn');
importCsvBtn.addEventListener('click', () => {
  document.getElementById('importCsvInput').click();
});

// ファイル選択input要素（非表示）
const importCsvInput = document.createElement('input');
importCsvInput.type = "file";
importCsvInput.id = "importCsvInput";
importCsvInput.accept = ".csv";
importCsvInput.style.display = "none"; // 非表示
leftPanel.appendChild(importCsvInput);

topViewBtn.addEventListener('click', () => {
  camera.position.set(0,80,0);
  camera.lookAt(new THREE.Vector3(0,0,0));
  controls.update();
});

resetViewBtn.addEventListener('click', () => {
  camera.position.copy(initialCameraPosition);
  controls.target.copy(initialCameraTarget);
  controls.update();
});

// rightPanel 変数を定義
const rightPanel = document.querySelector('.right-panel');

// プロジェクト名を設定・編集するためのinput要素を追加
const projectNameInput = document.createElement('input');
projectNameInput.type = "text";
projectNameInput.id = "projectNameInput";
projectNameInput.value = "プロジェクト名"; // 初期値を設定
projectNameInput.style.marginBottom = "10px"; // 下マージンを追加
rightPanel.insertBefore(projectNameInput, addOrbitBtn); // addOrbitBtnの前に追加

// プロジェクト名を保存するための変数
let projectName = projectNameInput.value;

// プロジェクト名が変更されたときにprojectName変数を更新
projectNameInput.addEventListener('change', () => {
  projectName = projectNameInput.value;
});

const starButtonsDiv = document.createElement('div');
starButtonsDiv.id = "starButtons";
leftPanel.appendChild(starButtonsDiv);

// 地球ボタンのみを作成
const earthBtn = document.createElement('button');
earthBtn.innerHTML = "地球視点";
earthBtn.id = "earthBtn";
earthBtn.addEventListener('click', () => {
  updateSolarSystem(); // 位置情報を更新

  // 内部の天体位置を取得
  const rawTarget = celestialMeshes["Earth"].position.clone();
  // シーンのスケール反転に合わせた表示上の位置に変換
  const visualTarget = new THREE.Vector3(rawTarget.x, rawTarget.y, -rawTarget.z);

  // カメラのターゲットを設定
  controls.target.copy(visualTarget);
  // カメラの位置は、表示上の位置から適切なオフセット（例：上方向に1、後方に1）を加算
  camera.position.copy(visualTarget).add(new THREE.Vector3(0, 1, -1));
  controls.update();
});
starButtonsDiv.appendChild(earthBtn);
  
  
  /********************
   * 天体メッシュ＆軌道円の作成
   ********************/
  const celestialMeshes = {};
  const haloMeshes = {};
  const orbitCircles = {}; // 軌道円を保持するオブジェクト
  
  const sunGeo = new THREE.SphereGeometry(sunRadius, 32, 32);
  const sunMat = new THREE.MeshBasicMaterial({ color: "#f4a261" });
  const sunMesh = new THREE.Mesh(sunGeo, sunMat);
  sunMesh.userData.name = "Sun";
  sunMesh.position.set(0, 0, 0);
  scene.add(sunMesh);
  celestialMeshes["Sun"] = sunMesh;
  
  const sunHaloGeo = new THREE.SphereGeometry(1, 32, 32);
  const sunHaloMat = new THREE.MeshBasicMaterial({ color: "#f4a261", transparent: true, opacity: 0.3 });
  const sunHaloMesh = new THREE.Mesh(sunHaloGeo, sunHaloMat);
  sunHaloMesh.position.copy(sunMesh.position);
  sunHaloMesh.userData.name = "Sun";
  scene.add(sunHaloMesh);
  haloMeshes["Sun"] = sunHaloMesh;
  
  for (const name in celestialData) {
    // celestialData の radius プロパティを利用
  const planetRadius = celestialData[name].radius* earthSize;
    const geo = new THREE.SphereGeometry(planetRadius, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: planetColor });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.name = name;
    scene.add(mesh);
    celestialMeshes[name] = mesh;
    
    const haloGeo = new THREE.SphereGeometry(0.75, 20, 20);
    const haloMat = new THREE.MeshBasicMaterial({ color: "yellow", transparent: true, opacity: 0.3 });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.position.copy(mesh.position);
    haloMesh.userData.name = name;
    scene.add(haloMesh);
    haloMeshes[name] = haloMesh;
  }
  
  // celestialData の radius プロパティを利用
  const moonRadius = 0.27* earthSize;
  const moonGeo = new THREE.SphereGeometry(moonRadius, 12, 12);
  const moonMat = new THREE.MeshBasicMaterial({ color: planetColor });
  const moonMesh = new THREE.Mesh(moonGeo, moonMat);
  moonMesh.userData.name = "Moon";
  scene.add(moonMesh);
  celestialMeshes["Moon"] = moonMesh;
  
  const moonHaloGeo = new THREE.SphereGeometry(0.75, 20, 20);
  const moonHaloMat = new THREE.MeshBasicMaterial({ color: "yellow", transparent: true, opacity: 0.3 });
  const moonHaloMesh = new THREE.Mesh(moonHaloGeo, moonHaloMat);
  moonHaloMesh.position.copy(moonMesh.position);
  moonHaloMesh.userData.name = "Moon";
  scene.add(moonHaloMesh);
  haloMeshes["Moon"] = moonHaloMesh;
  
  // 月の軌道を作成
  const moonOrbit = createOrbitCircle(moonData.a);
  scene.add(moonOrbit);
  orbitCircles["Moon"] = moonOrbit; // orbitCircles に追加

  function createOrbitCircle(a_AU) {
  const radius = a_AU * distanceScale;
  const segments = 128;
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(radius * Math.cos(theta), 0, radius * Math.sin(theta))); // ここを修正
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: 0x555555 });
  return new THREE.LineLoop(geometry, material);
}
  for (const name in celestialData) {
    const data = celestialData[name];
    const orbit = createOrbitCircle(data.a);
    scene.add(orbit);
    orbitCircles[name] = orbit;
  }
  // 初期化時に軌道描画を更新
  updateSolarSystem();
  
  /********************
   * 天体位置計算の共通関数（XZ平面・公転方向逆）
   ********************/
// 例：getCelestialPosition を、各天体の元期を考慮して計算するように変更
function getCelestialPosition(name, time) {
  if (name === "Sun") {
    return new THREE.Vector3(0, 0, 0);
  } else if (name === "Moon") {
    // Moon の場合は Earth を中心として計算（こちらは簡易モデル）
    const earthPos = getCelestialPosition("Earth", time);
    const deltaDaysMoon = (time - referenceEpoch) / (1000 * 60 * 60 * 24);
    const moonAngle = 2 * Math.PI * (deltaDaysMoon / moonData.period);
    const r_moon = moonData.a * distanceScale;
    return new THREE.Vector3(
      earthPos.x + r_moon * Math.cos(moonAngle),
      earthPos.y,
      earthPos.z + r_moon * Math.sin(moonAngle) // Z成分を元に戻す
    );
  } else {
    // 天体ごとに設定した元期（epoch）を利用（指定がなければ referenceEpoch を使用）
    const data = celestialData[name];
    const planetEpoch = data.epoch ? new Date(data.epoch) : referenceEpoch;
    const deltaDays = (time - planetEpoch) / (1000 * 60 * 60 * 24);
    const angle = 2 * Math.PI * (deltaDays / data.period);
    const r = data.a * distanceScale;
    return new THREE.Vector3(r * Math.cos(angle), 0, r * Math.sin(angle)); // Z成分を元に戻す
  }
}
  
  /********************
   * シミュレーション時刻に基づく天体位置更新
   ********************/
   function updateSolarSystem() {
  const simTime = new Date(simTimeInput.value);
  for (const name in celestialData) {
    const data = celestialData[name];
    const mesh = celestialMeshes[name];
    // 惑星ごとに設定した元期（epoch）を利用（指定がなければ referenceEpoch を使用）
    const planetEpoch = data.epoch ? new Date(data.epoch) : referenceEpoch;
    const deltaDays = (simTime - planetEpoch) / (1000 * 60 * 60 * 24);
    const angle = 2 * Math.PI * (deltaDays / data.period);
    const r = data.a * distanceScale;
    mesh.position.set(r * Math.cos(angle), 0, r * Math.sin(angle)); // ここを修正
  }
  const earthMesh = celestialMeshes["Earth"];
  const deltaDaysMoon = (simTime - referenceEpoch) / (1000 * 60 * 60 * 24);
  const moonAngle = 2 * Math.PI * (deltaDaysMoon / moonData.period);
  const r_moon = moonData.a * distanceScale;
  moonMesh.position.set(
    earthMesh.position.x + r_moon * Math.cos(moonAngle),
    earthMesh.position.y,
    earthMesh.position.z + r_moon * Math.sin(moonAngle) // ここを修正
  );
  for (const name in celestialMeshes) {
    if (haloMeshes[name]) {
      haloMeshes[name].position.copy(celestialMeshes[name].position);
    }
  }

  // 月の軌道を更新
  const earthPos = celestialMeshes["Earth"].position;
    const moonRadius = moonData.a * distanceScale;
    const segments = 128;
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x = earthPos.x + moonRadius * Math.cos(theta);
      const z = earthPos.z + moonRadius * Math.sin(theta);
      points.push(new THREE.Vector3(x, earthPos.y, z));
    }
    orbitCircles["Moon"].geometry.setFromPoints(points);
    orbitCircles["Moon"].geometry.attributes.position.needsUpdate = true;
  // 各ミッションの軌道＆接続線を再描画
  missions.forEach(mission => updateMissionOrbit(mission));
}
  updateSolarSystem();
  simTimeInput.addEventListener('change', updateSolarSystem);
  
  /********************
   * ホバー時のツールチップ
   ********************/
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const tooltip = document.getElementById('tooltip');
  renderer.domElement.addEventListener('mousemove', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const objects = Object.values(celestialMeshes).concat(Object.values(haloMeshes));
    const intersects = raycaster.intersectObjects(objects);
    if (intersects.length > 0) {
      const obj = intersects[0].object;
      tooltip.innerHTML = obj.userData.name;
      tooltip.style.left = (event.clientX + 5) + "px";
      tooltip.style.top = (event.clientY + 5) + "px";
      tooltip.style.display = "block";
    } else {
      tooltip.style.display = "none";
    }
  });
  
    /********************
   * 右パネル：ミッションシーケンス＆打ち上げ軌道
   * （高度換算: 1 AU = 149600000 km, 1 AU = 20 scene units）
   ********************/
   function createMissionOrbitLine(mission, center) {
  const conversionFactor = distanceScale / 149600000;
  const inputAlt = parseFloat(mission.altitude.value) || 0;
  const altitudeScene = inputAlt * conversionFactor;
  
  // 天体ごとの実際の半径を返す（Sun, MoonはcelestialDataに含まれていないので専用変数を使用）
  function getOrbitRadius(planetName, altitudeScene) {
    let planetRadius;
    if (planetName === "Sun") {
      planetRadius = sunRadius; // 例えば sunRadius = 109 * earthSize
    } else if (planetName === "Moon") {
      planetRadius = moonRadius; // 例えば moonRadius = 0.27 * earthSize
    } else {
      // 他の天体はcelestialDataから取得（地球サイズを掛ける）
      planetRadius = celestialData[planetName].radius * earthSize;
    }
    return planetRadius + altitudeScene;
  }
  
  // mission.body.value を天体名とみなして軌道半径を算出
  const orbitRadius = getOrbitRadius(mission.body.value, altitudeScene);
  
  const segments = 64;
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(
      center.x + orbitRadius * Math.cos(theta),
      center.y,
      center.z + orbitRadius * Math.sin(theta)
    ));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  return new THREE.LineLoop(geometry, material);
}

  
  function getContinuousPhase(name, time) {
  if (name === "Sun") {
    return 0;
  } else if (name === "Moon") {
    // Moon は簡易モデルとして referenceEpoch を用いる
    const deltaDays = (time - referenceEpoch) / (1000 * 60 * 60 * 24);
    return 2 * Math.PI * (deltaDays / moonData.period);
  } else {
    const data = celestialData[name];
    const planetEpoch = data.epoch ? new Date(data.epoch) : referenceEpoch;
    const deltaDays = (time - planetEpoch) / (1000 * 60 * 60 * 24);
    return 2 * Math.PI * (deltaDays / data.period);
  }
}

function updateTransferOrbit(mission, nextMission) {
  if (mission.transferLine) {
    scene.remove(mission.transferLine);
    mission.transferLine = null;
  }

  // 出発時刻と到着時刻を取得（固定表示ならミッション日時、そうでなければシミュレーション日時）
  const time1 = (mission.fixed && mission.fixed.checked)
      ? new Date(mission.endDate.value)
      : new Date(simTimeInput.value);
  const time2 = (nextMission.fixed && nextMission.fixed.checked)
      ? new Date(nextMission.startDate.value)
      : new Date(simTimeInput.value);

  // ★★ここで従来の「星の中心」ではなく、周回軌道上のマーカー位置を利用します★★
  //let startMarker, endMarker;
  //if (mission.orbitMarker) {
    //startMarker = mission.orbitMarker.position.clone();
  //} else {
    // 万が一マーカーが無い場合は従来の中心位置を使用（この分岐はあまり発生しないはず）
    //startMarker = (mission.fixed && mission.fixed.checked)
          //? getCelestialPosition(mission.body.value, time1)
          //: celestialMeshes[mission.body.value].position.clone();
  //}
  //if (nextMission.orbitMarker) {
    //endMarker = nextMission.orbitMarker.position.clone();
  //} else {
    //endMarker = (nextMission.fixed && nextMission.fixed.checked)
          //? getCelestialPosition(nextMission.body.value, time2)
          //: celestialMeshes[nextMission.body.value].position.clone();
  //}

  // マーカー位置を原点（太陽）からの極座標（距離・角度）に変換
  //const rA = startMarker.length();
  //const rB = endMarker.length();
  //const angleA = Math.atan2(startMarker.z, startMarker.x);
  //const angleB = Math.atan2(endMarker.z, endMarker.x);

  const center1 = (mission.fixed && mission.fixed.checked)
          ? getCelestialPosition(mission.body.value, time1)
          : celestialMeshes[mission.body.value].position.clone();
      const center2 = (nextMission.fixed && nextMission.fixed.checked)
          ? getCelestialPosition(nextMission.body.value, time2)
          : celestialMeshes[nextMission.body.value].position.clone();
      const angleA = getContinuousPhase(mission.body.value, time1);
      const angleB = getContinuousPhase(nextMission.body.value, time2);
    
      const dataA = celestialData[mission.body.value];
      const rA = dataA.a * distanceScale;
      const dataB = celestialData[nextMission.body.value];
      const rB = dataB.a * distanceScale;

  // 既存の補間プロセス（S字補間風）をそのまま利用
  function rFunc(t) {
    const k = 0.1;
    return rA + (rB - rA) * (t + k * t * (1 - t));
  }
  function thetaFunc(t) {
    return angleA + (angleB - angleA) * t;
  }

  const numSteps = 50;
  const points = [];
  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const rVal = rFunc(t);
    const thVal = thetaFunc(t);
    points.push(new THREE.Vector3(rVal * Math.cos(thVal), 0, rVal * Math.sin(thVal)));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
  const transferLine = new THREE.Line(geometry, material);
  mission.transferLine = transferLine;
  scene.add(transferLine);
}

  
  // 直前のミッションを取得する補助関数
  function getPreviousMission(mission) {
    const missionsArray = Array.from(missionContainer.children);
    const currentIndex = missionsArray.indexOf(mission.dom);
    if (currentIndex > 0) {
      const prevDom = missionsArray[currentIndex - 1];
      return missions.find(m => m.dom === prevDom);
    }
    return null;
  }
  
  function getNextMission(mission) {
    const missionsArray = Array.from(missionContainer.children).filter(child => child.classList.contains('mission-item'));
    const currentIndex = missionsArray.indexOf(mission.dom);
    console.log("missionsArray:", missionsArray);
    console.log("currentIndex:", currentIndex);
    if (currentIndex >= 0 && currentIndex < missionsArray.length - 1) {
        const nextDom = missionsArray[currentIndex + 1];
        console.log("nextDom:", nextDom);
        return missions.find(m => m.dom === nextDom);
    }
    return null;
}
  
function updateMissionOrbit(mission) {
  if (mission.orbitLine) scene.remove(mission.orbitLine);
  let center;
  let time;
  if (mission.fixed && mission.fixed.checked) {
    // 固定表示の場合
    // ここで fixedTime を宣言し、値を代入
    const fixedTime = mission.orbitBase === 'start' ? new Date(mission.startDate.value) : new Date(mission.endDate.value);
    time = fixedTime;
    center = getCelestialPosition(mission.body.value, time);
  } else {
    // 固定表示でない場合は現在時刻を使用
    center = celestialMeshes[mission.body.value].position.clone();
  }
  mission.orbitLine = createMissionOrbitLine(mission, center);
  scene.add(mission.orbitLine);
    
  // ----- マーカーの描画処理 -----
      // 入力値（0～100）から角度を算出
      const markerVal = parseFloat(mission.marker.value) || 0;
      const markerAngle = (markerVal / 360) * 2 * Math.PI;
      // 高度からシーン上の軌道半径を計算
      const conversionFactor = distanceScale / 149600000;
      const inputAlt = parseFloat(mission.altitude.value) || 0;
      const altitudeScene = inputAlt * conversionFactor;
      function getOrbitRadius(planetName, altitudeScene) {
        let planetRadius;
        if (planetName === "Sun") {
          planetRadius = sunRadius;
        } else if (planetName === "Moon") {
          planetRadius = moonRadius;
        } else {
          planetRadius = celestialData[planetName].radius * earthSize;
        }
        return planetRadius + altitudeScene;
      }
      const orbitRadius = getOrbitRadius(mission.body.value, altitudeScene);
      const markerX = center.x + orbitRadius * Math.cos(markerAngle);
      const markerZ = center.z + orbitRadius * Math.sin(markerAngle);
    
      // すでにマーカーが存在すれば更新、なければ新規作成
      if (mission.orbitMarker) {
        mission.orbitMarker.position.set(markerX, center.y, markerZ);
      } else {
        const markerGeo = new THREE.SphereGeometry(0.0005, 8, 8);
        const markerMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const markerMesh = new THREE.Mesh(markerGeo, markerMat);
        markerMesh.position.set(markerX, center.y, markerZ);
        scene.add(markerMesh);
        mission.orbitMarker = markerMesh;
      }
      // ----- マーカー処理ここまで -----

    if (mission.connected) {
      const nextMission = getNextMission(mission);
      if (nextMission) {
        updateTransferOrbit(mission, nextMission);
      } else {
        if (mission.transferLine) {
          scene.remove(mission.transferLine);
          mission.transferLine = null;
        }
      }
    }
  }

function updateMissionListControls() {
  const missionItems = missionContainer.querySelectorAll('.mission-item');
  missionItems.forEach((missionItem, index) => {
    const moveUpBtn = missionItem.querySelector('.move-up');
    const moveDownBtn = missionItem.querySelector('.move-down');
    const connectControls = missionItem.querySelector('.mission-connect-controls');
    
    // 先頭のミッションなら「上へ」を無効化
    if (index === 0) {
      moveUpBtn.disabled = true;
    } else {
      moveUpBtn.disabled = false;
    }
    
    // 末尾のミッションなら「下へ」を無効化し、接続コントロールを非表示
    if (index === missionItems.length - 1) {
      moveDownBtn.disabled = true;
      if (connectControls) {
        connectControls.style.display = 'none';
      }
    } else {
      moveDownBtn.disabled = false;
      if (connectControls) {
        connectControls.style.display = '';
      }
    }
  });
}

function createMissionEntry(data) {
  missionIdCounter++;

  const mission = { id: missionIdCounter };

  // mission-item コンテナを作成し、その中にmission-entryとmission-connect-controlsをまとめる
  const missionItem = document.createElement('div');
  missionItem.className = 'mission-item';

  // mission-entry を作成
  const entryDiv = document.createElement('div');
  entryDiv.className = 'mission-entry';
  entryDiv.innerHTML = `
    <label>
      <input type="text" class="mission-sequence" value="${data && data.sequence ? data.sequence : "ミッション" + missionIdCounter}">
    </label>
    <label>天体:
      <select class="mission-body">
        ${["Sun", ...Object.keys(celestialData), "Moon"].map(n => `<option value="${n}">${n}</option>`).join('')}
      </select>
    </label>
    <label>高度:
      <input type="number" class="mission-altitude" value="${data && data.altitude ? data.altitude : "5000000"}" step="1">
    </label>
    <label>点位置:
          <input type="number" class="mission-marker" value="${data && data.marker ? data.marker : "0"}" min="0" max="360" step="1">
        </label>
    <label>開始:
      <input type="date" class="mission-start-date" value="${data && data.startDate ? data.startDate : simTimeInput.value}">
      <div style="display: inline-block;">
        <button class="jump-start-button">ジャンプ</button>
      </div>
    </label>
    <label>終了:
      <input type="date" class="mission-end-date" value="${data && data.endDate ? data.endDate : simTimeInput.value}">
      <div style="display: inline-block;">
        <button class="jump-end-button">ジャンプ</button>
      </div>
    </label>
    <label>
      <input type="checkbox" class="mission-fixed" ${data && data.fixed === "true" ? "checked" : ""}> 日時確定
    </label>
    <div class="mission-controls">
      <button class="move-up">上へ</button>
      <button class="move-down">下へ</button>
      <button class="delete-mission">削除</button>
    </div>
  `;

  // mission-connect-controls を作成
  const connectControlsDiv = document.createElement('div');
  connectControlsDiv.className = 'mission-connect-controls';
  connectControlsDiv.innerHTML = `
    <span>||　</span>
    <button class="connect-next">接続</button>
    <button class="disconnect">接続解除</button>
  `;

  // mission-entry と mission-connect-controlsをmission-itemにまとめる
  missionItem.appendChild(entryDiv);
  missionItem.appendChild(connectControlsDiv);
  missionContainer.appendChild(missionItem);
  
  // mission.dom には全体のコンテナを保持しておくと移動等で扱いやすい
  mission.dom = missionItem;

  // 各要素の参照を取得
  mission.sequence = entryDiv.querySelector('.mission-sequence');
  mission.body = entryDiv.querySelector('.mission-body');
  mission.altitude = entryDiv.querySelector('.mission-altitude');
  mission.marker = entryDiv.querySelector('.mission-marker');
  mission.startDate = entryDiv.querySelector('.mission-start-date');
  mission.endDate = entryDiv.querySelector('.mission-end-date');
  mission.fixed = entryDiv.querySelector('.mission-fixed');
  mission.orbitBase = 'start'; // ミッションごとに描画基準を保持

  if (data && data.body) {
    mission.body.value = data.body;
  }
  mission.connected = (data && data.connected === "true") ? true : false;

  // 各入力の変更で軌道を更新
  mission.body.addEventListener('change', () => updateMissionOrbit(mission));
  mission.altitude.addEventListener('input', () => updateMissionOrbit(mission));
  mission.marker.addEventListener('input', () => updateMissionOrbit(mission));
  mission.startDate.addEventListener('change', () => updateMissionOrbit(mission));
  mission.endDate.addEventListener('change', () => updateMissionOrbit(mission));
  mission.fixed.addEventListener('change', () => {
    updateMissionOrbit(mission);
    const prev = getPreviousMission(mission);
    if (prev && prev.connected) {
      updateMissionOrbit(prev);
    }
  });

  // コントロールボタン群の取得
  const moveUpBtn = entryDiv.querySelector('.move-up');
  const moveDownBtn = entryDiv.querySelector('.move-down');
  const deleteBtn = entryDiv.querySelector('.delete-mission');
  const connectNextBtn = connectControlsDiv.querySelector('.connect-next');
  const disconnectBtn = connectControlsDiv.querySelector('.disconnect');

  // 描画基準切替ボタンを追加
  const changeOrbitBaseBtn = document.createElement('button');
  changeOrbitBaseBtn.textContent = '描画基準切替';
  entryDiv.querySelector('.mission-controls').appendChild(changeOrbitBaseBtn);
  changeOrbitBaseBtn.addEventListener('click', () => {
    mission.orbitBase = mission.orbitBase === 'start' ? 'end' : 'start';
    updateMissionOrbit(mission);
  });

  // 上へ移動ボタン
  moveUpBtn.addEventListener('click', () => {
    if (missionItem.previousElementSibling) {
      missionContainer.insertBefore(missionItem, missionItem.previousElementSibling);
      updateSolarSystem();
      updateMissionListControls();
    }
  });
  // 下へ移動ボタン
  moveDownBtn.addEventListener('click', () => {
    if (missionItem.nextElementSibling) {
      missionContainer.insertBefore(missionItem.nextElementSibling, missionItem);
      updateSolarSystem();
      updateMissionListControls();
    }
  });
  // 接続ボタン
  connectNextBtn.addEventListener('click', () => {
    mission.connected = true;
    updateMissionOrbit(mission);
  });
  // 接続解除ボタン
  disconnectBtn.addEventListener('click', () => {
    mission.connected = false;
    if (mission.transferLine) {
      scene.remove(mission.transferLine);
      mission.transferLine = null;
    }
    updateMissionOrbit(mission);
  });

  // 固定チェックボックスと日付入力の連動
  const fixedCheckbox = entryDiv.querySelector('.mission-fixed');
  const startDateInput = entryDiv.querySelector('.mission-start-date');
  const endDateInput = entryDiv.querySelector('.mission-end-date');

  startDateInput.disabled = !fixedCheckbox.checked;
  endDateInput.disabled = !fixedCheckbox.checked;
  fixedCheckbox.addEventListener('change', () => {
    startDateInput.disabled = !fixedCheckbox.checked;
    endDateInput.disabled = !fixedCheckbox.checked;
  });

  // ジャンプボタンの動作
  const jumpStartBtn = entryDiv.querySelector('.jump-start-button');
  const jumpEndBtn = entryDiv.querySelector('.jump-end-button');
  jumpStartBtn.addEventListener('click', () => {
    if (mission.fixed.checked) {
      simTimeInput.value = mission.startDate.value;
      updateSolarSystem();
    }
  });
  jumpEndBtn.addEventListener('click', () => {
    if (mission.fixed.checked) {
      simTimeInput.value = mission.endDate.value;
      updateSolarSystem();
    }
  });

  // 削除ボタン
  deleteBtn.addEventListener('click', () => {
    if (mission.orbitLine) scene.remove(mission.orbitLine);
    if (mission.transferLine) scene.remove(mission.transferLine);
    const index = missions.indexOf(mission);
    if (index > -1) missions.splice(index, 1);
    missionContainer.removeChild(missionItem);
    updateSolarSystem();
    updateMissionListControls();
  });

  updateMissionOrbit(mission);
  missions.push(mission);
  updateMissionListControls();
}

addOrbitBtn.addEventListener('click', () => {
  createMissionEntry({});
});

  
  /********************
   * CSVエクスポート／インポート
   ********************/
  document.getElementById('exportCsvBtn').addEventListener('click', exportMissionsToCSV);
  function exportMissionsToCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    // プロジェクト名をCSVの先頭行に追加
  csvContent += `projectName,${projectName}\n`;
  csvContent += "sequence,body,altitude,date,fixed,connected\n";
  missions.forEach(mission => {
      const seq = mission.sequence.value;
      const body = mission.body.value;
      const altitude = mission.altitude.value;
      const startDate = mission.startDate.value;
      const endDate = mission.endDate.value;
      const fixed = mission.fixed.checked;
      const connected = mission.connected ? true : false;
      csvContent += `${seq},${body},${altitude},${date},${fixed},${connected}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "missions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  document.getElementById('importCsvInput').addEventListener('change', importMissionsFromCSV);
  function importMissionsFromCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      const csvText = e.target.result;
      parseAndImportCSV(csvText);
    };
    reader.readAsText(file);
  }
  
  function parseAndImportCSV(csvText) {
    const lines = csvText.split(/\r?\n/);
    // プロジェクト名を取得
  const projectLine = lines[0].split(',');
  if (projectLine[0] === "projectName") {
    projectName = projectLine[1];
    projectNameInput.value = projectName;
  }
    // ヘッダー行を除く
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',');
      const missionData = {
        sequence: parts[0],
        body: parts[1],
        altitude: parts[2],
        date: parts[3],
        fixed: parts[4],
        connected: parts[5]
      };
      createMissionEntry(missionData);
    }
     // シーケンス順序を再現
  missions.sort((a, b) => a.id - b.id);
  missions.forEach(mission => missionContainer.appendChild(mission.dom));
  }

  // simTimeInput の両隣にボタンを追加
  const prevDayBtn = document.createElement('button');
  prevDayBtn.textContent = '<';
  const nextDayBtn = document.createElement('button');
  nextDayBtn.textContent = '>';
  simTimeDiv.insertBefore(prevDayBtn, simTimeInput);
  simTimeDiv.appendChild(nextDayBtn);

  let intervalId;
  const intervalTime = 50; // 長押し時の更新間隔（ミリ秒）

  function updateSimTime(days) {
    const currentDate = new Date(simTimeInput.value);
    currentDate.setDate(currentDate.getDate() + days);
    simTimeInput.value = currentDate.toISOString().slice(0, 10);
    updateSolarSystem();
  }

  prevDayBtn.addEventListener('mousedown', () => {
    updateSimTime(-1);
    intervalId = setInterval(() => updateSimTime(-1), intervalTime);
  });

  nextDayBtn.addEventListener('mousedown', () => {
    updateSimTime(1);
    intervalId = setInterval(() => updateSimTime(1), intervalTime);
  });

  prevDayBtn.addEventListener('mouseup', () => clearInterval(intervalId));
  prevDayBtn.addEventListener('mouseleave', () => clearInterval(intervalId));
  nextDayBtn.addEventListener('mouseup', () => clearInterval(intervalId));
  nextDayBtn.addEventListener('mouseleave', () => clearInterval(intervalId));
  
  /********************
   * 天体表示切替用チェックボックス（最小化機能付き）
   ********************/
   const celestialToggleHeader = document.createElement('button');
celestialToggleHeader.id = "celestialToggleHeader";
celestialToggleHeader.textContent = "表示天体設定";
celestialToggleHeader.style.position = 'absolute';
celestialToggleHeader.style.top = '62px'; // csvControlsの下に配置
celestialToggleHeader.style.left = '210px';
celestialToggleHeader.style.padding = '5px 10px'; // アングルボタンと同じpadding
celestialToggleHeader.style.backgroundColor = '#fff'; // アングルボタンと同じ背景色
celestialToggleHeader.style.border = '1px solid #ccc'; // アングルボタンと同じボーダー
celestialToggleHeader.style.borderRadius = '3px'; // アングルボタンと同じ角丸
celestialToggleHeader.style.cursor = 'pointer'; // カーソルをポインターに
leftPanel.appendChild(celestialToggleHeader);

const celestialToggleContent = document.createElement('div');
celestialToggleContent.id = "celestialToggleContent";
celestialToggleContent.style.position = 'absolute';
celestialToggleContent.style.top = '100px'; // celestialToggleHeaderの下に配置
celestialToggleContent.style.left = '10px';
celestialToggleContent.style.backgroundColor = 'rgba(255,255,255,0.8)';
celestialToggleContent.style.padding = '5px';
celestialToggleContent.style.borderRadius = '5px';
celestialToggleContent.style.border = '1px solid #ccc';
celestialToggleContent.style.display = "none"; // 初期状態は非表示
leftPanel.appendChild(celestialToggleContent);
  
  const toggleBodies = ["Sun", ...Object.keys(celestialData), "Moon"];
  toggleBodies.forEach(name => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = "checkbox";
    checkbox.checked = (name !== "Itokawa" && name !== "Ryugu");
    checkbox.value = name;
    checkbox.addEventListener('change', () => {
      if(celestialMeshes[name]) celestialMeshes[name].visible = checkbox.checked;
      if(haloMeshes[name]) haloMeshes[name].visible = checkbox.checked;
      if(orbitCircles[name]) orbitCircles[name].visible = checkbox.checked;
    });
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(" " + name));
    celestialToggleContent.appendChild(label);
    // 初期化時に change イベントを発生させる
    checkbox.dispatchEvent(new Event('change'));
  });
  
  celestialToggleHeader.addEventListener('click', () => {
    if(celestialToggleContent.style.display === "none") {
      celestialToggleContent.style.display = "block";
    } else {
      celestialToggleContent.style.display = "none";
    }
  });
  
  /********************
   * アニメーションループ
   ********************/
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    for (const name in haloMeshes) {
      const halo = haloMeshes[name];
      const distance = camera.position.distanceTo(halo.position);
      const scale = distance * Math.tan(Math.PI / 8) / 30;
      halo.scale.set(scale, scale, scale);
    }
    renderer.render(scene, camera);
  }
  animate();
