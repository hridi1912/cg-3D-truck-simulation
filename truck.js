import * as THREE from 'three';
import { createEnvironment, updateEnvironment, createSky, createClouds, updateClouds } from './environment.js';

// TEXTURES
const textureLoader = new THREE.TextureLoader();

const truckTexture = textureLoader.load('texture/truck.jpg');
const tireTexture = textureLoader.load('texture/tire.jpg');
const metalTexture = textureLoader.load('texture/metal.jpg');
const windowTexture = textureLoader.load('texture/window.jpg');
const roofTexture = textureLoader.load('texture/roof.jpg');

// 1. SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb0e0e6);
scene.fog = new THREE.FogExp2(0xcfe9f5, 0.01);

// 2. CAMERA - PERSPECTIVE PROJECTION
const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.5,
    400
);

camera.position.set(7, 9, 20);
camera.lookAt(0, 2.2, 0);

// 3. RENDERER
const renderer = new THREE.WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: true
});

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

document.body.appendChild(
    renderer.domElement
);
// 3B. ENVIRONMENT REFLECTIONS (day + night)

const pmremGenerator = new THREE.PMREMGenerator(renderer);

function makeEnvTexture(sky, horizon, ground) {
    const envScene = new THREE.Scene();
    const geo = new THREE.SphereGeometry(60, 32, 32);
    const colors = [];
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const ny = pos.getY(i) / 60;
        const c = ny >= 0
            ? sky.clone().lerp(horizon, 1 - ny)
            : ground.clone().lerp(horizon, 1 + ny);
        colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    envScene.add(new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true })
    ));
    return pmremGenerator.fromScene(envScene, 0.04).texture;
}

const envDay = makeEnvTexture(
    new THREE.Color(0xbfe3f5), new THREE.Color(0xf5f0e6), new THREE.Color(0x555045));
const envNight = makeEnvTexture(
    new THREE.Color(0x0a1230), new THREE.Color(0x1a2445), new THREE.Color(0x05060a));

pmremGenerator.dispose();
scene.environment = envDay;

// 4. TRUCK GROUP
const truck = new THREE.Group();

function makeCanvasTexture(w, h, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    draw(ctx, w, h);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
}

// 5. MATERIALS (Enhanced Realism & PBR Tuning)
const whiteMaterial = new THREE.MeshPhysicalMaterial({
    map: truckTexture,
    bumpMap: truckTexture,
    bumpScale: 0.012,
    metalness: 0.22,
    roughness: 0.32,
    clearcoat: 1.0,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.9
});

const blueMaterial = new THREE.MeshPhysicalMaterial({
    map: truckTexture,
    bumpMap: truckTexture,
    bumpScale: 0.012,
    metalness: 0.28,
    roughness: 0.28,
    clearcoat: 1.0,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.9
});

const darkBlueMaterial = new THREE.MeshStandardMaterial({
    map: roofTexture,
    bumpMap: roofTexture,
    bumpScale: 0.08,
    color: 0x0c2a58,
    metalness: 0.25,
    roughness: 0.5,
    envMapIntensity: 0.6
});

const redMaterial = new THREE.MeshStandardMaterial({
    map: metalTexture,
    bumpMap: metalTexture,
    bumpScale: 0.02,
    color: 0xe21810,
    metalness: 0.15,
    roughness: 0.35,
    envMapIntensity: 0.6
});

const windowMaterial = new THREE.MeshPhysicalMaterial({
    map: windowTexture,
    metalness: 0.1,
    roughness: 0.9,
    transmission: 0.55,
    transparent: true,
    opacity: 0.75,
    ior: 1.52,
    clearcoat: 0.6,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.45
});

const tireMaterial = new THREE.MeshStandardMaterial({
    map: tireTexture,
    color: 0x555555,
    roughness: 1.0,
    metalness: 0.0
});

const silverMaterial = new THREE.MeshStandardMaterial({
    map: metalTexture,
    bumpMap: metalTexture,
    bumpScale: 0.03,
    metalness: 0.95,
    roughness: 0.14,
    envMapIntensity: 1.3
});

const blackMaterial = new THREE.MeshStandardMaterial({
    map: metalTexture,
    bumpMap: metalTexture,
    bumpScale: 0.02,
    color: 0x1d1d1d,
    roughness: 0.75,
    metalness: 0.1
});

const headlightMaterial = new THREE.MeshStandardMaterial({
    map: metalTexture,
    color: 0xE1CE22,
    emissive: 0xffffaa,
    emissiveIntensity: 0.8,
    roughness: 0.1
});

const rearLightMaterial = new THREE.MeshStandardMaterial({
    map: metalTexture,
    color: 0x880000,
    emissive: 0xff0000,
    emissiveIntensity: 0.8,
    roughness: 0.1
});

const amberMaterial = new THREE.MeshStandardMaterial({
    map: metalTexture,
    color: 0xff9900,
    emissive: 0xff6600,
    emissiveIntensity: 0.6
});

const licensePlateTexture = makeCanvasTexture(256, 128, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#f4f0dc');
    bg.addColorStop(1, '#e5decb');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#1d3d6b';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    ctx.fillStyle = '#1d3d6b';
    ctx.fillRect(4, 4, w - 8, 22);
    ctx.fillStyle = '#f4f0dc';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('U.S. MAIL SERVICE', w / 2, 20);

    ctx.fillStyle = '#16233a';
    ctx.font = 'bold 44px monospace';
    ctx.fillText('MAIL·07', w / 2, 90);

    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#3a4a5e';
    ctx.fillText('OFFICIAL VEHICLE', w / 2, 113);
});

const licensePlateMaterial = new THREE.MeshStandardMaterial({
    map: licensePlateTexture,
    roughness: 0.45,
    metalness: 0.15
});

// 6. LOWER BODY
const lowerBodyGeometry = new THREE.BoxGeometry(7.5, 1.25, 2.7);
const lowerBody = new THREE.Mesh(lowerBodyGeometry, whiteMaterial);
lowerBody.position.set(-0.25, 1.65, 0);
lowerBody.castShadow = true;
lowerBody.receiveShadow = true;
truck.add(lowerBody);

