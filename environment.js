import * as THREE from 'three';

const textureLoader = new THREE.TextureLoader();

// ROAD TEXTURE
const roadTexture = textureLoader.load('./texture/road.jpg');

roadTexture.wrapS = THREE.RepeatWrapping;
roadTexture.wrapT = THREE.RepeatWrapping;
roadTexture.repeat.set(1, 25);

// SIDEWALK TEXTURE
const sidewalkTexture = textureLoader.load('./texture/sidewalk.jpg');

sidewalkTexture.wrapS = THREE.RepeatWrapping;
sidewalkTexture.wrapT = THREE.RepeatWrapping;
sidewalkTexture.repeat.set(2, 25);

// PROCEDURAL GRASS TEXTURE
function makeCanvas(w, h, draw) {

    const c = document.createElement('canvas');

    c.width = w;
    c.height = h;

    const ctx = c.getContext('2d');

    draw(ctx, w, h);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace; 
    tex.needsUpdate = true;

    return tex;
}

const grassTexture = makeCanvas(256, 256, (ctx, w, h) => {

    const base = ctx.createLinearGradient(0, 0, 0, h);

    base.addColorStop(0, '#5fa04c');
    base.addColorStop(1, '#3f7a34');

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 3000; i++) {

        const x = Math.random() * w;
        const y = Math.random() * h;

        ctx.fillStyle = Math.random() > 0.5
            ? `rgba(140,210,100,${Math.random() * 0.35})`
            : `rgba(30,65,25,${Math.random() * 0.3})`;

        ctx.fillRect(x, y, 2, 2);
    }
});

grassTexture.wrapS = THREE.RepeatWrapping;
grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(40, 40);

// PROCEDURAL BUILDING TEXTURES
// PROCEDURAL BUILDING TEXTURES
// The canvas is 4 columns x 10 rows of square cells (128 x 320)
function makeBuildingTexture(wall, wallDark, glass, glassLit) {

    return makeCanvas(128, 320, (ctx, w, h) => {

        // wall with a soft vertical shade so the facade isn't flat
        const shade = ctx.createLinearGradient(0, 0, 0, h);
        shade.addColorStop(0, wall);
        shade.addColorStop(1, wallDark);
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, w, h);

        const cols = 4;
        const rows = 10;
        const cw = w / cols;
        const ch = h / rows;

        for (let r = 0; r < rows; r++) {

            // thin floor line
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fillRect(0, r * ch, w, 2);

            for (let c = 0; c < cols; c++) {

                const x = c * cw + cw * 0.16;
                const y = r * ch + ch * 0.2;
                const ww = cw * 0.68;
                const hh = ch * 0.6;

                // frame
                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                ctx.fillRect(x - 2, y - 2, ww + 4, hh + 4);

                // glass (a few windows have warm curtains)
                ctx.fillStyle = Math.random() < 0.15 ? glassLit : glass;
                ctx.fillRect(x, y, ww, hh);

                // sky reflection strip
                ctx.fillStyle = 'rgba(255,255,255,0.18)';
                ctx.fillRect(x, y, ww, hh * 0.28);
            }
        }
    });
}


const buildingTextureBrick =
    makeBuildingTexture('#c0563a', '#8f3d28', '#35506e', '#e8d49a');

const buildingTextureGlass =
    makeBuildingTexture('#5c86a8', '#3f6485', '#9cc7e6', '#dfeef7');

const buildingTextureConcrete =
    makeBuildingTexture('#e0cfa8', '#bfa985', '#3f5566', '#efe0b0');

// 0. MOVING-SCENERY TRACKING

const trees = [];
const lamps = [];
const mailboxes = [];
const buildings = [];
const roadLines = [];
const crossings = [];
let signalTime = 0;   

const ROAD_TILE_LENGTH = 220 / 25;

// 1. MATERIALS
const roadMaterial = new THREE.MeshStandardMaterial({
    map: roadTexture,
    roughness: 0.95,
    metalness: 0.0
});

const sidewalkMaterial = new THREE.MeshStandardMaterial({
    map: sidewalkTexture,
    roughness: 0.85,
    metalness: 0.0
});

const grassMaterial = new THREE.MeshStandardMaterial({
    map: grassTexture,
    roughness: 1.0
});


const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b4a2c,
    roughness: 0.9
});


const lampPoleMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    metalness: 0.6,
    roughness: 0.4
});


const lampGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0xfff2c2
});


const mailboxBodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x1f4287,
    metalness: 0.35,
    roughness: 0.4
});


