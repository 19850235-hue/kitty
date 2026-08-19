// ==========================================
// --- MÓDULO RENDER 3D (PERSONAJES & DEMONIOS MEJORADOS) ---
// ==========================================
const textureLoader = new THREE.TextureLoader();

const Render3D = {
    setupScene: (container, width, height, bgHex) => {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(bgHex);
        scene.fog = new THREE.FogExp2(bgHex, 0.002);

        const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        container.appendChild(renderer.domElement);

        // Luz cálida de atardecer Sanrio World
        const ambientLight = new THREE.AmbientLight(0xffd8b0, 1.1);
        scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xffab73, 0xb659c9, 0.9);
        hemiLight.position.set(0, 50, 0);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xff9d5c, 1.4);
        dirLight.position.set(60, 18, 15);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.bias = -0.0001;
        scene.add(dirLight);

        // Toque de color extra tipo "arcoíris kawaii" para dar vida al ambiente
        const rimPink = new THREE.PointLight(0xff4fa3, 0.6, 60);
        rimPink.position.set(-20, 12, 10);
        scene.add(rimPink);

        const rimGold = new THREE.PointLight(0xffd54f, 0.6, 60);
        rimGold.position.set(20, 10, -10);
        scene.add(rimGold);

        renderer.toneMappingExposure = 1.3;

        return { scene, camera, renderer };
    },

    createPlayerMesh: (skinKey) => {
        let playerGroup;
        if (skinKey === 'kitty') {
            playerGroup = Render3D.createSpriteCharacter('sprites_kitty.png', 'grid4x4');
        } else if (skinKey === 'kuromi') {
            playerGroup = Render3D.createSpriteCharacter('sprites_luna.png', 'grid4x4');
        } else if (skinKey === 'mymelody') {
            playerGroup = Render3D.createSpriteCharacter('sprites_sakura.png', 'grid4x4');
        } else if (skinKey === 'cinnamon') {
            playerGroup = Render3D.createSpriteCharacter('sprites_nube.png', 'grid4x4');
        } else if (skinKey === 'purin') {
            playerGroup = Render3D.createSpriteCharacter('sprites_miel.png', 'grid4x4');
        } else {
            // Personaje sin sprite propio todavía: usa el modelo 3D geométrico.
            playerGroup = Render3D.createGeoCharacter(skinKey);
        }
        Render3D.addCharacterAccessories(playerGroup, skinKey);
        return playerGroup;
    },

    // texturePath: archivo del sprite sheet.
    // layout 'grid4x4': hoja tipo Hello Kitty (4 columnas x 4 filas, fila 1 = camina izq, fila 2 = camina der)
    // layout 'strip4': hoja de una sola fila con 4 cuadros (ej. Kuromi), se voltea horizontalmente según dirección
    createSpriteCharacter: (texturePath = 'sprites_kitty.png', layout = 'grid4x4') => {
        const group = new THREE.Group();
        const texture = textureLoader.load(texturePath);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        // Evita que al cambiar de cuadro (offset/repeat) se filtren colores del
        // cuadro vecino en los bordes — es lo que hacía que la transición de
        // sprites de los demás personajes se viera "sucia" comparada con Kitty.
        texture.generateMipmaps = false;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;

        if (layout === 'grid4x4') {
            texture.repeat.set(1 / 4, 1 / 4);
            texture.offset.set(0, 0.75);
        } else {
            texture.repeat.set(1 / 4, 1);
            texture.offset.set(0, 0);
        }

        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        const baseY = 1.2;
        sprite.scale.set(3.2, 3.2, 1);
        sprite.position.y = baseY;
        group.add(sprite);

        group.userData = { texture, sprite, isGeo: false, spriteLayout: layout, spriteBaseY: baseY };
        return group;
    },

    createGeoCharacter: (skinKey) => {
        const DEFS = {
            mymelody: { body: 0xffa4c8, ear: 0xff3b7b, hood: 0xffc1e0, snout: 0xfff0f5, earShape: 'droop' },
            kuromi:   { body: 0x8a8a8a, ear: 0x2b2b2b, hood: 0x2b2b2b, snout: 0xe8e8e8, earShape: 'point' },
            cinnamon: { body: 0xffffff, ear: 0xeaf7fb, hood: null, snout: 0xffffff, earShape: 'wing' },
            purin:    { body: 0xffecb3, ear: 0xd7a86e, hood: null, snout: 0xfff3d6, earShape: 'droop' }
        };
        const def = DEFS[skinKey] || DEFS.mymelody;

        // El "group" raíz es lo que el juego mueve/posiciona (física, colisiones).
        // Todo lo visual vive dentro de "rig", un hijo aparte: así la animación
        // (rebote, squash&stretch, giro al voltear) nunca pelea con la posición
        // que la física le da a "group" en cada frame.
        const group = new THREE.Group();
        const rig = new THREE.Group();
        group.add(rig);

        const bodyMat = new THREE.MeshStandardMaterial({ color: def.body, roughness: 0.35 });
        const earMat = new THREE.MeshStandardMaterial({ color: def.ear, roughness: 0.35 });

        // Cuerpo (proporción chibi, suave)
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 32), bodyMat);
        body.scale.set(1, 0.95, 1);
        body.position.y = 0.1;
        body.castShadow = true;
        rig.add(body);

        // Cabeza
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 32), bodyMat);
        head.position.y = 1.35;
        head.castShadow = true;
        rig.add(head);

        // Hocico claro (le da carita, no solo una bola de color)
        const snoutMat = new THREE.MeshStandardMaterial({ color: def.snout, roughness: 0.45 });
        const snout = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 20), snoutMat);
        snout.scale.set(1, 0.78, 0.75);
        snout.position.set(0, 1.18, 0.58);
        rig.add(snout);

        // Naricita
        const noseMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.3 });
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), noseMat);
        nose.position.set(0, 1.28, 0.86);
        rig.add(nose);

        // Ojos grandes y brillantes con reflejo (mucho más bonitos que sin cara)
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.15 });
        const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        [-1, 1].forEach(side => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), eyeMat);
            eye.position.set(side * 0.26, 1.42, 0.62);
            rig.add(eye);
            const shine = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), shineMat);
            shine.position.set(side * 0.26 + 0.03, 1.46, 0.7);
            rig.add(shine);
        });

        // Mejillas sonrojadas (rosa para todos, celeste para Cinnamoroll)
        const blushColor = skinKey === 'cinnamon' ? 0x90caf9 : 0xff9ec7;
        const blushMat = new THREE.MeshStandardMaterial({ color: blushColor, transparent: true, opacity: 0.55, roughness: 0.6 });
        [-1, 1].forEach(side => {
            const blush = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), blushMat);
            blush.scale.set(1.3, 0.7, 0.4);
            blush.position.set(side * 0.44, 1.18, 0.55);
            rig.add(blush);
        });

        // Orejas orgánicas (ovaladas suaves, ya no son solo esferas planas)
        let earTemplate;
        let earPosY = 2.0, earRotZ = 0.4;
        if (def.earShape === 'point') {
            earTemplate = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.85, 14), earMat);
        } else if (def.earShape === 'wing') {
            // Orejas-ala de Cinnamoroll: largas, aplanadas y casi horizontales
            earTemplate = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), earMat);
            earTemplate.scale.set(1, 2.9, 0.45);
            earPosY = 1.68;
            earRotZ = 1.15;
        } else if (def.earShape === 'droop') {
            earTemplate = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), earMat);
            earTemplate.scale.set(1, 1.9, 0.55);
        } else {
            earTemplate = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), earMat);
            earTemplate.scale.set(1, 1.6, 0.55);
        }
        earTemplate.position.set(-0.5, earPosY, 0.05);
        earTemplate.rotation.z = earRotZ;
        earTemplate.castShadow = true;
        rig.add(earTemplate);

        const earR = earTemplate.clone();
        earR.position.x = 0.5;
        earR.rotation.z = -earRotZ;
        rig.add(earR);

        // BRAZOS (paticas delanteras) — permiten el balanceo al caminar
        const armMat = new THREE.MeshStandardMaterial({ color: def.body, roughness: 0.4 });
        const buildArm = (side) => {
            const armPivot = new THREE.Group();
            armPivot.position.set(side * 0.72, 0.45, 0.05);
            const armMesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), armMat);
            armMesh.scale.set(0.85, 1.35, 0.85);
            armMesh.position.y = -0.2;
            armMesh.castShadow = true;
            armPivot.add(armMesh);
            rig.add(armPivot);
            return armPivot;
        };
        const armL = buildArm(-1);
        const armR = buildArm(1);

        // PIERNAS — sin ellas el personaje solo podía flotar/deslizarse; con
        // esto ya se le puede animar un caminado real como el de Kitty.
        const legMat = new THREE.MeshStandardMaterial({ color: def.body, roughness: 0.4 });
        const buildLeg = (side) => {
            const legPivot = new THREE.Group();
            legPivot.position.set(side * 0.36, -0.55, 0.1);
            const legMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 14), legMat);
            legMesh.scale.set(0.95, 1.05, 0.95);
            legMesh.position.y = -0.15;
            legMesh.castShadow = true;
            legPivot.add(legMesh);
            // patita blanca en la punta (look "calcetín" tierno)
            const paw = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
            paw.scale.set(1, 0.55, 1.1);
            paw.position.set(0, -0.32, 0.05);
            legPivot.add(paw);
            rig.add(legPivot);
            return legPivot;
        };
        const legL = buildLeg(-1);
        const legR = buildLeg(1);

        // Detalles propios de cada personaje
        let tailMesh = null;
        if (skinKey === 'mymelody') {
            const hoodMat = new THREE.MeshStandardMaterial({ color: def.hood, roughness: 0.4 });
            const hood = new THREE.Mesh(new THREE.SphereGeometry(0.76, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2.5), hoodMat);
            hood.position.y = 1.62;
            rig.add(hood);
            // Borde festoneado de la capucha (bolitas alrededor del ruedo, look "petal hood")
            const scallopCount = 10;
            const scallopR = 0.735;
            for (let i = 0; i < scallopCount; i++) {
                const t = i / scallopCount;
                const angle = t * Math.PI * 2;
                // Solo la mitad visible/frontal-baja del ruedo (evita amontonarlas detrás de la cabeza)
                if (Math.cos(angle) < -0.15) continue;
                const scallop = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), hoodMat);
                scallop.position.set(Math.sin(angle) * scallopR, 1.3, Math.cos(angle) * scallopR);
                rig.add(scallop);
            }
            // Colita esponjosa (My Melody es un conejito)
            const tailMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
            tailMesh = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 12), tailMat);
            tailMesh.position.set(0, 0.05, -0.78);
            rig.add(tailMesh);
        } else if (skinKey === 'kuromi') {
            const tipMat = new THREE.MeshStandardMaterial({ color: 0xff3b7b, roughness: 0.3 });
            [-0.5, 0.5].forEach(x => {
                const tip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), tipMat);
                tip.position.set(x, 2.35, 0.05);
                rig.add(tip);
            });
            const skullMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.3 });
            const skull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), skullMat);
            skull.position.set(0, 1.75, 0.62);
            rig.add(skull);
            const dotMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
            [-0.05, 0.05].forEach(x => {
                const dot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), dotMat);
                dot.position.set(x, 1.76, 0.72);
                rig.add(dot);
            });
            // Colita de diablilla, larga y con puntita en flecha
            const tailPivot = new THREE.Group();
            tailPivot.position.set(0, 0.15, -0.7);
            const tailMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.4 });
            const tailShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.5, 10), tailMat);
            tailShaft.rotation.x = -1.1;
            tailShaft.position.set(0, -0.05, -0.15);
            tailPivot.add(tailShaft);
            const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 10), tailMat);
            tailTip.rotation.x = -1.6;
            tailTip.position.set(0, -0.22, -0.42);
            tailPivot.add(tailTip);
            rig.add(tailPivot);
            tailMesh = tailPivot;
        } else if (skinKey === 'cinnamon') {
            const tailMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });
            tailMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 14), tailMat);
            tailMesh.position.set(0, 0.15, -0.75);
            rig.add(tailMesh);
            // Puntitas celestes en la orilla de cada oreja-ala (siguiendo su nuevo ángulo casi horizontal)
            const tipMat = new THREE.MeshStandardMaterial({ color: 0x90caf9, roughness: 0.3 });
            const wingTipOffset = 0.696; // largo efectivo de la oreja-ala desde su centro
            [-1, 1].forEach(side => {
                const tipX = side * (0.5 + Math.sin(earRotZ) * wingTipOffset);
                const tipY = earPosY + Math.cos(earRotZ) * wingTipOffset;
                const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), tipMat);
                tip.position.set(tipX, tipY, 0.05);
                rig.add(tip);
            });
        } else if (skinKey === 'purin') {
            // Parche cafecito en el pecho (su marca registrada)
            const patchMat = new THREE.MeshStandardMaterial({ color: def.ear, roughness: 0.45 });
            const patch = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), patchMat);
            patch.scale.set(1, 1.15, 0.35);
            patch.position.set(0, -0.15, 0.78);
            rig.add(patch);
            // Colita corta y esponjosa
            tailMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), patchMat);
            tailMesh.position.set(0, 0.05, -0.78);
            rig.add(tailMesh);
        }

        group.userData = {
            texture: null, sprite: null, isGeo: true,
            rig, legL, legR, armL, armR, tailMesh,
            earL: earTemplate, earR, earBaseRotZ: earRotZ,
            baseY: rig.position.y
        };
        return group;
    },

    // Accesorios para Personajes
    // Solo aplica a personajes geométricos (isGeo): los sprites ya traen sus
    // accesorios (moño, gorra, etc.) dibujados directamente en el pixel art.
    addCharacterAccessories: (group, skinKey) => {
        if (!group.userData || !group.userData.isGeo) return;
        if (skinKey === 'kitty' || skinKey === 'mymelody') {
            const bowMat = new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.2 });
            const bowY = skinKey === 'mymelody' ? 2.2 : 2.05;
            const bowZ = skinKey === 'mymelody' ? 0.55 : 0.4;
            const center = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), bowMat);
            center.position.set(-0.35, bowY, bowZ);

            const w1 = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.45, 12), bowMat);
            w1.rotation.z = Math.PI / 2;
            w1.position.set(-0.55, bowY, bowZ);

            const w2 = w1.clone();
            w2.rotation.z = -Math.PI / 2;
            w2.position.x = -0.15;

            group.add(center, w1, w2);
        } else if (skinKey === 'purin') {
            const hatMat = new THREE.MeshStandardMaterial({ color: 0x4e342e });
            const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 16), hatMat);
            hat.position.set(0, 2.15, 0);
            group.add(hat);
        }
    },

    // Escudo de Habilidad Especial (Ulti)
    createShieldBubble: () => {
        const shieldGeo = new THREE.SphereGeometry(1.35, 24, 24);
        const shieldMat = new THREE.MeshStandardMaterial({
            color: 0x00e5ff,
            transparent: true,
            opacity: 0.4,
            roughness: 0.1
        });
        const bubble = new THREE.Mesh(shieldGeo, shieldMat);
        bubble.name = "shieldBubble";
        return bubble;
    },

    // PLATAFORMAS SANRIO DULCES
    createPlatformMesh: (width, height, depth, colorHex) => {
        const group = new THREE.Group();

        const baseMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.35 });
        const base = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), baseMat);
        base.receiveShadow = true;
        base.castShadow = true;
        group.add(base);

        // Capa blanca de glaseado / crema
        const topMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
        const topCap = new THREE.Mesh(new THREE.BoxGeometry(width + 0.2, 0.35, depth + 0.2), topMat);
        topCap.position.y = height / 2 + 0.15;
        topCap.receiveShadow = true;
        group.add(topCap);

        // Borde de "bolitas de glaseado" a lo largo del frente (efecto pastelería)
        const swirlCount = Math.max(3, Math.floor(width / 1.3));
        for (let i = 0; i < swirlCount; i++) {
            const swirl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), topMat);
            const t = swirlCount > 1 ? i / (swirlCount - 1) : 0.5;
            swirl.position.set(-width / 2 + 0.6 + t * (width - 1.2), height / 2 + 0.32, depth / 2 + 0.05);
            group.add(swirl);
        }

        // Sprinkles de colores encima (más "cute")
        const sprinkleColors = [0xff4081, 0xffd54f, 0x80deea, 0xba68c8, 0xff8a65];
        const sprinkleCount = Math.floor(width * 1.1);
        for (let i = 0; i < sprinkleCount; i++) {
            const c = sprinkleColors[Math.floor(Math.random() * sprinkleColors.length)];
            const sprinkleMat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.25 });
            const sprinkle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.2, 6), sprinkleMat);
            sprinkle.rotation.z = Math.random() * Math.PI;
            sprinkle.rotation.x = Math.random() * Math.PI;
            sprinkle.position.set(
                (Math.random() - 0.5) * (width - 0.6),
                height / 2 + 0.35,
                (Math.random() - 0.5) * (depth - 0.6)
            );
            group.add(sprinkle);
        }

        // Moñito decorativo en plataformas grandes
        if (width > 11) {
            const bowMat = new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.2 });
            const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), bowMat);
            const bowX = -width / 2 + 1.0;
            bowCenter.position.set(bowX, height / 2 + 0.5, depth / 2 + 0.05);
            group.add(bowCenter);
            const wingA = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.35, 12), bowMat);
            wingA.rotation.z = Math.PI / 2;
            wingA.position.set(bowX - 0.18, height / 2 + 0.5, depth / 2 + 0.05);
            group.add(wingA);
            const wingB = wingA.clone();
            wingB.rotation.z = -Math.PI / 2;
            wingB.position.x = bowX + 0.18;
            group.add(wingB);
        }

        // Columnas bastón
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0xfff0f5, roughness: 0.4 });
        const pillarLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 18, 16), pillarMat);
        pillarLeft.position.set(-width / 2 + 1.2, -9, 0);
        group.add(pillarLeft);

        if (width > 6) {
            const pillarRight = pillarLeft.clone();
            pillarRight.position.x = width / 2 - 1.2;
            group.add(pillarRight);
        }

        return group;
    },

    // ====================================================
    // --- ENEMIGOS DEMONÍACOS ÉPICOS Y MEJORADOS ---
    // ====================================================

    // 👹 1. DEMONIO TERRESTRE HUMANOIDE (IMP DE FUEGO)
    createEnemyMesh: () => {
        const group = new THREE.Group();
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.35 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x7f0000, roughness: 0.35 });
        const hornMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });

        // Torso
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.0, 16), skinMat);
        torso.position.y = 1.0;
        torso.castShadow = true;
        group.add(torso);

        // Cabeza
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 20), skinMat);
        head.position.y = 1.85;
        head.castShadow = true;
        group.add(head);

        // Cuernos Demoniacos Afilados (en la cabeza)
        const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.6, 14), hornMat);
        hornL.position.set(-0.28, 2.25, 0.05);
        hornL.rotation.z = 0.4;
        hornL.rotation.x = -0.15;
        group.add(hornL);
        const hornR = hornL.clone();
        hornR.position.x = 0.28;
        hornR.rotation.z = -0.4;
        group.add(hornR);

        // Ojos Amarillos glowing
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b });
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), eyeMat);
        eyeL.position.set(-0.16, 1.88, 0.36);
        group.add(eyeL);
        const eyeR = eyeL.clone();
        eyeR.position.x = 0.16;
        group.add(eyeR);

        // Colmillos
        const fangMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const fangL = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 8), fangMat);
        fangL.rotation.x = Math.PI;
        fangL.position.set(-0.1, 1.68, 0.38);
        group.add(fangL);
        const fangR = fangL.clone();
        fangR.position.x = 0.1;
        group.add(fangR);

        // BRAZOS ARTICULADOS con manos y dedos (humanoide)
        const buildArm = (side) => {
            const armGroup = new THREE.Group();
            const shoulderX = 0.55 * side;

            const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.55, 10), darkMat);
            upperArm.position.set(shoulderX, 1.35, 0);
            upperArm.rotation.z = side * 0.55;
            armGroup.add(upperArm);

            const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.5, 10), skinMat);
            forearm.position.set(shoulderX + side * 0.42, 0.95, 0.22);
            forearm.rotation.z = side * 0.3;
            forearm.rotation.x = -0.7;
            armGroup.add(forearm);

            const hand = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), darkMat);
            hand.position.set(shoulderX + side * 0.5, 0.68, 0.48);
            armGroup.add(hand);

            for (let f = -1; f <= 1; f++) {
                const finger = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 6), hornMat);
                finger.position.set(shoulderX + side * 0.5 + f * 0.07, 0.58, 0.6);
                finger.rotation.x = 2.6;
                armGroup.add(finger);
            }
            return armGroup;
        };
        group.add(buildArm(-1));
        group.add(buildArm(1));

        // Piernas con patas garra
        const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.55, 10), darkMat);
        legL.position.set(-0.22, 0.35, 0);
        group.add(legL);
        const legR = legL.clone(); legR.position.x = 0.22; group.add(legR);
        const footL = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 8), hornMat);
        footL.position.set(-0.22, 0.05, 0.1);
        footL.rotation.x = 1.6;
        group.add(footL);
        const footR = footL.clone(); footR.position.x = 0.22; group.add(footR);

        // Cola con Punta de Flecha
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8), darkMat);
        tail.position.set(0, 0.75, -0.55);
        tail.rotation.x = -0.8;
        group.add(tail);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.35, 8), darkMat);
        tip.position.set(0, 0.4, -0.95);
        tip.rotation.x = -1.2;
        group.add(tip);

        // Espinas en el lomo
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0x2c0000, roughness: 0.3 });
        for (let i = 0; i < 3; i++) {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 8), spikeMat);
            spike.position.set(0, 1.3 + i * 0.28, -0.42 + i * 0.02);
            spike.rotation.x = -0.5;
            group.add(spike);
        }

        // Núcleo de energía brillante en el pecho
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffab00 });
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), coreMat);
        core.position.set(0, 1.1, 0.44);
        group.add(core);

        // Aura de partículas de fuego inferiores
        const flameP = Render3D.createDemonParticles(0xff3d00);
        flameP.position.set(0, 0.5, 0);
        group.add(flameP);

        return group;
    },

    // 🧊 ENEMIGO NUEVO MUNDO 2: GOLEM DE HIELO (tanque, aguanta 2 golpes)
    createGolemEnemyMesh: () => {
        const group = new THREE.Group();
        const iceMat = new THREE.MeshStandardMaterial({ color: 0x81d4fa, roughness: 0.25, metalness: 0.15, transparent: true, opacity: 0.92 });
        const coreMat = new THREE.MeshStandardMaterial({ color: 0x0277bd, roughness: 0.4 });

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.7), iceMat);
        torso.position.y = 1.05;
        group.add(torso);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), iceMat);
        head.position.y = 1.9;
        group.add(head);

        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), eyeMat);
        eyeL.position.set(-0.14, 1.92, 0.29);
        group.add(eyeL);
        const eyeR = eyeL.clone(); eyeR.position.x = 0.14; group.add(eyeR);

        // Brazos gruesos de hielo
        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.9, 0.32), iceMat);
        armL.position.set(-0.65, 0.95, 0);
        group.add(armL);
        const armR = armL.clone(); armR.position.x = 0.65; group.add(armR);

        // Piernas cortas y anchas
        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 0.35), coreMat);
        legL.position.set(-0.25, 0.3, 0);
        group.add(legL);
        const legR = legL.clone(); legR.position.x = 0.25; group.add(legR);

        // Núcleo brillante en el pecho (grieta de energía)
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), new THREE.MeshBasicMaterial({ color: 0x18ffff }));
        core.position.set(0, 1.1, 0.38);
        group.add(core);

        // Cristales puntiagudos en los hombros
        const crystalMat = new THREE.MeshStandardMaterial({ color: 0xb3e5fc, roughness: 0.1, metalness: 0.3 });
        [-0.6, 0.6].forEach(sx => {
            const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 6), crystalMat);
            crystal.position.set(sx, 1.55, 0);
            crystal.rotation.z = sx > 0 ? -0.3 : 0.3;
            group.add(crystal);
        });

        return group;
    },

    // 👻 ENEMIGO NUEVO MUNDO 3: FANTASMA ERRÁTICO NOCTURNO
    createGhostEnemyMesh: () => {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xce93d8, transparent: true, opacity: 0.75, roughness: 0.3, emissive: 0x7b1fa2, emissiveIntensity: 0.3 });

        const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.65), bodyMat);
        group.add(body);

        // Cola ondulada tipo fantasma (varios lóbulos)
        for (let i = 0; i < 4; i++) {
            const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), bodyMat);
            lobe.position.set(-0.4 + i * 0.27, -0.35, 0);
            group.add(lobe);
        }

        // Ojos brillantes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), eyeMat);
        eyeL.position.set(-0.17, 0.08, 0.48);
        group.add(eyeL);
        const eyeR = eyeL.clone(); eyeR.position.x = 0.17; group.add(eyeR);

        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x4a148c });
        const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), pupilMat);
        pupilL.position.set(-0.17, 0.08, 0.55);
        group.add(pupilL);
        const pupilR = pupilL.clone(); pupilR.position.x = 0.17; group.add(pupilR);

        return group;
    },

    // 💰 COFRE SECRETO (opcional, da puntos extra)
    createChestMesh: () => {
        const group = new THREE.Group();
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x8d5524, roughness: 0.7 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.7, roughness: 0.25, emissive: 0xffab00, emissiveIntensity: 0.3 });

        const base = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 0.55), woodMat);
        base.position.y = 0.25;
        group.add(base);

        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.55, 12, 1, false, 0, Math.PI), woodMat);
        lid.rotation.z = Math.PI / 2;
        lid.position.y = 0.5;
        group.add(lid);

        const band1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.6), goldMat);
        band1.position.y = 0.25;
        group.add(band1);
        const band2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 0.6), goldMat);
        band2.position.y = 0.5;
        group.add(band2);

        const lock = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), goldMat);
        lock.position.set(0, 0.35, 0.29);
        group.add(lock);

        // Brillo/destello encima
        const sparkleMat = new THREE.MeshBasicMaterial({ color: 0xfff59d, transparent: true, opacity: 0.8 });
        const sparkle = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), sparkleMat);
        sparkle.position.y = 0.95;
        sparkle.name = 'chestSparkle';
        group.add(sparkle);

        group.name = 'secretChest';
        return group;
    },

    // 🗿 2. GÁRGOLA DE PIEDRA VOLADORA
    createFlyingEnemyMesh: () => {
        const group = new THREE.Group();

        // Cuerpo de Piedra Tallada (bajo poligonaje, aspecto rocoso)
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.95, flatShading: true });
        const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 0), bodyMat);
        body.castShadow = true;
        group.add(body);

        // Parches de musgo (le dan vida de piedra antigua)
        const mossMat = new THREE.MeshStandardMaterial({ color: 0x558b2f, roughness: 0.9 });
        const moss1 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), mossMat);
        moss1.scale.set(1, 0.4, 1);
        moss1.position.set(-0.35, 0.55, 0.35);
        group.add(moss1);
        const moss2 = moss1.clone();
        moss2.scale.set(0.8, 0.35, 0.8);
        moss2.position.set(0.4, -0.3, -0.4);
        group.add(moss2);

        // Cuernos de Piedra
        const hornMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.7 });
        const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 8), hornMat);
        hornL.position.set(-0.35, 0.75, 0);
        hornL.rotation.z = 0.4;
        group.add(hornL);

        const hornR = hornL.clone();
        hornR.position.x = 0.35;
        hornR.rotation.z = -0.4;
        group.add(hornR);

        // Alas de Piedra Desplegadas
        const wingMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.85, side: THREE.DoubleSide, flatShading: true });
        const wingL = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8), wingMat);
        wingL.position.set(-1.1, 0.2, 0);
        wingL.rotation.y = 0.4;
        group.add(wingL);

        const wingR = wingL.clone();
        wingR.position.x = 1.1;
        wingR.rotation.y = -0.4;
        group.add(wingR);

        // Ojos Rojos Brillantes (contraste con la piedra gris)
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff5252 });
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), eyeMat);
        eyeL.position.set(-0.25, 0.2, 0.65);
        group.add(eyeL);

        const eyeR = eyeL.clone();
        eyeR.position.x = 0.25;
        group.add(eyeR);

        // Brazos pequeños con manos de garra (aspecto humanoide)
        const gArmMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.85 });
        const buildGargArm = (side) => {
            const armGroup = new THREE.Group();
            const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.4, 8), gArmMat);
            upperArm.position.set(0.55 * side, 0.1, 0.1);
            upperArm.rotation.z = side * 0.7;
            armGroup.add(upperArm);
            const hand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), gArmMat);
            hand.position.set(0.78 * side, -0.15, 0.25);
            armGroup.add(hand);
            for (let f = -1; f <= 1; f += 2) {
                const finger = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.13, 6), gClawMatShared);
                finger.position.set(0.78 * side + f * 0.05, -0.24, 0.32);
                finger.rotation.x = 2.6;
                armGroup.add(finger);
            }
            return armGroup;
        };
        const gClawMatShared = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.5 });
        group.add(buildGargArm(-1));
        group.add(buildGargArm(1));

        // Patas colgantes con garras
        const gargLimbMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.85 });
        const gLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.5, 8), gargLimbMat);
        gLegL.position.set(-0.25, -0.85, 0);
        group.add(gLegL);
        const gLegR = gLegL.clone(); gLegR.position.x = 0.25; group.add(gLegR);

        const gClawMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.5 });
        const gClawL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 8), gClawMat);
        gClawL.position.set(-0.25, -1.15, 0.05);
        gClawL.rotation.x = Math.PI;
        group.add(gClawL);
        const gClawR = gClawL.clone(); gClawR.position.x = 0.25; group.add(gClawR);

        // Cola con punta de flecha
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), gargLimbMat);
        tail.position.set(0, -0.3, -0.65);
        tail.rotation.x = 1.0;
        group.add(tail);
        const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.32, 8), gClawMat);
        tailTip.position.set(0, -0.6, -1.05);
        tailTip.rotation.x = 2.4;
        group.add(tailTip);

        // Garras en la punta de las alas
        const wingClawL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 6), gClawMat);
        wingClawL.position.set(-1.7, 0.5, 0);
        wingClawL.rotation.z = 1.0;
        group.add(wingClawL);
        const wingClawR = wingClawL.clone(); wingClawR.position.x = 1.7; wingClawR.rotation.z = -1.0; group.add(wingClawR);

        // Polvo de piedra flotando alrededor
        const dustP = Render3D.createDemonParticles(0xcfd8dc);
        group.add(dustP);

        return group;
    },

    // 🗿👹 3. JEFE FINAL: GOLEM DE PIEDRA Y LAVA (ÉPICO)
    createBossMesh: () => {
        const group = new THREE.Group();

        // Cuerpo Gigante de Piedra (Golem) — cúmulo de rocas redondeadas, no un sólido geométrico
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x6d5f52, roughness: 0.95 });
        const boulders = [
            [0, 0, 0, 2.0], [0.95, 0.55, 0.5, 1.15], [-0.95, 0.5, -0.4, 1.2],
            [0.55, -0.9, 0.55, 1.05], [-0.6, -0.85, -0.5, 1.1], [0, 1.05, -0.65, 1.05],
            [0.3, 0.3, 1.1, 0.85], [-0.3, -0.2, 1.15, 0.8]
        ];
        boulders.forEach(([x, y, z, r]) => {
            const boulder = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 14), bodyMat);
            boulder.position.set(x, y, z);
            boulder.castShadow = true;
            group.add(boulder);
        });

        // Grietas de lava brillante sobre el torso de piedra
        const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff5722 });
        const lavaCracks = [
            [-0.9, 0.9, 1.4, 0.5], [0.7, 0.3, 1.6, 0.35], [-0.3, -0.7, 1.7, 0.45], [1.0, -0.9, 1.3, 0.3]
        ];
        lavaCracks.forEach(([x, y, z, len]) => {
            const crack = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len, 6), lavaMat);
            crack.position.set(x, y, z);
            crack.rotation.z = Math.random() * Math.PI;
            crack.rotation.x = 0.3;
            group.add(crack);
        });

        // Cuernos Gigantes de Piedra
        const hornMat = new THREE.MeshStandardMaterial({ color: 0x3e3630, roughness: 0.8 });
        const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.2, 8), hornMat);
        hornL.position.set(-1.4, 2.3, 0.2);
        hornL.rotation.z = 0.5;
        hornL.rotation.x = -0.3;
        group.add(hornL);

        const hornR = hornL.clone();
        hornR.position.x = 1.4;
        hornR.rotation.z = -0.5;
        group.add(hornR);

        // Placas de piedra en la espalda (a modo de alas rocosas)
        const wingMat = new THREE.MeshStandardMaterial({ color: 0x5a4d42, roughness: 0.95, side: THREE.DoubleSide, flatShading: true });
        const wingL = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.3), wingMat);
        wingL.position.set(-2.8, 0.8, -0.8);
        wingL.rotation.y = 0.5;
        group.add(wingL);

        const wingR = wingL.clone();
        wingR.position.x = 2.8;
        wingR.rotation.y = -0.5;
        group.add(wingR);

        // Ojos Dorados Glowing
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffd600 });
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), eyeMat);
        eyeL.position.set(-0.75, 0.6, 1.8);
        group.add(eyeL);

        const eyeR = eyeL.clone();
        eyeR.position.x = 0.75;
        group.add(eyeR);

        // Corona de Lava Superior (energía del núcleo escapando por la cabeza)
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xff5722 });
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.3, 10), flameMat);
        flame.position.set(0, 2.65, 0);
        group.add(flame);

        // Corona secundaria de picos de piedra
        const crownMat = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.85 });
        for (let i = 0; i < 5; i++) {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 8), crownMat);
            const ang = (i / 4 - 0.5) * 1.4;
            spike.position.set(Math.sin(ang) * 1.4, 1.9 + Math.cos(ang) * 0.3, Math.cos(ang) * 0.6);
            spike.rotation.z = ang;
            group.add(spike);
        }

        // Brazos gigantes de piedra articulados con manos
        const bigArmMat = new THREE.MeshStandardMaterial({ color: 0x574b3f, roughness: 0.9 });
        const bigClawMat = new THREE.MeshStandardMaterial({ color: 0x2e2620, roughness: 0.7 });
        const buildBossArm = (side) => {
            const armGroup = new THREE.Group();

            const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 1.0, 8), bigArmMat);
            upperArm.position.set(1.7 * side, 0.4, 0.1);
            upperArm.rotation.z = side * 0.5;
            armGroup.add(upperArm);

            const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.44, 14, 14), bigArmMat);
            elbow.position.set(2.3 * side, -0.3, 0.3);
            armGroup.add(elbow);

            const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.28, 0.8, 8), bigArmMat);
            forearm.position.set(2.55 * side, -0.85, 0.55);
            forearm.rotation.z = side * -0.35;
            forearm.rotation.x = 0.6;
            armGroup.add(forearm);

            const hand = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 14), bigArmMat);
            hand.position.set(2.7 * side, -1.35, 0.85);
            armGroup.add(hand);

            for (let i = -1; i <= 1; i++) {
                const claw = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.5, 7), bigClawMat);
                claw.position.set(2.7 * side + i * 0.22, -1.7, 1.05);
                claw.rotation.x = Math.PI;
                armGroup.add(claw);
            }
            return armGroup;
        };
        group.add(buildBossArm(-1));
        group.add(buildBossArm(1));

        // Piernas gigantes de piedra
        const bigLegMat = new THREE.MeshStandardMaterial({ color: 0x453b32, roughness: 0.9 });
        const bigLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 1.0, 8), bigLegMat);
        bigLegL.position.set(-0.9, -2.2, 0);
        group.add(bigLegL);
        const bigLegR = bigLegL.clone(); bigLegR.position.x = 0.9; group.add(bigLegR);

        // Núcleo de lava brillante en el pecho (corazón del golem)
        const coreMat2 = new THREE.MeshBasicMaterial({ color: 0xff1744 });
        const core2 = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), coreMat2);
        core2.position.set(0, 0.2, 2.0);
        group.add(core2);

        // Partículas de ceniza y lava del Jefe
        const bossP = Render3D.createDemonParticles(0xff5722);
        bossP.scale.set(2, 2, 2);
        group.add(bossP);

        return group;
    },

    // Sistema de Partículas Demoníacas
    createDemonParticles: (colorHex) => {
        const count = 15;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        for(let i = 0; i < count * 3; i++) {
            pos[i] = (Math.random() - 0.5) * 1.6;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({ color: colorHex, size: 0.22, transparent: true, opacity: 0.8 });
        return new THREE.Points(geo, mat);
    },

    // BLOQUE DE HIELO PARA ENEMIGOS CONGELADOS
    createIceBlock: () => {
        const mat = new THREE.MeshStandardMaterial({
            color: 0x80deea,
            transparent: true,
            opacity: 0.75,
            roughness: 0.1,
            metalness: 0.1
        });
        const ice = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.5, 2.2), mat);
        ice.name = "iceBlock";
        return ice;
    },

    // PELIGRO: POZO DE LAVA (llena el hueco entre plataformas, con capas de fuego bien visibles)
    createLavaMesh: (width) => {
        const group = new THREE.Group();
        const w = Math.max(width, 2);

        // Fondo oscuro del pozo (da sensación de profundidad)
        const pitMat = new THREE.MeshStandardMaterial({ color: 0x3e0d02, roughness: 0.9 });
        const pit = new THREE.Mesh(new THREE.BoxGeometry(w, 2.2, 5.5), pitMat);
        pit.position.y = -0.8;
        group.add(pit);

        // Capa de lava brillante (emissive fuerte, muy distinta al color de las plataformas)
        const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff5722, emissive: 0xff9100, emissiveIntensity: 1.1, roughness: 0.35 });
        const pool = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, 5.6), lavaMat);
        pool.position.y = 0.15;
        pool.name = 'lavaSurface';
        group.add(pool);

        // Llamas puntiagudas asomando de la superficie
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xffca28 });
        const flameCount = Math.max(3, Math.floor(w / 1.3));
        for (let i = 0; i < flameCount; i++) {
            const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55 + Math.random() * 0.3, 6), flameMat);
            flame.position.set(-w / 2 + (i + 0.5) * (w / flameCount), 0.55, (Math.random() - 0.5) * 4);
            flame.name = 'lavaFlame';
            group.add(flame);
        }

        // Brasas/burbujas flotando
        const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xffe082 });
        for (let i = 0; i < 5; i++) {
            const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.12 + Math.random() * 0.1, 8, 8), bubbleMat);
            bubble.position.set((Math.random() - 0.5) * w * 0.85, 0.4 + Math.random() * 0.5, (Math.random() - 0.5) * 4);
            bubble.name = 'lavaEmber';
            group.add(bubble);
        }

        group.userData.isLavaHazard = true;
        return group;
    },

    // PELIGRO: FILA DE PICOS (llena el hueco entre plataformas, o se coloca sobre una plataforma)
    createSpikeMesh: (width) => {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x616161, metalness: 0.6, roughness: 0.3 });
        const count = Math.max(2, Math.floor(width / 0.9));
        for (let i = 0; i < count; i++) {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.9, 6), mat);
            spike.position.set(-width / 2 + (i + 0.5) * (width / count), 0.3, 0);
            group.add(spike);
        }
        return group;
    },

    // DECORACIONES DE PLATAFORMA SANRIO
    createProp: (type) => {
        const group = new THREE.Group();

        if (type === 'flower') {
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8), new THREE.MeshStandardMaterial({ color: 0x81c784 }));
            stem.position.y = 0.4;
            group.add(stem);

            const petalMat = new THREE.MeshStandardMaterial({ color: 0xff80ab });
            for (let i = 0; i < 5; i++) {
                const petal = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), petalMat);
                const angle = (i / 5) * Math.PI * 2;
                petal.position.set(Math.cos(angle) * 0.25, 0.8, Math.sin(angle) * 0.25);
                group.add(petal);
            }
            const center = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffeb3b }));
            center.position.y = 0.8;
            group.add(center);

        } else if (type === 'mushroom') {
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.7, 16), new THREE.MeshStandardMaterial({ color: 0xfff8e1 }));
            stem.position.y = 0.35;
            group.add(stem);

            const cap = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xff4081, roughness: 0.2 }));
            cap.position.y = 0.7;
            group.add(cap);

        } else if (type === 'bush') {
            const mat = new THREE.MeshStandardMaterial({ color: 0xf8bbd0, roughness: 0.6 });
            const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), mat);
            b1.position.y = 0.4;
            const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), mat);
            b2.position.set(0.4, 0.3, 0);
            group.add(b1, b2);

        } else if (type === 'candycane') {
            const stripeA = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 });
            const stripeB = new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.15 });
            const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.3, 12), stripeA);
            stick.position.y = 0.65;
            group.add(stick);
            for (let i = 0; i < 5; i++) {
                const ring = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.045, 8, 16), stripeB);
                ring.position.y = 0.25 + i * 0.24;
                ring.rotation.x = Math.PI / 2.3;
                group.add(ring);
            }
            const hook = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.11, 10, 20, Math.PI), stripeA);
            hook.position.set(0, 1.32, 0);
            hook.rotation.z = Math.PI / 2;
            group.add(hook);

        } else if (type === 'lollipop') {
            const stickMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
            const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.75, 8), stickMat);
            stick.position.y = 0.38;
            group.add(stick);

            const swirlColors = [0xff4081, 0xffd54f, 0x80deea, 0xba68c8];
            const candyColor = swirlColors[Math.floor(Math.random() * swirlColors.length)];
            const candyMat = new THREE.MeshStandardMaterial({ color: candyColor, roughness: 0.15 });
            const candy = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 24), candyMat);
            candy.position.y = 0.85;
            candy.rotation.x = Math.PI / 2;
            group.add(candy);

            const swirlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 });
            const swirl = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 8, 24), swirlMat);
            swirl.position.set(0, 0.85, 0.075);
            group.add(swirl);

        } else if (type === 'gumdrop') {
            const gumColors = [0xff80ab, 0xffd54f, 0x80deea, 0xba68c8, 0xff8a65];
            const gumMat = new THREE.MeshStandardMaterial({ color: gumColors[Math.floor(Math.random() * gumColors.length)], roughness: 0.2 });
            const drop = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.7), gumMat);
            drop.position.y = 0.3;
            group.add(drop);

        } else if (type === 'applekitty') {
            // La icónica manzanita roja de Hello Kitty
            const appleMat = new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.2 });
            const apple = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 20), appleMat);
            apple.position.y = 0.45;
            apple.scale.set(1, 1.1, 1);
            group.add(apple);

            const dentMat = new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.2 });
            const dent = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), dentMat);
            dent.position.set(0, 0.82, 0.1);
            group.add(dent);

            const stemMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8), stemMat);
            stem.position.set(0, 0.9, 0);
            stem.rotation.z = 0.3;
            group.add(stem);

            const leafMat = new THREE.MeshStandardMaterial({ color: 0x66bb6a, roughness: 0.3 });
            const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), leafMat);
            leaf.scale.set(1.4, 0.4, 0.8);
            leaf.position.set(0.16, 0.95, 0);
            leaf.rotation.z = 0.4;
            group.add(leaf);
        }

        return group;
    },

    createCoinMesh: () => {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.7, roughness: 0.2 });
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 20), mat);
        coin.rotation.x = Math.PI / 2;
        group.add(coin);
        return group;
    },

    // BOLA DE FUEGO DEL JEFE (ataque desde el cielo)
    createFireballMesh: () => {
        const group = new THREE.Group();
        const mat = new THREE.MeshBasicMaterial({ color: 0xff5722 });
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 14), mat);
        group.add(core);

        const glowMat = new THREE.MeshBasicMaterial({ color: 0xffab40, transparent: true, opacity: 0.4 });
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 14), glowMat);
        group.add(glow);

        const trail = Render3D.createDemonParticles(0xffab40);
        trail.scale.set(0.7, 0.7, 0.7);
        group.add(trail);

        return group;
    },

    // CÍRCULO DE ADVERTENCIA DE IMPACTO
    createWarningRing: (radius = 2.0) => {
        const group = new THREE.Group();
        const discMat = new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
        const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), discMat);
        disc.rotation.x = -Math.PI / 2;
        group.add(disc);

        const outlineMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b });
        const outline = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.06, 8, 32), outlineMat);
        outline.rotation.x = -Math.PI / 2;
        group.add(outline);

        return group;
    },

    // --- FONDO MUNDO SANRIO / HELLO KITTY ---
    createBackgroundDecor: (scene, levelWidth, theme = 'garden') => {
        const group = new THREE.Group();
        group.userData.theme = theme;

        const THEMES = {
            garden: { hill1: 0xff8a65, hill2: 0x9c64d6, sun: 0xffd54f, sunGlow: 0xff8a65, tree: 0xff7043, cloud: 0xffe0c2 },
            snow: { hill1: 0xfff9c4, hill2: 0xffe0b2, sun: 0xfff59d, sunGlow: 0xffe0b2, tree: 0xffffff, cloud: 0xffffff },
            night: { hill1: 0x4a148c, hill2: 0x2a1454, sun: 0xe1f5fe, sunGlow: 0x7e57c2, tree: 0x7e57c2, cloud: 0xd1c4e9 }
        };
        const th = THEMES[theme] || THEMES.garden;

        const hillMat1 = new THREE.MeshStandardMaterial({ color: th.hill1, roughness: 0.8 });
        const hillMat2 = new THREE.MeshStandardMaterial({ color: th.hill2, roughness: 0.8 });

        // Sol/Luna gigante en el horizonte (luna en el mundo nocturno)
        const sunMat = new THREE.MeshBasicMaterial({ color: th.sun });
        const sun = new THREE.Mesh(new THREE.SphereGeometry(theme === 'night' ? 7 : 9, 24, 24), sunMat);
        sun.position.set(levelWidth * 0.5, 14, -55);
        group.add(sun);
        const sunGlowMat = new THREE.MeshBasicMaterial({ color: th.sunGlow, transparent: true, opacity: 0.35 });
        const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(theme === 'night' ? 10 : 13, 24, 24), sunGlowMat);
        sunGlow.position.copy(sun.position);
        group.add(sunGlow);

        const count = Math.ceil(levelWidth / 22);
        for (let i = 0; i < count; i++) {
            const hill1 = new THREE.Mesh(new THREE.SphereGeometry(14, 32, 16), hillMat1);
            hill1.position.set(i * 22 - 10, -9, -20);
            hill1.scale.set(1.5, 0.8, 1);
            group.add(hill1);

            const hill2 = new THREE.Mesh(new THREE.SphereGeometry(18, 32, 16), hillMat2);
            hill2.position.set(i * 22 + 8, -11, -34);
            hill2.scale.set(1.7, 0.9, 1);
            group.add(hill2);

            // Árboles (color según el tema: sakura rosa, nevados, o silueta nocturna)
            const sakuraTree = Render3D.createSakuraTree(th.tree);
            sakuraTree.position.set(i * 22 + (Math.random() * 6 - 3), 1, -16);
            group.add(sakuraTree);
        }

        // SEGUNDA CAPA DE BOSQUE: pinos densos y coloridos más cerca de la cámara, con toque mágico (degradado + brillo)
        const pinePalettes = theme === 'night'
            ? [[0x7e57c2, 0x9575cd, 0xb39ddb], [0x5c6bc0, 0x7986cb, 0x9fa8da], [0xba68c8, 0xce93d8, 0xe1bee7]]
            : theme === 'snow'
            ? [[0x4db6ac, 0x80cbc4, 0xb2dfdb], [0x64b5f6, 0x90caf9, 0xbbdefb], [0x81c784, 0xa5d6a7, 0xc8e6c9]]
            : [[0x66bb6a, 0x81c784, 0xa5d6a7], [0xff8a65, 0xffab91, 0xffccbc], [0xba68c8, 0xce93d8, 0xf3e5f5]];
        const pineCount = Math.ceil(levelWidth / 5.5);
        for (let i = 0; i < pineCount; i++) {
            const palette = pinePalettes[Math.floor(Math.random() * pinePalettes.length)];
            const isMagic = Math.random() < 0.35;
            const pine = Render3D.createPineTree(palette, isMagic);
            const scale = 0.55 + Math.random() * 0.8;
            pine.scale.set(scale, scale, scale);
            pine.position.set(Math.random() * (levelWidth + 30) - 15, -0.5 + Math.random() * 0.8, -8 - Math.random() * 7);
            if (isMagic) pine.userData = { isMagicTree: true, twinkleOffset: Math.random() * Math.PI * 2 };
            group.add(pine);
        }

        // Hongos gigantes de cuento de hadas, esparcidos entre los árboles
        const mushroomColors = theme === 'night' ? [0x9575cd, 0xba68c8] : theme === 'snow' ? [0x4fc3f7, 0xff8a65] : [0xff5252, 0xffca28, 0xff80ab];
        const mushroomCount = Math.ceil(levelWidth / 16);
        for (let i = 0; i < mushroomCount; i++) {
            const mush = Render3D.createGiantMushroom(mushroomColors[Math.floor(Math.random() * mushroomColors.length)]);
            const scale = 0.8 + Math.random() * 0.9;
            mush.scale.set(scale, scale, scale);
            mush.position.set(Math.random() * (levelWidth + 30) - 15, -0.3, -6 - Math.random() * 4);
            group.add(mush);
        }

        // FAUNA AMBIENTAL: le da vida real al bosque (revolotean solas, decorativas)
        if (theme === 'garden') {
            const butterflyColors = [0xff80ab, 0xfff176, 0x80deea, 0xba68c8];
            const bfCount = Math.ceil(levelWidth / 9);
            for (let i = 0; i < bfCount; i++) {
                const bf = Render3D.createButterfly(butterflyColors[Math.floor(Math.random() * butterflyColors.length)]);
                const baseY = 3 + Math.random() * 6;
                bf.position.set(Math.random() * (levelWidth + 20) - 10, baseY, -3 - Math.random() * 5);
                bf.userData = { isButterfly: true, baseX: bf.position.x, baseY, roamSpeed: 0.4 + Math.random() * 0.5, roamOffset: Math.random() * Math.PI * 2, flapSpeed: 8 + Math.random() * 4 };
                group.add(bf);
            }
        } else if (theme === 'snow') {
            const birdColors = [0xff7043, 0xffca28, 0xef5350];
            const birdCount = Math.ceil(levelWidth / 14);
            for (let i = 0; i < birdCount; i++) {
                const bird = Render3D.createBird(birdColors[Math.floor(Math.random() * birdColors.length)]);
                const baseY = 8 + Math.random() * 8;
                bird.position.set(Math.random() * (levelWidth + 20) - 10, baseY, -6 - Math.random() * 6);
                bird.userData = { isBird: true, baseY, roamSpeed: 0.5 + Math.random() * 0.4, roamOffset: Math.random() * Math.PI * 2, flapSpeed: 10 + Math.random() * 4 };
                group.add(bird);
            }
        } else if (theme === 'night') {
            const ffCount = Math.ceil(levelWidth / 6);
            for (let i = 0; i < ffCount; i++) {
                const ff = Render3D.createFirefly();
                const baseY = 1.5 + Math.random() * 4;
                ff.position.set(Math.random() * (levelWidth + 20) - 10, baseY, -3 - Math.random() * 6);
                ff.userData = { isFirefly: true, baseX: ff.position.x, baseY, roamSpeed: 0.3 + Math.random() * 0.4, roamOffset: Math.random() * Math.PI * 2 };
                group.add(ff);
            }
        }

        // Nubes con Silueta de Hello Kitty
        const cloudMat = new THREE.MeshStandardMaterial({ color: th.cloud, transparent: true, opacity: theme === 'night' ? 0.5 : 0.9 });
        for (let i = 0; i < count * 2; i++) {
            const kittyCloud = new THREE.Group();
            
            const c1 = new THREE.Mesh(new THREE.SphereGeometry(2.5, 16, 16), cloudMat);
            const c2 = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 16), cloudMat);
            c2.position.set(1.8, -0.2, 0);
            const c3 = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 16), cloudMat);
            c3.position.set(-1.8, -0.3, 0);
            kittyCloud.add(c1, c2, c3);

            const ear1 = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.2, 12), cloudMat);
            ear1.position.set(-1.1, 2.2, 0);
            ear1.rotation.z = 0.2;
            const ear2 = ear1.clone();
            ear2.position.x = 1.1;
            ear2.rotation.z = -0.2;
            kittyCloud.add(ear1, ear2);

            kittyCloud.position.set(i * 12 - 10, 11 + Math.random() * 7, -26 - Math.random() * 10);
            group.add(kittyCloud);
        }

        // Corazones y estrellas flotantes de colores (más vida y alegría)
        const heartColors = theme === 'night' ? [0xba68c8, 0x7e57c2, 0xffffff, 0xd1c4e9] : theme === 'snow' ? [0x81d4fa, 0xffffff, 0xfff59d, 0xb3e5fc] : [0xff1744, 0xff4081, 0xba68c8, 0xff80ab, 0xf06292];
        const starColors = theme === 'night' ? [0xffffff, 0xfff9c4, 0xe1f5fe] : [0xffd54f, 0xfff176, 0xffffff, 0xff80ab, 0x80deea];
        const decorCount = Math.ceil(levelWidth / 7);
        for (let i = 0; i < decorCount; i++) {
            const isHeart = theme === 'night' ? Math.random() > 0.75 : Math.random() > 0.45;
            const color = isHeart
                ? heartColors[Math.floor(Math.random() * heartColors.length)]
                : starColors[Math.floor(Math.random() * starColors.length)];
            const deco = isHeart ? Render3D.createHeartMesh(color) : Render3D.createStarMesh(color);

            const scale = 0.6 + Math.random() * 1.0;
            deco.scale.set(scale, scale, scale);

            const baseY = 6 + Math.random() * 15;
            deco.position.set(
                Math.random() * (levelWidth + 30) - 15,
                baseY,
                -10 - Math.random() * 24
            );

            deco.userData = {
                isFloatDecor: true,
                baseY,
                floatSpeed: 0.4 + Math.random() * 0.7,
                floatOffset: Math.random() * Math.PI * 2,
                floatAmp: 0.6 + Math.random() * 0.9
            };
            group.add(deco);
        }

        // Nieve cayendo (solo tema 'snow')
        if (theme === 'snow') {
            const snowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
            const snowCount = Math.ceil(levelWidth / 3);
            for (let i = 0; i < snowCount; i++) {
                const flake = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.08, 6, 6), snowMat);
                const startY = Math.random() * 22;
                flake.position.set(Math.random() * (levelWidth + 30) - 15, startY, -5 - Math.random() * 20);
                flake.userData = { isSnowflake: true, baseY: startY, fallSpeed: 0.6 + Math.random() * 0.8, driftOffset: Math.random() * Math.PI * 2 };
                group.add(flake);
            }
        }

        // Estrellas titilantes (solo tema 'night')
        if (theme === 'night') {
            const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const twinkleCount = Math.ceil(levelWidth / 2.5);
            for (let i = 0; i < twinkleCount; i++) {
                const tstar = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), starMat);
                tstar.position.set(Math.random() * (levelWidth + 30) - 15, 8 + Math.random() * 20, -30 - Math.random() * 25);
                tstar.userData = { isTwinkleStar: true, twinkleOffset: Math.random() * Math.PI * 2 };
                group.add(tstar);
            }
        }

        scene.add(group);
        return group;
    },

    // 🌲 PINO DE BOSQUE (denso, para el primer plano - da sensación de bosque real)
    createPineTree: (color = 0x2e7d32, magic = false) => {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.22, 0.32, 2.2, 8),
            new THREE.MeshStandardMaterial({ color: magic ? 0x8d6e63 : 0x6d4c41 })
        );
        trunk.position.y = 1.1;
        tree.add(trunk);

        // Si color es un array, cada nivel del árbol usa un color distinto (efecto degradado mágico)
        const colors = Array.isArray(color) ? color : [color, color, color];
        const tiers = [
            { y: 2.3, r: 1.5, h: 1.6 },
            { y: 3.3, r: 1.15, h: 1.4 },
            { y: 4.15, r: 0.75, h: 1.2 }
        ];
        tiers.forEach((t, i) => {
            const mat = new THREE.MeshStandardMaterial({
                color: colors[i % colors.length], roughness: 0.65, flatShading: true,
                emissive: magic ? colors[i % colors.length] : 0x000000, emissiveIntensity: magic ? 0.18 : 0
            });
            const cone = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 8), mat);
            cone.position.y = t.y;
            tree.add(cone);
        });

        // Árbol mágico: brillo/estrellita en la punta, como un árbol encantado
        if (magic) {
            const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff59d });
            const glow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), glowMat);
            glow.position.y = 4.95;
            glow.name = 'magicGlow';
            tree.add(glow);
            const haloMat = new THREE.MeshBasicMaterial({ color: 0xfff9c4, transparent: true, opacity: 0.4 });
            const halo = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), haloMat);
            halo.position.y = 4.95;
            halo.name = 'magicHalo';
            tree.add(halo);
        }

        return tree;
    },

    // 🍄 HONGO GIGANTE DE BOSQUE MÁGICO (decorativo, le da toque de cuento de hadas)
    createGiantMushroom: (capColor = 0xff5252) => {
        const group = new THREE.Group();
        const stemMat = new THREE.MeshStandardMaterial({ color: 0xfff3e0, roughness: 0.6 });
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.32, 1.1, 10), stemMat);
        stem.position.y = 0.55;
        group.add(stem);

        const capMat = new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.5 });
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), capMat);
        cap.position.y = 1.15;
        group.add(cap);

        const dotMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
        for (let i = 0; i < 5; i++) {
            const dot = new THREE.Mesh(new THREE.SphereGeometry(0.09 + Math.random() * 0.05, 8, 8), dotMat);
            const ang = (i / 5) * Math.PI * 2;
            dot.position.set(Math.cos(ang) * 0.45, 1.35, Math.sin(ang) * 0.45);
            group.add(dot);
        }
        return group;
    },

    createSakuraTree: (color = 0xff7043) => {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.6, 4, 12),
            new THREE.MeshStandardMaterial({ color: 0x8d6e63 })
        );
        trunk.position.y = 2;
        tree.add(trunk);

        const leavesMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
        const top1 = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 16), leavesMat);
        top1.position.y = 4.5;
        tree.add(top1);

        const top2 = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 16), leavesMat);
        top2.position.set(1.1, 4.0, 0);
        tree.add(top2);

        return tree;
    },

    // 🦋 MARIPOSA AMBIENTAL (decorativa, revolotea sola - vida en el Jardín Rosa)
    createButterfly: (color = 0xff80ab) => {
        const group = new THREE.Group();
        const wingMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
        const wingL = new THREE.Mesh(new THREE.CircleGeometry(0.28, 10, 0, Math.PI), wingMat);
        wingL.rotation.y = Math.PI / 2;
        wingL.position.x = -0.03;
        wingL.name = 'wingL';
        group.add(wingL);
        const wingR = wingL.clone();
        wingR.rotation.y = -Math.PI / 2;
        wingR.position.x = 0.03;
        wingR.name = 'wingR';
        group.add(wingR);
        const bodyMat = new THREE.MeshBasicMaterial({ color: 0x4a148c });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 6), bodyMat);
        body.rotation.z = Math.PI / 2;
        group.add(body);
        group.scale.set(1.2, 1.2, 1.2);
        return group;
    },

    // ✨ LUCIÉRNAGA AMBIENTAL (decorativa - vida nocturna en Castillo Dulce)
    createFirefly: () => {
        const group = new THREE.Group();
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff59d });
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), glowMat);
        group.add(glow);
        const haloMat = new THREE.MeshBasicMaterial({ color: 0xfff9c4, transparent: true, opacity: 0.35 });
        const halo = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), haloMat);
        group.add(halo);
        return group;
    },

    // 🐦 PAJARITO AMBIENTAL (decorativo - vida en Valle Dorado)
    createBird: (color = 0xff7043) => {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), bodyMat);
        body.scale.set(1.3, 1, 1);
        group.add(body);
        const wingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        const wingL = new THREE.Mesh(new THREE.CircleGeometry(0.15, 8, 0, Math.PI), wingMat);
        wingL.position.set(-0.05, 0.02, 0);
        wingL.rotation.y = Math.PI / 2;
        wingL.name = 'wingL';
        group.add(wingL);
        const wingR = wingL.clone();
        wingR.position.set(0.05, 0.02, 0);
        wingR.rotation.y = -Math.PI / 2;
        wingR.name = 'wingR';
        group.add(wingR);
        const beakMat = new THREE.MeshBasicMaterial({ color: 0xffca28 });
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 6), beakMat);
        beak.rotation.z = -Math.PI / 2;
        beak.position.set(0.18, 0, 0);
        group.add(beak);
        return group;
    },

    updatePlayerSpriteAnim: (playerMesh, direction, frameIndex, isAirborne = false) => {
        if (!playerMesh || !playerMesh.userData) return;

        // Personajes geométricos (Kuromi, My Melody, Purin, Cinnamoroll): no
        // tienen textura, así que se animan moviendo su "rig" y sus piezas
        // (piernas, brazos, cola, orejas) en vez de cambiar cuadros de sprite.
        if (playerMesh.userData.isGeo) {
            const ud = playerMesh.userData;
            const rig = ud.rig;
            if (!rig) return;

            // Gira el personaje para que mire hacia el lado en que camina.
            rig.rotation.y = direction === 'left' ? -Math.PI / 2 : Math.PI / 2;

            const baseY = ud.baseY ?? 0;
            if (isAirborne) {
                // Estirón hacia arriba en el salto (squash & stretch clásico)
                rig.scale.set(0.9, 1.15, 0.9);
                rig.position.y = baseY + 0.05;
                if (ud.legL) ud.legL.rotation.x = -0.4;
                if (ud.legR) ud.legR.rotation.x = 0.4;
                if (ud.armL) ud.armL.rotation.x = -0.6;
                if (ud.armR) ud.armR.rotation.x = 0.6;
            } else {
                const phase = ((frameIndex % 4) / 4) * Math.PI * 2;
                const bounce = Math.abs(Math.sin(phase)) * 0.14;
                rig.position.y = baseY + bounce;

                // Achatadito al tocar el piso, más redondo al despegar: le da peso y vida.
                const squash = 1 - bounce * 0.4;
                rig.scale.set(1 + (1 - squash) * 0.5, squash, 1 + (1 - squash) * 0.5);

                const swing = Math.sin(phase) * 0.55;
                if (ud.legL) ud.legL.rotation.x = swing;
                if (ud.legR) ud.legR.rotation.x = -swing;
                if (ud.armL) ud.armL.rotation.x = -swing * 0.7;
                if (ud.armR) ud.armR.rotation.x = swing * 0.7;

                if (ud.tailMesh) ud.tailMesh.rotation.y = Math.sin(phase * 1.5) * 0.45;
                const earWiggle = Math.sin(phase * 2) * 0.06;
                if (ud.earL) ud.earL.rotation.z = (ud.earBaseRotZ ?? 0.4) + earWiggle;
                if (ud.earR) ud.earR.rotation.z = -(ud.earBaseRotZ ?? 0.4) - earWiggle;
            }
            return;
        }

        if (!playerMesh.userData.texture) return;
        const texture = playerMesh.userData.texture;
        const layout = playerMesh.userData.spriteLayout || 'grid4x4';

        if (layout === 'grid4x4') {
            let row = (direction === 'left') ? 1 : 2;
            let col = frameIndex % 4;
            texture.offset.x = col * 0.25;
            texture.offset.y = (3 - row) * 0.25;
        } else {
            // Layout de una sola fila (Kuromi, Purin, Cinnamoroll, My Melody).
            // Ciclo de 4 pasos reutilizando las 3 poses reales (0,1,3) para que
            // el caminar se sienta tan vivo como el de Hello Kitty, aunque el
            // arte no tenga piernas distintas por fotograma. Col 2 queda
            // reservada solo para el salto.
            const WALK_CYCLE = [0, 1, 3, 1];
            const col = isAirborne ? 2 : WALK_CYCLE[frameIndex % WALK_CYCLE.length];
            texture.offset.x = col * 0.25;
            texture.offset.y = 0;
            const sprite = playerMesh.userData.sprite;
            if (sprite) {
                const base = Math.abs(sprite.scale.x) || 3.2;
                sprite.scale.x = direction === 'left' ? -base : base;

                // Rebotito vertical sincronizado con el paso: le da "peso" y
                // vida al caminar en vez de quedar plantada en su sitio.
                const baseY = playerMesh.userData.spriteBaseY ?? 1.2;
                if (isAirborne) {
                    sprite.position.y = baseY;
                    sprite.scale.y = Math.abs(sprite.scale.x); // sin squash en el aire
                } else if (col === 0) {
                    sprite.position.y = baseY;
                    sprite.scale.y = base;
                } else {
                    sprite.position.y = baseY + 0.08;
                    sprite.scale.y = base * 0.97;
                }
            }
        }
    },

    createHeartMesh: (color = 0xff1744) => {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25, roughness: 0.1 });
        const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), mat);
        s1.position.set(-0.16, 0.16, 0);
        group.add(s1);
        const s2 = s1.clone(); s2.position.x = 0.16;
        group.add(s2);
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.65, 16), mat);
        cone.rotation.z = Math.PI; cone.position.set(0, -0.12, 0);
        group.add(cone);
        return group;
    },

    // ESTRELLA DECORATIVA BRILLANTE
    createStarMesh: (color = 0xffd54f) => {
        const shape = new THREE.Shape();
        const spikes = 5, outerR = 0.5, innerR = 0.2;
        for (let i = 0; i < spikes * 2; i++) {
            const r = (i % 2 === 0) ? outerR : innerR;
            const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
            if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
        }
        shape.closePath();

        const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
        const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.15 });
        const mesh = new THREE.Mesh(geo, mat);
        return mesh;
    },

    // LLAVE COLECCIONABLE DE MUNDO (dorada, con moño rosa a juego con el tema Sanrio)
    createKeyMesh: () => {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffb300, emissiveIntensity: 0.5, metalness: 0.75, roughness: 0.2 });

        // Anillo de la llave
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.09, 12, 24), mat);
        ring.position.set(-0.35, 0, 0);
        group.add(ring);

        // Vástago
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 10), mat);
        shaft.rotation.z = Math.PI / 2;
        shaft.position.set(0.25, 0, 0);
        group.add(shaft);

        // Dientes de la llave
        const tooth1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.14), mat);
        tooth1.position.set(0.6, -0.15, 0);
        group.add(tooth1);

        const tooth2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.14), mat);
        tooth2.position.set(0.78, -0.1, 0);
        group.add(tooth2);

        // Moñito rosa Sanrio en el anillo
        const bowMat = new THREE.MeshStandardMaterial({ color: 0xff4081, roughness: 0.25 });
        const bow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), bowMat);
        bow.position.set(-0.35, 0.32, 0);
        group.add(bow);

        group.scale.set(1.15, 1.15, 1.15);
        return group;
    },

    // ARCO VICTORIA HELLO KITTY CON MOÑO GIGANTE
    createGoalPost: () => {
        const group = new THREE.Group();

        const cake = new THREE.Mesh(
            new THREE.CylinderGeometry(2.2, 2.5, 1.5, 32), 
            new THREE.MeshStandardMaterial({ color: 0xf48fb1, roughness: 0.3 })
        );
        cake.position.y = 0.75;
        cake.receiveShadow = true;
        group.add(cake);

        const poleMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 16), poleMat);
        p1.position.set(-1.5, 3.8, 0);
        group.add(p1);

        const p2 = p1.clone();
        p2.position.x = 1.5;
        group.add(p2);

        // Moño Rosa Gigante
        const bowMat = new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.2 });
        const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), bowMat);
        bowCenter.position.set(0, 6.8, 0);
        group.add(bowCenter);

        const bowLeft = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.2, 16), bowMat);
        bowLeft.rotation.z = Math.PI / 2;
        bowLeft.position.set(-0.8, 6.8, 0);
        group.add(bowLeft);

        const bowRight = bowLeft.clone();
        bowRight.rotation.z = -Math.PI / 2;
        bowRight.position.x = 0.8;
        group.add(bowRight);

        return group;
    },

    createCakeBulletMesh: (type) => {
        const mat = type === 'normal' 
            ? new THREE.MeshStandardMaterial({ color: 0xff4081, roughness: 0.1 }) 
            : new THREE.MeshStandardMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.9 });
        return new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), mat);
    }
};