// 6B. UNDERBODY SHADOW PANEL
const bellyGeometry = new THREE.BoxGeometry(7.3, 0.12, 2.5);
const belly = new THREE.Mesh(bellyGeometry, blackMaterial);
belly.position.set(-0.25, 0.95, 0);
truck.add(belly);

// 7. FRONT CABIN - TEXTURED BODY

const cabinShape = new THREE.Shape();

cabinShape.moveTo(-1.4, 0);
cabinShape.lineTo(-1.4, 1.6);
cabinShape.lineTo(-1.05, 2.65);
cabinShape.lineTo(1.05, 2.65);
cabinShape.lineTo(1.2, 0);
cabinShape.lineTo(-1.4, 0);

const cabinMaterial = whiteMaterial.clone();

if (whiteMaterial.map) {
    cabinMaterial.map = whiteMaterial.map.clone();

    cabinMaterial.map.wrapS = THREE.RepeatWrapping;
    cabinMaterial.map.wrapT = THREE.RepeatWrapping;

    cabinMaterial.map.repeat.set(1.5, 1.5);
    cabinMaterial.map.needsUpdate = true;
}

const cabinGeometry = new THREE.ExtrudeGeometry(cabinShape, {
    depth: 2.5,

    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    bevelSegments: 3
});

const cabin = new THREE.Mesh(
    cabinGeometry,
    cabinMaterial
);

cabin.position.set(-2.25, 1.9, -1.25);

cabin.castShadow = true;
cabin.receiveShadow = true;

truck.add(cabin);

// 7B. FRONT WALL TRIM PANEL
const frontWallPanelGeometry = new THREE.BoxGeometry(
    0.05,  // Thickness
    1.6,   // Height
    2.3    // Width
);

const frontWallPanel = new THREE.Mesh(
    frontWallPanelGeometry,
    cabinMaterial
);

frontWallPanel.position.set(-3.68, 2.7, 0);

frontWallPanel.castShadow = true;
frontWallPanel.receiveShadow = true;

truck.add(frontWallPanel);

// 8. CABIN ROOF

const roofGeometry = new THREE.BoxGeometry(2.6, 0.18, 2.65);
const roof = new THREE.Mesh(roofGeometry, whiteMaterial);
roof.position.set(-1.9, 4.62, 0);
roof.castShadow = true;
truck.add(roof);

// 8B. ROOF ANTENNA

const antennaGeometry = new THREE.CylinderGeometry(0.015, 0.02, 1.1, 8);
const antenna = new THREE.Mesh(antennaGeometry, blackMaterial);
antenna.position.set(-1.2, 5.25, -1.0);
antenna.rotation.z = 0.08;
truck.add(antenna);

// 9. FRONT WINDSHIELD WITH FRAME
const windshieldFrameGeo = new THREE.BoxGeometry(0.08, 1.05, 2.13);
const windshieldFrame = new THREE.Mesh(windshieldFrameGeo, blackMaterial);
windshieldFrame.position.set(-3.48, 4.025, 0);
windshieldFrame.rotation.z = -0.32;
truck.add(windshieldFrame);

// Blue Glass
const windshieldGeometry = new THREE.BoxGeometry(0.06, 0.95, 2.05);
const windshield = new THREE.Mesh(windshieldGeometry, windowMaterial);
windshield.position.set(-3.53, 4.025, 0);
windshield.rotation.z = -0.32;
truck.add(windshield);

// 9B. WIPER BLADES
const wiperGroup = new THREE.Group();
wiperGroup.position.copy(windshield.position);
wiperGroup.rotation.z = windshield.rotation.z;
truck.add(wiperGroup);

const wiperGeometry = new THREE.BoxGeometry(0.05, 0.9, 0.06);

const wiperOffsetX = -(0.03 + 0.025 + 0.004);
const wiperY = -0.3;                    // parked low on the glass
const wiperTilt = Math.PI / 2 - 0.26;   // lies nearly flat across the glass, slightly raised

const wiperLeft = new THREE.Mesh(wiperGeometry, blackMaterial);
wiperLeft.position.set(wiperOffsetX, wiperY, 0.5);
wiperLeft.rotation.x = wiperTilt;
wiperGroup.add(wiperLeft);

// 10. WINDSHIELD CENTER DIVIDER
const windshieldDividerGeometry = new THREE.BoxGeometry(0.08, 0.85, 0.08);
const windshieldDivider = new THREE.Mesh(windshieldDividerGeometry, blackMaterial);
windshieldDivider.position.set(-3.545, 4.025, 0);
windshieldDivider.rotation.z = -0.32;
truck.add(windshieldDivider);

// 11. SIDE WINDOWS WITH FRAMES
const sideWindowGeo = new THREE.BoxGeometry(1.35, 1.25, 0.06);
const sideFrameGeo = new THREE.BoxGeometry(1.43, 1.33, 0.08);

// Left Window + Frame
const leftFrame = new THREE.Mesh(sideFrameGeo, blackMaterial);
leftFrame.position.set(-2.2, 3.55, 1.31);
leftFrame.rotation.z = -0.08;
truck.add(leftFrame);

const leftWindow = new THREE.Mesh(sideWindowGeo, windowMaterial);
leftWindow.position.set(-2.2, 3.55, 1.36);
leftWindow.rotation.z = -0.08;
truck.add(leftWindow);

// Right Window + Frame
const rightFrame = new THREE.Mesh(sideFrameGeo, blackMaterial);
rightFrame.position.set(-2.2, 3.55, -1.31);
rightFrame.rotation.z = -0.08;
truck.add(rightFrame);

const rightWindow = new THREE.Mesh(sideWindowGeo, windowMaterial);
rightWindow.position.set(-2.2, 3.55, -1.36);
rightWindow.rotation.z = -0.08;
truck.add(rightWindow);