const mailboxDoorMaterial = new THREE.MeshStandardMaterial({
    color: 0xdedede,
    metalness: 0.5,
    roughness: 0.3
});

const leafColors = [
    0x2e6b34,
    0x3f8a3d,
    0x4f9a45,
    0x8a9a3d
];
const crosswalkMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2f2ee,
    roughness: 0.8
});

const signalHousingMaterial = new THREE.MeshStandardMaterial({
    color: 0x151515,
    roughness: 0.55,
    metalness: 0.3
});

// One shared material per colour, so every signal head changes together
const signalLamps = {
    red:    new THREE.MeshStandardMaterial({ color: 0x2a0500, emissive: 0xff2a10, emissiveIntensity: 0.05, roughness: 0.3 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0x2a1c00, emissive: 0xffb000, emissiveIntensity: 0.05, roughness: 0.3 }),
    green:  new THREE.MeshStandardMaterial({ color: 0x002a12, emissive: 0x18ff70, emissiveIntensity: 0.05, roughness: 0.3 })
};

// 2. SKY
export function createSky() {

    // more rows than before, so the curved gradient stays smooth near the horizon
    const geometry = new THREE.SphereGeometry(180, 48, 64);

    const top = new THREE.Color(0x1f6fd0);        // deep blue overhead
    const mid = new THREE.Color(0x5aa9ec);        // clear blue in the middle
    const horizon = new THREE.Color(0xcfe9f5);    // must match the fog colour in main.js
    const groundGlow = new THREE.Color(0xeaf3e0);

    const colors = [];
    const posAttr = geometry.attributes.position;

    for (let i = 0; i < posAttr.count; i++) {

        const ny = posAttr.getY(i) / 180;
        let c;

        if (ny >= 0) {
            const t = Math.sqrt(ny);   // blue arrives quickly above the horizon
            c = t < 0.5
                ? horizon.clone().lerp(mid, t / 0.5)
                : mid.clone().lerp(top, (t - 0.5) / 0.5);
        } else {
            c = horizon.clone().lerp(groundGlow, Math.min(-ny * 2, 1));
        }

        colors.push(c.r, c.g, c.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.MeshBasicMaterial({
        side: THREE.BackSide,
        vertexColors: true,
        fog: false,
        toneMapped: false      // keeps the colours vivid and matched to the fog
    });

    return new THREE.Mesh(geometry, material);
}


// Soft cloud puffs drawn on a canvas, used as sprites
function makeCloudTexture() {
    return makeCanvas(256, 128, (ctx) => {
        [[60, 74, 34], [100, 60, 44], [145, 66, 46], [190, 74, 36], [125, 84, 40]]
            .forEach(([x, y, r]) => {
                const g = ctx.createRadialGradient(x, y, 0, x, y, r);
                g.addColorStop(0, 'rgba(255,255,255,0.95)');
                g.addColorStop(0.55, 'rgba(255,255,255,0.55)');
                g.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, 256, 128);
            });
    });
}

export function createClouds() {

    const group = new THREE.Group();
    const texture = makeCloudTexture();
    const COUNT = 30;
    const RADIUS = 150;     // inside the sky sphere (180), outside the scene

    for (let i = 0; i < COUNT; i++) {

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.6 + Math.random() * 0.35,
            depthWrite: false,
            fog: false,
            toneMapped: false
        });

        const sprite = new THREE.Sprite(material);

        const width = 32 + Math.random() * 32;
        const height = width * 0.5;

        const azimuth = (i / COUNT) * Math.PI * 2 + Math.random() * 0.4;
        const elevation =
            Math.atan(height / 2 / RADIUS) + 0.02 +      // keep the bottom edge above the horizon
            Math.pow(Math.random(), 1.4) * 0.5;          // most clouds sit low, where they are visible

        sprite.position.set(
            Math.cos(elevation) * Math.sin(azimuth) * RADIUS,
            Math.sin(elevation) * RADIUS,
            Math.cos(elevation) * Math.cos(azimuth) * RADIUS
        );
        sprite.scale.set(width, height, 1);

        group.add(sprite);
    }

    return group;
}

export function updateClouds(clouds, deltaTime) {
    clouds.rotation.y += deltaTime * 0.008;   // slow drift
}