// 12. CARGO / MAIL COMPARTMENT
const cargoGeometry = new THREE.BoxGeometry(4.8, 3.55, 2.65);
const cargo = new THREE.Mesh(cargoGeometry, whiteMaterial);
cargo.position.set(1.35, 3.35, 0);
cargo.castShadow = true;
cargo.receiveShadow = true;
truck.add(cargo);

// 13. CARGO ROOF
const cargoRoofGeometry = new THREE.BoxGeometry(4.95, 0.18, 2.8);
const cargoRoof = new THREE.Mesh(cargoRoofGeometry, darkBlueMaterial);
cargoRoof.position.set(1.35, 5.15, 0);
cargoRoof.castShadow = true;
truck.add(cargoRoof);

// 14. BLUE SIDE STRIPE
const blueStripeGeometry = new THREE.BoxGeometry(4.85, 0.18, 0.08);

const blueStripeLeft = new THREE.Mesh(blueStripeGeometry, blueMaterial);
blueStripeLeft.position.set(1.35, 3.0, 1.36);
truck.add(blueStripeLeft);

const blueStripeRight = new THREE.Mesh(blueStripeGeometry, blueMaterial);
blueStripeRight.position.set(1.35, 3.0, -1.36);
truck.add(blueStripeRight);

// 14B. LOWER BODY CHROME ACCENT STRIPE

const accentStripeGeometry = new THREE.BoxGeometry(7.3, 0.05, 0.06);

const accentStripeLeft = new THREE.Mesh(accentStripeGeometry, silverMaterial);
accentStripeLeft.position.set(-0.25, 2.05, 1.36);
truck.add(accentStripeLeft);

const accentStripeRight = new THREE.Mesh(accentStripeGeometry, silverMaterial);
accentStripeRight.position.set(-0.25, 2.05, -1.36);
truck.add(accentStripeRight);

// 15. RED STRIPE
const redStripeGeometry = new THREE.BoxGeometry(4.85, 0.12, 0.09);

const redStripeLeft = new THREE.Mesh(redStripeGeometry, redMaterial);
redStripeLeft.position.set(1.35, 3.23, 1.37);
truck.add(redStripeLeft);

const redStripeRight = new THREE.Mesh(redStripeGeometry, redMaterial);
redStripeRight.position.set(1.35, 3.23, -1.37);
truck.add(redStripeRight);

// 16. CARGO PANEL LINES
for (let x = -0.7; x <= 3.35; x += 0.8) {
    const panelGeometry = new THREE.BoxGeometry(0.045, 3.1, 0.04);

    const panelLeft = new THREE.Mesh(panelGeometry, silverMaterial);
    panelLeft.position.set(x, 3.35, 1.365);
    truck.add(panelLeft);

    const panelRight = new THREE.Mesh(panelGeometry, silverMaterial);
    panelRight.position.set(x, 3.35, -1.365);
    truck.add(panelRight);
}

// 17. CAB DOORS (LEFT & RIGHT)
const cabDoorGeometry = new THREE.BoxGeometry(1.6, 2.3, 0.04);
const cabDoorSeamGeometry = new THREE.BoxGeometry(1.7, 2.4, 0.02); 
const doorHingeGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 12);
const cabHandleGeo = new THREE.BoxGeometry(0.25, 0.06, 0.08);
const doorStripGeo = new THREE.BoxGeometry(1.6, 0.06, 0.06);

// --- Left Cab Door ---
const leftDoorSeam = new THREE.Mesh(cabDoorSeamGeometry, blackMaterial);
leftDoorSeam.position.set(-2.2, 2.7, 1.255);
truck.add(leftDoorSeam);

const leftCabDoor = new THREE.Mesh(cabDoorGeometry, blueMaterial);
leftCabDoor.position.set(-2.2, 2.7, 1.29); // pushed out a bit further so it clearly stands proud of the cabin surface
truck.add(leftCabDoor);

// Left Door Black Strip (No Red)
const leftDoorStrip = new THREE.Mesh(doorStripGeo, blackMaterial);
leftDoorStrip.position.set(-2.2, 2.0, 1.31);
truck.add(leftDoorStrip);

// Left Door Handle
const leftCabHandle = new THREE.Mesh(cabHandleGeo, silverMaterial);
leftCabHandle.position.set(-1.6, 2.6, 1.34);
truck.add(leftCabHandle);

// Left Door Hinges
const leftHingeTop = new THREE.Mesh(doorHingeGeo, blackMaterial);
leftHingeTop.position.set(-2.85, 3.4, 1.31);
truck.add(leftHingeTop);

const leftHingeBottom = new THREE.Mesh(doorHingeGeo, blackMaterial);
leftHingeBottom.position.set(-2.85, 2.0, 1.31);
truck.add(leftHingeBottom);


// --- Right Cab Door ---
const rightDoorSeam = new THREE.Mesh(cabDoorSeamGeometry, blackMaterial);
rightDoorSeam.position.set(-2.2, 2.7, -1.255);
truck.add(rightDoorSeam);

const rightCabDoor = new THREE.Mesh(cabDoorGeometry, blueMaterial);
rightCabDoor.position.set(-2.2, 2.7, -1.29);
truck.add(rightCabDoor);

// Right Door Black Strip (No Red)
const rightDoorStrip = new THREE.Mesh(doorStripGeo, blackMaterial);
rightDoorStrip.position.set(-2.2, 2.0, -1.31);
truck.add(rightDoorStrip);

// Right Door Handle
const rightCabHandle = new THREE.Mesh(cabHandleGeo, silverMaterial);
rightCabHandle.position.set(-1.6, 2.6, -1.34);
truck.add(rightCabHandle);

// Right Door Hinges
const rightHingeTop = new THREE.Mesh(doorHingeGeo, blackMaterial);
rightHingeTop.position.set(-2.85, 3.4, -1.31);
truck.add(rightHingeTop);

const rightHingeBottom = new THREE.Mesh(doorHingeGeo, blackMaterial);
rightHingeBottom.position.set(-2.85, 2.0, -1.31);
truck.add(rightHingeBottom);

// 18. CARGO DELIVERY & REAR DOORS
// --- Side Sliding Delivery Door ---
const deliveryDoorSeamGeo = new THREE.BoxGeometry(1.4, 2.7, 0.03);
const deliveryDoorSeam = new THREE.Mesh(deliveryDoorSeamGeo, blackMaterial);
deliveryDoorSeam.position.set(0.0, 3.0, 1.365);
truck.add(deliveryDoorSeam);

const deliveryDoorGeo = new THREE.BoxGeometry(1.3, 2.6, 0.07);
const deliveryDoor = new THREE.Mesh(deliveryDoorGeo, whiteMaterial);
deliveryDoor.position.set(0.0, 3.0, 1.40); 
truck.add(deliveryDoor);

// Side Door Frame / Sliding Track
const trackGeometry = new THREE.BoxGeometry(1.6, 0.08, 0.08);
const doorTrack = new THREE.Mesh(trackGeometry, darkBlueMaterial);
doorTrack.position.set(0.0, 4.35, 1.43);
truck.add(doorTrack);

// Side Door Handle
const sideDoorHandleGeo = new THREE.BoxGeometry(0.35, 0.08, 0.08);
const sideDoorHandle = new THREE.Mesh(sideDoorHandleGeo, blackMaterial);
sideDoorHandle.position.set(0.45, 3.15, 1.46);
truck.add(sideDoorHandle);

// --- Rear Cargo Doors (Left & Right Split) ---
const rearDoorGeo = new THREE.BoxGeometry(0.06, 3.3, 1.25);

// Rear Left Door — nudged from x=3.78 to x=3.80 so its back face (which was
// exactly coincident with the cargo box's own rear face at x=3.75) no
// longer shares a plane with it (another source of flicker).
const rearLeftDoor = new THREE.Mesh(rearDoorGeo, whiteMaterial);
rearLeftDoor.position.set(3.80, 3.35, 0.63);
truck.add(rearLeftDoor);

// Rear Right Door
const rearRightDoor = new THREE.Mesh(rearDoorGeo, whiteMaterial);
rearRightDoor.position.set(3.80, 3.35, -0.63);
truck.add(rearRightDoor);

// Rear Door Latch & Lock Bar
const lockBarGeo = new THREE.CylinderGeometry(0.025, 0.025, 2.8, 12);
const rearLockBar = new THREE.Mesh(lockBarGeo, silverMaterial);
rearLockBar.position.set(3.84, 3.35, 0.0);
truck.add(rearLockBar);

// Rear Door Handle
const rearHandleGeo = new THREE.BoxGeometry(0.08, 0.25, 0.08);
const rearHandle = new THREE.Mesh(rearHandleGeo, blackMaterial);
rearHandle.position.set(3.85, 3.0, 0.1);
truck.add(rearHandle);

// 19. FRONT BUMPER
const bumperGeometry = new THREE.BoxGeometry(0.17, 0.55, 3.0);
const bumper = new THREE.Mesh(bumperGeometry, blackMaterial);
bumper.position.set(-4.2, 1.15, 0); // the lower body's front face sits at x=-4.0, so the bumper now sits proud of it instead of buried inside it
bumper.castShadow = true;
truck.add(bumper);

// 20. FRONT GRILLE
const grilleGeometry = new THREE.BoxGeometry(0.07, 0.7, 1.4);
const grille = new THREE.Mesh(grilleGeometry, blackMaterial);
grille.position.set(-4.05, 1.8, 0);
truck.add(grille);

// 21. GRILLE BARS
for (let z = -0.55; z <= 0.55; z += 0.22) {
    const barGeometry = new THREE.BoxGeometry(0.1, 0.62, 0.07);
    const bar = new THREE.Mesh(barGeometry, silverMaterial);
    bar.position.set(-4.11, 1.8, z);
    truck.add(bar);
}

// 22. HEADLIGHTS
function createHeadlight(z) {
    const geometry = new THREE.BoxGeometry(0.22, 0.3, 0.5);
    const light = new THREE.Mesh(geometry, headlightMaterial);
    light.position.set(-3.97, 2.0, z);
    truck.add(light);

    const bezelGeometry = new THREE.BoxGeometry(0.06, 0.38, 0.58);
    const bezel = new THREE.Mesh(bezelGeometry, silverMaterial);
    bezel.position.set(-4.02, 2.0, z);
    truck.add(bezel);
}

createHeadlight(1.0);
createHeadlight(-1.0);

// 23. ROOF MARKER LIGHTS
function createRoofLight(x, z) {
    const geometry = new THREE.BoxGeometry(0.3, 0.16, 0.25);
    const light = new THREE.Mesh(geometry, amberMaterial);
    light.position.set(x, 4.75, z);
    truck.add(light);
}

createRoofLight(-2.7, 0);
createRoofLight(-2.1, 0);
createRoofLight(-1.5, 0);

// 24. SIDE MIRRORS - AUTOMOTIVE STYLE, SLIGHTLY INWARD
const mirrorGeometry = new THREE.BoxGeometry(0.3, 0.55, 0.12);

// --- Left Mirror Housing ---

const mirrorLeft = new THREE.Mesh(
    mirrorGeometry,
    blackMaterial
);

mirrorLeft.position.set(-2.95, 3.35, 1.62);
mirrorLeft.rotation.y = -Math.PI / 12; 

mirrorLeft.castShadow = true;
truck.add(mirrorLeft);

// --- Right Mirror Housing ---
const mirrorRight = new THREE.Mesh(
    mirrorGeometry,
    blackMaterial
);

mirrorRight.position.set(-2.95, 3.35, -1.62);
mirrorRight.rotation.y = Math.PI + Math.PI / 12; // Slightly angled back toward cabin

mirrorRight.castShadow = true;
truck.add(mirrorRight);

// 24A. MIRROR SUPPORT ARMS - CONNECT TO CABIN
const mirrorArmGeometry = new THREE.CylinderGeometry(
    0.035, // Top radius
    0.045, // Bottom radius
    1,     // Length (scaled to fit)
    12
);