// 3. ROAD, SIDEWALKS & GRASS
function createGround() {

    const group = new THREE.Group();

    // GRASS
    const grassGeometry = new THREE.PlaneGeometry(240, 240);

    const grass = new THREE.Mesh(
        grassGeometry,
        grassMaterial
    );

    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.02;
    grass.receiveShadow = true;

    group.add(grass);

    // ROAD
    const roadGeometry = new THREE.PlaneGeometry(14, 220);

    const road = new THREE.Mesh(
        roadGeometry,
        roadMaterial
    );

    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;

    group.add(road);

    // YELLOW DASHED ROAD LINES
    const yellowLineMaterial = new THREE.MeshStandardMaterial({
        color: 0xe8c93a,
        roughness: 0.75,
        metalness: 0.0
    });

    for (let z = -105; z < 110; z += 8) {

        const lineGeometry = new THREE.PlaneGeometry(0.18, 4);

        const line = new THREE.Mesh(
            lineGeometry,
            yellowLineMaterial
        );

        line.rotation.x = -Math.PI / 2;

        line.position.set(0, 0.012, z);

        line.receiveShadow = true;

        group.add(line);

        roadLines.push(line);
    }

    // SIDEWALKS

    const sidewalkGeometry = new THREE.BoxGeometry(3.5, 0.2, 220);

    const sidewalkLeft = new THREE.Mesh(
        sidewalkGeometry,
        sidewalkMaterial
    );

    sidewalkLeft.position.set(-8.75, 0.1, 0);
    sidewalkLeft.receiveShadow = true;

    group.add(sidewalkLeft);

    const sidewalkRight = new THREE.Mesh(
        sidewalkGeometry,
        sidewalkMaterial
    );

    sidewalkRight.position.set(8.75, 0.1, 0);
    sidewalkRight.receiveShadow = true;

    group.add(sidewalkRight);

    return group;
}

// 4. TREES

function createTree(x, z) {

    const tree = new THREE.Group();

    const leafColor =
        leafColors[Math.floor(Math.random() * leafColors.length)];

    const leavesMaterial = new THREE.MeshStandardMaterial({
        color: leafColor,
        roughness: 0.85
    });


    // Tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(
        0.15, 0.2, 1.6, 8
    );

    const trunk = new THREE.Mesh(
        trunkGeometry,
        trunkMaterial
    );

    trunk.position.y = 0.8;
    trunk.castShadow = true;

    tree.add(trunk);


    // Main leaves
    const leavesGeometry = new THREE.ConeGeometry(
        1.1, 2.3, 10
    );

    const leaves = new THREE.Mesh(
        leavesGeometry,
        leavesMaterial
    );

    leaves.position.y = 2.5;
    leaves.castShadow = true;

    tree.add(leaves);


    // Top leaves
    const leavesTopGeometry = new THREE.ConeGeometry(
        0.7, 1.4, 10
    );

    const leavesTop = new THREE.Mesh(
        leavesTopGeometry,
        leavesMaterial
    );

    leavesTop.position.y = 3.6;
    leavesTop.castShadow = true;

    tree.add(leavesTop);


    // A little size and rotation variety
    const scale = 0.85 + Math.random() * 0.3;

    tree.scale.set(scale, scale, scale);
    tree.rotation.y = Math.random() * Math.PI * 2;

    tree.position.set(
        x + (Math.random() - 0.5) * 1.5,
        0,
        z
    );

    return tree;
}

// 5. STREET LAMPS
function createStreetLamp(x, z, faceDirection) {

    const lamp = new THREE.Group();


    // Lamp pole
    const poleGeometry = new THREE.CylinderGeometry(
        0.06, 0.08, 4, 8
    );

    const pole = new THREE.Mesh(
        poleGeometry,
        lampPoleMaterial
    );

    pole.position.y = 2;
    pole.castShadow = true;

    lamp.add(pole);

    const armGeometry = new THREE.BoxGeometry(
        0.8, 0.06, 0.06
    );

    const arm = new THREE.Mesh(
        armGeometry,
        lampPoleMaterial
    );

    arm.position.set(0.4, 3.9, 0);

    lamp.add(arm);

    const headGeometry = new THREE.SphereGeometry(
        0.2, 12, 12
    );

    const head = new THREE.Mesh(
        headGeometry,
        lampGlowMaterial
    );

    head.position.set(0.78, 3.85, 0);

    lamp.add(head);


    lamp.position.set(x, 0, z);
    lamp.rotation.y = faceDirection;

    return lamp;
}