// Helper function to create an angled mirror arm
function createMirrorArm(start, end) {
    const arm = new THREE.Mesh(
        mirrorArmGeometry,
        blackMaterial
    );

    const startPoint = new THREE.Vector3(...start);
    const endPoint = new THREE.Vector3(...end);

    // Position arm between cabin and mirror
    const direction = new THREE.Vector3()
        .subVectors(endPoint, startPoint);

    const length = direction.length();

    arm.position.copy(startPoint).add(endPoint).multiplyScalar(0.5);

    // Stretch arm to connect both points
    arm.scale.y = length;

    // Align cylinder with the connection direction
    arm.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize()
    );

    arm.castShadow = true;

    truck.add(arm);
    return arm;
}


// --- Left Mirror Support Arm ---
createMirrorArm(
    [-2.72, 3.25, 1.20],  // Cabin mounting point
    [-2.95, 3.35, 1.56]   // Mirror housing connection
);


// --- Right Mirror Support Arm ---
createMirrorArm(
    [-2.72, 3.25, -1.20], // Cabin mounting point
    [-2.95, 3.35, -1.56]  // Mirror housing connection
);

// 24B. MIRROR GLASS - RECESSED, MATCHING THE ANGLE

const mirrorGlassGeometry = new THREE.PlaneGeometry(0.24, 0.42);

const mirrorOffset = 0.065;

// --- Left Mirror Glass ---
const mirrorGlassLeft = new THREE.Mesh(
    mirrorGlassGeometry,
    silverMaterial
);

mirrorGlassLeft.position.set(
    -2.95 + Math.sin(Math.PI - Math.PI / 12) * mirrorOffset,
    3.35,
    1.62 + Math.cos(Math.PI - Math.PI / 12) * mirrorOffset
);

mirrorGlassLeft.rotation.y = Math.PI - Math.PI / 12;

truck.add(mirrorGlassLeft);


// --- Right Mirror Glass ---
const mirrorGlassRight = new THREE.Mesh(
    mirrorGlassGeometry,
    silverMaterial
);

mirrorGlassRight.position.set(
    -2.95 + Math.sin(Math.PI / 12) * mirrorOffset,
    3.35,
    -1.62 + Math.cos(Math.PI / 12) * mirrorOffset
);

mirrorGlassRight.rotation.y = Math.PI / 12;

truck.add(mirrorGlassRight);

// 25. SIDE STEPS & MUD FLAPS
const stepGeometry = new THREE.BoxGeometry(1.4, 0.3, 0.6);

const stepLeft = new THREE.Mesh(stepGeometry, blackMaterial);
stepLeft.position.set(-2.25, 1.0, 1.5);
truck.add(stepLeft);

const stepRight = new THREE.Mesh(stepGeometry, blackMaterial);
stepRight.position.set(-2.25, 1.0, -1.5);
truck.add(stepRight);

// Mud Flaps behind rear wheels
const flapGeo = new THREE.BoxGeometry(0.08, 0.6, 0.8);
const rearMudFlap = new THREE.Mesh(flapGeo, blackMaterial);
rearMudFlap.position.set(2.8, 0.8, 0);
truck.add(rearMudFlap);

// 26. WHEEL FUNCTION (Enhanced Rim Details & Tread)
function createWheel(x, z) {
    const wheelGroup = new THREE.Group();

    // Tire
    const tireGeometry = new THREE.CylinderGeometry(0.92, 0.92, 0.55, 32);
    const tire = new THREE.Mesh(tireGeometry, tireMaterial);
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Rim
    const rimGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.59, 32);
    const rim = new THREE.Mesh(rimGeometry, silverMaterial);
    rim.rotation.x = Math.PI / 2;
    wheelGroup.add(rim);

    // Hub center
    const hubGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.65, 24);
    const hub = new THREE.Mesh(hubGeometry, blackMaterial);
    hub.rotation.x = Math.PI / 2;
    wheelGroup.add(hub);

    // Lug nuts ring detail
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const nutGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.68, 8);
        const nut = new THREE.Mesh(nutGeo, silverMaterial);
        nut.rotation.x = Math.PI / 2;
        nut.position.set(Math.cos(angle) * 0.28, Math.sin(angle) * 0.28, 0);
        wheelGroup.add(nut);
    }

    wheelGroup.position.set(x, 0.9, z);
    truck.add(wheelGroup);

    return wheelGroup;
}

// 27. FOUR WHEELS
const frontLeftWheel = createWheel(-2.0, 1.4);
const frontRightWheel = createWheel(-2.0, -1.4);
const rearLeftWheel = createWheel(2.0, 1.4);
const rearRightWheel = createWheel(2.0, -1.4);

// 27B. WHEEL ARCH TRIM
function createWheelArch(x, z) {

    const archGeometry = new THREE.TorusGeometry(
        1.05,
        0.07,
        8,
        24,
        Math.PI
    );

    const arch = new THREE.Mesh(
        archGeometry,
        blackMaterial
    );

    arch.position.set(x, 0.85, z);
    arch.castShadow = true;

    truck.add(arch);
}
createWheelArch(-2.0, 1.4);
createWheelArch(-2.0, -1.4);
createWheelArch(2.0, 1.4);
createWheelArch(2.0, -1.4);

// 28. REAR LIGHTS & LICENSE PLATE
const rearLightGeometry = new THREE.BoxGeometry(0.18, 0.45, 0.4);

const rearLightLeft = new THREE.Mesh(rearLightGeometry, rearLightMaterial);
rearLightLeft.position.set(3.8, 1.9, 0.9);
truck.add(rearLightLeft);

const rearLightRight = new THREE.Mesh(rearLightGeometry, rearLightMaterial);
rearLightRight.position.set(3.8, 1.9, -0.9);
truck.add(rearLightRight);

const tailBezelGeometry = new THREE.BoxGeometry(0.06, 0.53, 0.48);
const tailBezelLeft = new THREE.Mesh(tailBezelGeometry, silverMaterial);
tailBezelLeft.position.set(3.84, 1.9, 0.9);
truck.add(tailBezelLeft);
const tailBezelRight = new THREE.Mesh(tailBezelGeometry, silverMaterial);
tailBezelRight.position.set(3.84, 1.9, -0.9);
truck.add(tailBezelRight);


const plateFrameGeo = new THREE.BoxGeometry(0.03, 0.4, 0.78);
const plateFrame = new THREE.Mesh(plateFrameGeo, silverMaterial);
plateFrame.position.set(3.80, 1.4, 0);
truck.add(plateFrame);

const plateGeo = new THREE.BoxGeometry(0.05, 0.32, 0.62);
const licensePlate = new THREE.Mesh(plateGeo, licensePlateMaterial);
licensePlate.position.set(3.835, 1.4, 0);
truck.add(licensePlate);

// 30. FUEL TANK
const fuelTankGeometry = new THREE.CylinderGeometry(0.35, 0.35, 1.5, 24);
const fuelTank = new THREE.Mesh(fuelTankGeometry, silverMaterial);
fuelTank.rotation.z = Math.PI / 2;
fuelTank.position.set(-0.4, 1.15, 1.48);
truck.add(fuelTank);

// 31. MAIL LOGO DESIGN WITH CUSTOM SHADER
const logoGeometry = new THREE.BoxGeometry(0.9, 0.55, 0.04);

// Vertex Shader
const logoVertexShader = `
    #include <common>
    #include <logdepthbuf_pars_vertex>

    varying vec2 vUv;

    void main() {
        vUv = uv;

        gl_Position = projectionMatrix * modelViewMatrix *
                      vec4(position, 1.0);

        #include <logdepthbuf_vertex>
    }
`;

const logoFragmentShader = `
    #include <common>
    #include <logdepthbuf_pars_fragment>
    uniform float time;

    varying vec2 vUv;

    // distance from point p to the segment a-b
    float sdSegment(vec2 p, vec2 a, vec2 b) {
        vec2 pa = p - a;
        vec2 ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * h);
    }

    void main() {
        #include <logdepthbuf_fragment>
        vec2 uv = vUv;

        // brushed metal base with fine streaks
        float streaks = sin((uv.x + uv.y) * 70.0) * 0.025;
        vec3 metal = vec3(0.72, 0.74, 0.77) + streaks;

        // slow diagonal sheen sweeping across the plate
        float diag = uv.x + uv.y;
        float sweep = smoothstep(0.06, 0.0, abs(mod(diag - time * 0.25, 1.6) - 0.8));
        metal += sweep * 0.3;

        // darker shading near the plate edges, like a beveled frame
        float edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
        metal *= mix(0.55, 1.0, smoothstep(0.0, 0.05, edgeDist));

        // envelope icon — a rectangle outline plus a folded-flap "V"
        vec2 p = (uv - 0.5) * vec2(2.0, 1.25);
        vec2 halfSize = vec2(0.62, 0.36);

        vec2 d = abs(p) - halfSize;
        float outsideDist = length(max(d, 0.0));
        float insideDist = min(max(d.x, d.y), 0.0);
        float edgeSigned = outsideDist + insideDist;
        float outline = 1.0 - smoothstep(0.035, 0.06, abs(edgeSigned));

        float flapL = sdSegment(p, vec2(-halfSize.x, halfSize.y), vec2(0.0, -0.02));
        float flapR = sdSegment(p, vec2(halfSize.x, halfSize.y), vec2(0.0, -0.02));
        float flap = 1.0 - smoothstep(0.035, 0.06, min(flapL, flapR));

        float icon = clamp(outline + flap, 0.0, 1.0);
        vec3 iconColor = vec3(0.04, 0.08, 0.20);

        vec3 color = mix(metal, iconColor, icon);

        gl_FragColor = vec4(color, 1.0);
    }
`;

const logoShaderMaterial = new THREE.ShaderMaterial({
    vertexShader: logoVertexShader,
    fragmentShader: logoFragmentShader,

    uniforms: {
        time: {
            value: 0
        }
    }
});

const logoFrameGeometry = new THREE.BoxGeometry(1.02, 0.67, 0.02);
const logoFrame = new THREE.Mesh(logoFrameGeometry, silverMaterial);
logoFrame.position.set(1.7, 3.8, 1.40);
truck.add(logoFrame);

const logo = new THREE.Mesh(
    logoGeometry,
    logoShaderMaterial
);

logo.position.set(1.7, 3.8, 1.43);

truck.add(logo);

const rivetGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.03, 8);
[[-0.47, 0.29], [0.47, 0.29], [-0.47, -0.29], [0.47, -0.29]].forEach(([dx, dy]) => {
    const rivet = new THREE.Mesh(rivetGeometry, silverMaterial);
    rivet.rotation.x = Math.PI / 2;
    rivet.position.set(1.7 + dx, 3.8 + dy, 1.435);
    truck.add(rivet);
});

// 32. ADD TRUCK TO SCENE

truck.rotation.y = Math.PI / 2;

scene.add(truck);

// 33. PROFESSIONAL STUDIO LIGHTING SETUP
const ambientLight = new THREE.AmbientLight(0xffffff, 0.42);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xfff5e6, 2.7);
directionalLight.position.set(10, 15, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 4096;
directionalLight.shadow.mapSize.height = 4096;
directionalLight.shadow.bias = -0.0005;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 40;
directionalLight.shadow.camera.left = -8;
directionalLight.shadow.camera.right = 8;
directionalLight.shadow.camera.top = 8;
directionalLight.shadow.camera.bottom = -8;
scene.add(directionalLight);


directionalLight.target.position.set(0, 2, 0);
scene.add(directionalLight.target);


const fillLight = new THREE.DirectionalLight(0x88bbff, 0.5);
fillLight.position.set(-10, 8, -10);
scene.add(fillLight);

const lightMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff5e6 })
);
scene.add(lightMarker);

// 34. MOUSE INTERACTION - LIGHT CONTROL