// 6. MAILBOXES
function createMailbox(x, z) {

    const mailbox = new THREE.Group();


    // Mailbox body
    const bodyGeometry = new THREE.BoxGeometry(
        0.5, 0.9, 0.4
    );

    const body = new THREE.Mesh(
        bodyGeometry,
        mailboxBodyMaterial
    );

    body.position.y = 0.45;
    body.castShadow = true;

    mailbox.add(body);


    // Mailbox cap
    const capGeometry = new THREE.CylinderGeometry(
        0.25,
        0.25,
        0.4,
        16,
        1,
        false,
        0,
        Math.PI
    );

    const cap = new THREE.Mesh(
        capGeometry,
        mailboxBodyMaterial
    );

    cap.rotation.z = Math.PI / 2;
    cap.position.set(0, 0.9, 0);
    cap.castShadow = true;

    mailbox.add(cap);


    // Mailbox door
    const doorGeometry = new THREE.BoxGeometry(
        0.06, 0.35, 0.3
    );

    const door = new THREE.Mesh(
        doorGeometry,
        mailboxDoorMaterial
    );

    door.position.set(0.26, 0.55, 0);

    mailbox.add(door);


    mailbox.position.set(x, 0, z);

    return mailbox;
}

// 7. BACKGROUND BUILDINGS
function createBuilding(x, z, width, height, depth, material) {

    const geometry = new THREE.BoxGeometry(
        width, height, depth
    );

    const building = new THREE.Mesh(
        geometry,
        material
    );

    building.position.set(
        x,
        height / 2,
        z
    );

    building.castShadow = true;
    building.receiveShadow = true;

    return building;
}
// =====================================================
// CROSSWALK + TRAFFIC LIGHTS
// =====================================================

// side: -1 = left sidewalk, +1 = right sidewalk
function createTrafficLight(side) {

    const unit = new THREE.Group();
    const toRoad = -side;   // the arm reaches toward the road centre

    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.11, 5.4, 12),
        lampPoleMaterial
    );
    pole.position.y = 2.7;
    pole.castShadow = true;
    unit.add(pole);

    const arm = new THREE.Mesh(
        new THREE.BoxGeometry(4.4, 0.12, 0.12),
        lampPoleMaterial
    );
    arm.position.set(toRoad * 2.2, 5.3, 0);
    arm.castShadow = true;
    unit.add(arm);

    const hanger = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.35, 0.08),
        lampPoleMaterial
    );
    hanger.position.set(toRoad * 4.0, 5.1, 0);
    unit.add(hanger);

    const head = new THREE.Group();
    head.position.set(toRoad * 4.0, 4.3, 0);
    unit.add(head);

    const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 1.45, 0.34),
        signalHousingMaterial
    );
    housing.castShadow = true;
    head.add(housing);

    const lampGeometry = new THREE.CylinderGeometry(0.14, 0.14, 0.06, 20);

    [['red', 0.48], ['yellow', 0], ['green', -0.48]].forEach(([color, y]) => {
        [1, -1].forEach((face) => {     // lamps on both faces, so they read from either side
            const lamp = new THREE.Mesh(lampGeometry, signalLamps[color]);
            lamp.rotation.x = Math.PI / 2;
            lamp.position.set(0, y, face * 0.185);
            head.add(lamp);
        });
    });

    unit.position.set(side * 7.3, 0.2, 3.2);   // on the sidewalk, just past the stripes
    return unit;
}


function createCrossing(z) {

    const crossing = new THREE.Group();

    // zebra stripes run along the road and repeat across it
    const stripeGeometry = new THREE.PlaneGeometry(0.55, 3.6);

    for (let i = 0; i < 12; i++) {
        const stripe = new THREE.Mesh(stripeGeometry, crosswalkMaterial);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set((i - 5.5) * 1.1, 0.02, 0);
        stripe.receiveShadow = true;
        crossing.add(stripe);
    }

    crossing.add(createTrafficLight(-1));
    crossing.add(createTrafficLight(1));

    crossing.position.z = z;
    return crossing;
}