let lightAzimuth = 0.6;
let lightElevation = 0.8;
const lightRadius = 20;

window.addEventListener('mousemove', (event) => {
    const nx = (event.clientX / window.innerWidth) * 2 - 1;   // -1 .. 1
    const ny = (event.clientY / window.innerHeight) * 2 - 1;  // -1 .. 1

    lightAzimuth = nx * Math.PI;
    lightElevation = THREE.MathUtils.clamp(0.15 + (-ny) * 0.9, 0.1, 1.45);
});

function updateLight() {
    const lx = lightRadius * Math.cos(lightElevation) * Math.sin(lightAzimuth);
    const ly = lightRadius * Math.sin(lightElevation) + 4;
    const lz = lightRadius * Math.cos(lightElevation) * Math.cos(lightAzimuth);

    directionalLight.position.set(lx, ly, lz);
    lightMarker.position.set(lx, ly, lz);
}

// 35. KEYBOARD INTERACTION - CAMERA CONTROL
const keys = {};

window.addEventListener('keydown', (event) => {
    keys[event.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (event) => {
    keys[event.key.toLowerCase()] = false;
});

let camAzimuth = 0.34;   
let camElevation = 0.30;
let camRadius = 23;
const camTargetY = 2.2;

function updateCamera(deltaTime) {
    const rotSpeed = 1.4 * deltaTime;
    const zoomSpeed = 12 * deltaTime;

    if (keys['arrowleft'] || keys['a']) camAzimuth -= rotSpeed;
    if (keys['arrowright'] || keys['d']) camAzimuth += rotSpeed;
    if (keys['arrowup'] || keys['w']) camElevation = THREE.MathUtils.clamp(camElevation + rotSpeed, 0.08, 1.45);
    if (keys['arrowdown'] || keys['s']) camElevation = THREE.MathUtils.clamp(camElevation - rotSpeed, 0.08, 1.45);
    if (keys['+']) camRadius = THREE.MathUtils.clamp(camRadius - zoomSpeed, 8, 70);
    if (keys['-']) camRadius = THREE.MathUtils.clamp(camRadius + zoomSpeed, 8, 70);

    camera.position.set(
        camRadius * Math.cos(camElevation) * Math.sin(camAzimuth),
        camRadius * Math.sin(camElevation) + camTargetY,
        camRadius * Math.cos(camElevation) * Math.cos(camAzimuth)
    );
    camera.lookAt(0, camTargetY, 0);
}

// 36. GROUND & ROAD SCENE
const environment = createEnvironment();
scene.add(environment);
const sky = createSky();
scene.add(sky);
const clouds = createClouds();
scene.add(clouds);

// 37. ON-SCREEN CONTROLS HINT
const controlsPanel = document.createElement('div');
controlsPanel.style.cssText = `
    position: fixed; left: 14px; bottom: 14px; z-index: 10;
    font-family: sans-serif; font-size: 13px; line-height: 1.5;
    color: #eaeaea; background: rgba(0,0,0,0.45); padding: 10px 14px;
    border-radius: 8px; pointer-events: none; max-width: 260px;
`;
controlsPanel.innerHTML =
    '<b>Controls</b><br>' +
    'Arrow keys / W A S D — orbit camera<br>' +
    '+/- — zoom in/out<br>' +
    'Mouse move — orbit the light<br>' +
    'H — headlights &nbsp;' +
    'B — horn &nbsp; N — day/night<br>' +
    'R — reset camera &nbsp; Space — start/stop';
document.body.appendChild(controlsPanel);
// =====================================================
// 37B. INTERACTIVE FEATURES  (H, O, B, N, R, Space)
// =====================================================

const CRUISE_SPEED = 5.5;     // world units/sec
const WHEEL_RADIUS = 0.92;    // matches the tire geometry

// ---------- small on-screen message so each action is visible ----------
const toast = document.createElement('div');
toast.style.cssText = `
    position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
    z-index: 10; font: 600 14px sans-serif; color: #fff;
    background: rgba(0,0,0,0.55); padding: 8px 16px; border-radius: 8px;
    pointer-events: none; opacity: 0; transition: opacity 0.25s;
`;
document.body.appendChild(toast);
let toastTimer = null;
function showToast(message) {
    toast.textContent = message;
    toast.style.opacity = 1;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.opacity = 0; }, 1200);
}

// ---------- state ----------
let headlightsOn = true;
let isNight = false, nightAmount = 0;      // 0 = day, 1 = night
let isMoving = true, currentSpeed = CRUISE_SPEED;
let hornFlash = 0;
let audioCtx = null;

// ---------- H: headlights (glowing lenses + real beams) ----------
const BEAM_DAY = 0.3;      // spotlight strength in daylight
const BEAM_NIGHT = 3.0;    // ...and at night. Tune these two to taste.

const headlightSpots = [];
[1.0, -1.0].forEach((z) => {
    // color, intensity, distance, angle, penumbra, decay
    const spot = new THREE.SpotLight(0xfff2cc, 0, 45, Math.PI / 6, 0.5, 0);
    spot.position.set(-4.1, 2.0, z);
    spot.target.position.set(-16, 0.6, z * 0.8);   // truck front is local -X
    truck.add(spot);
    truck.add(spot.target);
    headlightSpots.push(spot);
});

function applyHeadlights() {
    const beam = headlightsOn ? THREE.MathUtils.lerp(BEAM_DAY, BEAM_NIGHT, nightAmount) : 0;
    headlightSpots.forEach((spot) => { spot.intensity = beam; });
    headlightMaterial.emissiveIntensity =
        headlightsOn ? THREE.MathUtils.lerp(0.8, 2.0, nightAmount) : 0;
}


// ---------- B: horn (synthesized, so no audio file is needed) ----------
function honk() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    const master = audioCtx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.22, now + 0.03);
    master.gain.setValueAtTime(0.22, now + 0.33);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    master.connect(audioCtx.destination);

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1600;
    filter.connect(master);

    [340, 430].forEach((freq) => {          // two-tone truck horn
        const osc = audioCtx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        osc.connect(filter);
        osc.start(now);
        osc.stop(now + 0.5);
    });

    hornFlash = 0.45;                       // amber roof lights flash with it
}

// ---------- N: day / night ----------
const COLOR_WHITE = new THREE.Color(0xffffff);
const keyDayColor = new THREE.Color(0xfff5e6);
const keyNightColor = new THREE.Color(0x9db4ff);
const ambientNightColor = new THREE.Color(0x6a7bb5);
const markerNightColor = new THREE.Color(0xe8eeff);
const fogDayColor = new THREE.Color(0xcfe9f5);              // = sky horizon colour
const skyNightTint = new THREE.Color(0x1a2a55);             // multiplies the sky colours
const fogNightColor = fogDayColor.clone().multiply(skyNightTint);   // stays matched to the horizon

function updateDayNight(dt) {
    const target = isNight ? 1 : 0;
    const diff = target - nightAmount;
    nightAmount += Math.sign(diff) * Math.min(Math.abs(diff), dt / 1.2);   // ~1.2 s fade
    const t = nightAmount;

    ambientLight.intensity = THREE.MathUtils.lerp(0.42, 0.22, t);
    ambientLight.color.lerpColors(COLOR_WHITE, ambientNightColor, t);
    directionalLight.intensity = THREE.MathUtils.lerp(2.7, 0.6, t);   // sun -> moon
    directionalLight.color.lerpColors(keyDayColor, keyNightColor, t);
    fillLight.intensity = THREE.MathUtils.lerp(0.5, 0.1, t);
    lightMarker.material.color.lerpColors(keyDayColor, markerNightColor, t);

    scene.fog.color.lerpColors(fogDayColor, fogNightColor, t);
    scene.background.copy(scene.fog.color);
    sky.material.color.lerpColors(COLOR_WHITE, skyNightTint, t);
    clouds.children.forEach((c) => c.material.color.copy(sky.material.color));

    const env = t > 0.5 ? envNight : envDay;
    if (scene.environment !== env) {
        scene.environment = env;
        if (windowMaterial.envMap) windowMaterial.envMap = env;   // only if you set one explicitly
    }

    applyHeadlights();
}

// ---------- R: camera reset (glides back, any camera key cancels it) ----------
const CAM_START = { azimuth: 0.34, elevation: 0.30, radius: 23 };
const camControlKeys = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown',
                        'w', 'a', 's', 'd', '+', '-'];
let camResetting = false;

function updateCameraReset(dt) {
    if (!camResetting) return;
    if (camControlKeys.some((k) => keys[k])) { camResetting = false; return; }

    const k = 1 - Math.exp(-8 * dt);
    let dAz = CAM_START.azimuth - camAzimuth;
    dAz = THREE.MathUtils.euclideanModulo(dAz + Math.PI, Math.PI * 2) - Math.PI;  // shortest way round
    camAzimuth += dAz * k;
    camElevation += (CAM_START.elevation - camElevation) * k;
    camRadius += (CAM_START.radius - camRadius) * k;

    if (Math.abs(dAz) < 0.002 &&
        Math.abs(CAM_START.elevation - camElevation) < 0.002 &&
        Math.abs(CAM_START.radius - camRadius) < 0.02) {
        camAzimuth = CAM_START.azimuth;
        camElevation = CAM_START.elevation;
        camRadius = CAM_START.radius;
        camResetting = false;
    }
}

// ---------- Space: start / pause (eases up and down, brake lights on) ----------
function updateSpeed(dt) {
    const target = isMoving ? CRUISE_SPEED : 0;
    const diff = target - currentSpeed;
    currentSpeed += Math.sign(diff) * Math.min(Math.abs(diff), 6 * dt);
}

// horn flash + brake lights
function updateEffects(dt) {
    hornFlash = Math.max(0, hornFlash - dt);
    amberMaterial.emissiveIntensity = hornFlash > 0 ? 2.5 : 0.6;
    rearLightMaterial.emissiveIntensity = isMoving ? 0.8 : 2.5;
}

// ---------- key bindings (one-shot, so holding a key doesn't spam) ----------
window.addEventListener('keydown', (event) => {
    if (event.key === ' ') event.preventDefault();      // stop the page scrolling
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;

    switch (event.key.toLowerCase()) {
        case 'h':
            headlightsOn = !headlightsOn;
            showToast(headlightsOn ? 'Headlights ON' : 'Headlights OFF');
            break;
        case 'b':
            honk();
            showToast('Beep beep!');
            break;
        case 'n':
            isNight = !isNight;
            showToast(isNight ? 'Night' : 'Day');
            break;
        case 'r':
            camResetting = true;
            showToast('Camera reset');
            break;
        case ' ':
            isMoving = !isMoving;
            showToast(isMoving ? 'Driving' : 'Stopped');
            break;
    }
});

// 38. ANIMATION LOOP

const clock = new THREE.Clock();
const wheels = [frontLeftWheel, frontRightWheel, rearLeftWheel, rearRightWheel];

function animate() {
    requestAnimationFrame(animate);

    const deltaTime = Math.min(clock.getDelta(), 0.05);
    const elapsedTime = clock.elapsedTime;

    updateCameraReset(deltaTime);
    updateCamera(deltaTime);
    updateLight();

    updateSpeed(deltaTime);
    updateDayNight(deltaTime);
    updateEffects(deltaTime);

    updateEnvironment(deltaTime, currentSpeed);
    updateClouds(clouds, deltaTime);
    logoShaderMaterial.uniforms.time.value = elapsedTime;

    // suspension bounce fades out as the truck stops
    truck.position.y = Math.abs(Math.sin(elapsedTime * 9)) * 0.015 * (currentSpeed / CRUISE_SPEED);

    const spin = deltaTime * currentSpeed / WHEEL_RADIUS;
    wheels.forEach((wheel) => { wheel.rotation.z += spin; });

    renderer.render(scene, camera);
}

animate();

// 39. WINDOW RESIZE
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