// 8. BUILD FULL ENVIRONMENT
export function createEnvironment() {

    const environment = new THREE.Group();

    environment.add(createGround());

    // TREES LINING BOTH SIDES OF THE ROAD

    for (let z = -90; z <= 90; z += 16) {

        const treeLeft = createTree(-11, z);

        environment.add(treeLeft);
        trees.push(treeLeft);


        const treeRight = createTree(11, z + 8);

        environment.add(treeRight);
        trees.push(treeRight);
    }
    // STREET LAMPS

    for (let z = -90; z <= 90; z += 24) {

        const lampLeft = createStreetLamp(-9.2, z, 0);

        environment.add(lampLeft);
        lamps.push(lampLeft);


        const lampRight = createStreetLamp(
            9.2,
            z + 12,
            Math.PI
        );

        environment.add(lampRight);
        lamps.push(lampRight);
    }

    // MAILBOXES

    for (let z = -80; z <= 80; z += 40) {

        const mailbox = createMailbox(-8.0, z);

        environment.add(mailbox);
        mailboxes.push(mailbox);
    }

    // BACKGROUND BUILDINGS
    
    const buildingMaterialBrick =
        new THREE.MeshStandardMaterial({
            map: buildingTextureBrick,
            emissive: 0xffffff,
            emissiveMap: buildingTextureBrick,
            emissiveIntensity: 0.15,
            roughness: 0.85
        });
    const buildingMaterialGlass =
        new THREE.MeshStandardMaterial({
            map: buildingTextureGlass,
            emissive: 0xffffff,
            emissiveMap: buildingTextureGlass,
            emissiveIntensity: 0.15,
            roughness: 0.35,
            metalness: 0.05
        });


    const buildingMaterialConcrete =
        new THREE.MeshStandardMaterial({
            map: buildingTextureConcrete,
            emissive: 0xffffff,
            emissiveMap: buildingTextureConcrete,
            emissiveIntensity: 0.15,
            roughness: 0.9
        });

    const buildingMats = [buildingMaterialBrick, buildingMaterialGlass, buildingMaterialConcrete];
    const sizes = [[10, 18, 10], [8, 26, 8], [12, 14, 10], [9, 22, 9], [11, 16, 9]];

for (let i = 0; i < 16; i++) {
    const z = -100 + i * 12.5;                       // 16 x 12.5 = 200 loop
    const [w, h, d] = sizes[i % sizes.length];
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (32 + (i % 3) * 8);             // well outside the trees
    const b = createBuilding(x, z, w, h, d, buildingMats[i % 3]);
    environment.add(b);
    buildings.push(b);
}
    // CROSSWALKS + TRAFFIC LIGHTS
    [-55, 15, 85].forEach((z) => {

        const crossing = createCrossing(z);

        environment.add(crossing);
        crossings.push(crossing);
    });

    return environment;
}

// 9. DRIVING ANIMATION
export function updateEnvironment(deltaTime, speed) {


    // ROAD TEXTURE MOVEMENT

    roadTexture.offset.y =
        (
            roadTexture.offset.y -
            (speed * deltaTime) / ROAD_TILE_LENGTH
        ) % 1;

    // YELLOW ROAD LINE MOVEMENT

    roadLines.forEach((line) => {

        line.position.z -= speed * deltaTime;

        if (line.position.z < -110) {

            line.position.z += 216;
        }
    });

    // SCENERY WRAPPING

    const sceneryWrapBack = -105;
    const sceneryWrapLength = 210;

    // TREES
   
    trees.forEach((tree) => {

        tree.position.z -= speed * deltaTime;

        if (tree.position.z < sceneryWrapBack) {

            tree.position.z += sceneryWrapLength;
        }
    });

    // STREET LAMPS
    
    lamps.forEach((lamp) => {

        lamp.position.z -= speed * deltaTime;

        if (lamp.position.z < sceneryWrapBack) {

            lamp.position.z += sceneryWrapLength;
        }
    });

    // MAILBOXES

    mailboxes.forEach((mailbox) => {

        mailbox.position.z -= speed * deltaTime;

        if (mailbox.position.z < sceneryWrapBack) {

            mailbox.position.z += sceneryWrapLength;
        }
    });
    // CROSSINGS (crosswalk + traffic lights scroll together)

    crossings.forEach((crossing) => {

        crossing.position.z -= speed * deltaTime;

        if (crossing.position.z < sceneryWrapBack) {

            crossing.position.z += sceneryWrapLength;
        }
    });

    // TRAFFIC LIGHT CYCLE: green 8 s, yellow 2 s, red 6 s

    signalTime = (signalTime + deltaTime) % 16;

    const signalState =
        signalTime < 8 ? 'green' :
        signalTime < 10 ? 'yellow' : 'red';

    for (const color in signalLamps) {

        signalLamps[color].emissiveIntensity =
            color === signalState ? 2.4 : 0.05;
    }

    buildings.forEach((building) => {
    building.position.z -= speed * deltaTime;
    if (building.position.z < -105) building.position.z += 200;   // 16 x 12.5 loop
});
}