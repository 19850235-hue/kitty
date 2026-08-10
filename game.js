// ==========================================
// --- MÓDULO PRINCIPAL GAME.JS (SUPER SANRIO VS DEMONIOS) ---
// ==========================================

let gameProgress = { unlockedLevels: [true, false, false], selectedSkin: 'kitty', currentLevel: 0, score: 0 };

const CHARACTERS = {
    kitty: { 
        name: 'Hello Kitty', 
        speed: 14, 
        jump: 17, 
        maxLives: 3, 
        label: '🎀 Lluvia Dulce (AoE)', 
        abilityName: 'Lluvia de Galletas', 
        cooldown: 8 
    },
    mymelody: { 
        name: 'My Melody', 
        speed: 12, 
        jump: 20, 
        maxLives: 3, 
        label: '🌸 Escudo Arcoíris', 
        abilityName: 'Burbuja de Invulnerabilidad', 
        cooldown: 12 
    },
    kuromi: { 
        name: 'Kuromi', 
        speed: 18, 
        jump: 15, 
        maxLives: 3, 
        label: '😈 Embestida Sombría', 
        abilityName: 'Dash Demoniaco', 
        cooldown: 6 
    },
    cinnamon: { 
        name: 'Cinnamoroll', 
        speed: 13, 
        jump: 22, 
        maxLives: 3, 
        label: '☁️ Triple Salto / Tornado', 
        abilityName: 'Vuelo Alto', 
        maxJumps: 3, 
        cooldown: 7 
    },
    purin: { 
        name: 'Pompompurin', 
        speed: 11, 
        jump: 16, 
        maxLives: 4, 
        label: '💛 Tanque (4 Vidas)', 
        abilityName: 'Onda Expansiva', 
        cooldown: 9 
    }
};

const LEVELS = [
    { id: 0, name: 'Nivel 1: Jardín Rosa 🎀', bg: 0xff8a65, platform: 0xff1f6d },
    { id: 1, name: 'Nivel 2: Valle Dorado 🪙', bg: 0xffb300, platform: 0xff6f00 },
    { id: 2, name: 'Nivel 3: Castillo Dulce 🏰', bg: 0xb0508f, platform: 0x5e17a8 }
];

const container = document.getElementById('game-container');
container.style.position = 'relative';

function renderMenu() {
    container.innerHTML = '';
    const menu = document.createElement('div');
    menu.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(255, 221, 225, 0.95); display: flex; flex-direction: column;
        align-items: center; justify-content: center; font-family: 'Fredoka One', cursive; color: #d81b60;
    `;

    menu.innerHTML = `
        <h2 style="font-size: 26px; margin-bottom: 10px;">🎀 SANRIO 3D SUPER WORLD 🎀</h2>
        <p style="font-weight: bold;">Elige tu Personaje:</p>
        <div id="char-btns" style="display: flex; gap: 8px; margin-bottom: 15px; flex-wrap: wrap; justify-content: center;"></div>
        <p style="font-weight: bold;">Selecciona Nivel:</p>
        <div id="lvl-btns" style="display: flex; flex-direction: column; gap: 8px;"></div>
    `;
    container.appendChild(menu);

    const charBox = menu.querySelector('#char-btns');
    Object.keys(CHARACTERS).forEach(key => {
        const c = CHARACTERS[key];
        const btn = document.createElement('button');
        btn.innerText = `${c.name}\n${c.label}`;
        btn.style.cssText = `padding: 8px 12px; border: none; border-radius: 12px; cursor: pointer; background: ${gameProgress.selectedSkin === key ? '#ff1744' : '#ff80ab'}; color: white; font-family: inherit; font-size: 12px;`;
        btn.onclick = () => { gameProgress.selectedSkin = key; renderMenu(); };
        charBox.appendChild(btn);
    });

    const lvlBox = menu.querySelector('#lvl-btns');
    LEVELS.forEach((lvl, idx) => {
        const unlocked = gameProgress.unlockedLevels[idx];
        const btn = document.createElement('button');
        btn.innerText = unlocked ? lvl.name : `🔒 ${lvl.name}`;
        btn.disabled = !unlocked;
        btn.style.cssText = `padding: 8px 16px; border: none; border-radius: 12px; background: ${unlocked ? '#4caf50' : '#b0bec5'}; color: white; font-family: inherit; cursor: ${unlocked ? 'pointer' : 'not-allowed'};`;
        btn.onclick = () => { if (window.AudioFX) AudioFX.init(); gameProgress.currentLevel = idx; start3DGame(); };
        lvlBox.appendChild(btn);
    });
}

function start3DGame() {
    container.innerHTML = '';
    const currentLvl = LEVELS[gameProgress.currentLevel];
    const currentChar = CHARACTERS[gameProgress.selectedSkin];

    if (window.AudioFX) AudioFX.playBackgroundMusic();

    const { scene, camera, renderer } = Render3D.setupScene(container, 800, 400, currentLvl.bg);
    const world = PhysicsEngine.initWorld();

    // Crear MESH del Personaje
    const playerMesh = Render3D.createPlayerMesh(gameProgress.selectedSkin);
    scene.add(playerMesh);
    const playerBody = PhysicsEngine.createPlayerBody(0, 4, 0);
    world.addBody(playerBody);

    // Malla para Escudo de Habilidad Especial
    let shieldMesh = null;

    let lives = currentChar.maxLives;
    let isInvulnerable = false;
    let abilityTimer = 0;
    let abilityCooldown = 0;
    let isDashing = false;

    // HUD
    const hud = document.createElement('div');
    hud.style.cssText = `position: absolute; top: 12px; left: 15px; color: #d81b60; font-family: 'Fredoka One', cursive; font-size: 14px; font-weight: bold; text-shadow: 1px 1px 2px #fff; pointer-events: none; line-height: 1.4;`;
    container.appendChild(hud);

    function updateHUD(bossHPText = '') {
        const cdText = abilityCooldown > 0 ? `⏳ Special (${Math.ceil(abilityCooldown)}s)` : `✨ Special (E) LISTO!`;
        hud.innerHTML = `Vidas: ${'💖'.repeat(lives)} | Puntos: ${gameProgress.score} | ${cdText} ${bossHPText ? `<br>👺 JEFE DEMONIO: ${bossHPText}` : ''}`;
    }
    updateHUD();

    // Generación del Nivel
    const enemies = [], flyingEnemies = [], bullets = [], hearts = [];
    const layout = [
        { x: 0, y: 0, w: 25 },
        { x: 30, y: 2, w: 16 },
        { x: 50, y: 5, w: 14 },
        { x: 68, y: 1, w: 18 },
        { x: 90, y: 4, w: 14 },
        { x: 108, y: 2, w: 16 },
        { x: 128, y: 6, w: 14 },
        { x: 146, y: 3, w: 16 },
        { x: 166, y: 0, w: 18 },
        { x: 188, y: 4, w: 14 },
        { x: 206, y: 2, w: 16 },
        { x: 226, y: 5, w: 14 },
        { x: 244, y: 1, w: 18 },
        { x: 266, y: 0, w: 40 }
    ];

    layout.forEach((plat, i) => {
        let pMesh = Render3D.createPlatformMesh(plat.w, 1.4, 6, currentLvl.platform);
        pMesh.position.set(plat.x, plat.y, 0);
        scene.add(pMesh);

        let pBody = PhysicsEngine.createPlatformBody(plat.x, plat.y, 0, plat.w, 1.4, 6);
        world.addBody(pBody);

        // Decoraciones sobre plataformas (más variedad y más frecuencia)
        const propTypes = ['flower', 'mushroom', 'candycane', 'lollipop', 'gumdrop', 'applekitty', 'bush'];
        if (plat.w > 10) {
            const prop = Render3D.createProp(propTypes[Math.floor(Math.random() * propTypes.length)]);
            prop.position.set(plat.x - plat.w / 3, plat.y + 0.7, plat.w > 15 ? -1.2 : 0);
            scene.add(prop);

            const prop2 = Render3D.createProp(propTypes[Math.floor(Math.random() * propTypes.length)]);
            prop2.position.set(plat.x + plat.w / 4, plat.y + 0.7, plat.w > 15 ? 1.2 : 0);
            scene.add(prop2);
        } else if (i % 2 === 0) {
            const prop = Render3D.createProp(propTypes[Math.floor(Math.random() * propTypes.length)]);
            prop.position.set(plat.x, plat.y + 0.7, 0);
            scene.add(prop);
        }

        // Enemigos Terrestres
        if (i > 0 && i < layout.length - 1) {
            let eMesh = Render3D.createEnemyMesh();
            scene.add(eMesh);
            let eBody = PhysicsEngine.createEnemyBody(plat.x, plat.y + 3, 0);
            world.addBody(eBody);
            enemies.push({ mesh: eMesh, body: eBody, isFrozen: false, freezeTimer: 0, active: true, iceBlock: null });
        }

        // Enemigos Voladores
        if (i > 1 && i % 2 === 0 && i < layout.length - 1) {
            let fMesh = Render3D.createFlyingEnemyMesh();
            fMesh.position.set(plat.x, plat.y + 5, 0);
            scene.add(fMesh);
            flyingEnemies.push({ mesh: fMesh, origY: plat.y + 5, angle: Math.random() * Math.PI, isFrozen: false, freezeTimer: 0, active: true, iceBlock: null });
        }

        // Corazones
        if (plat.y >= 4 && i % 4 === 0) {
            let hMesh = Render3D.createHeartMesh();
            hMesh.position.set(plat.x, plat.y + 2.5, 0);
            scene.add(hMesh);
            hearts.push({ mesh: hMesh, active: true });
        }
    });

    const lastPlat = layout[layout.length - 1];
    const bossPatrolMin = lastPlat.x - 8;
    const bossPatrolMax = lastPlat.x + lastPlat.w - 10;
    const bossStartX = lastPlat.x + 8;
    const goalX = lastPlat.x + lastPlat.w - 8;

    // JEFE DEMONIACO
    const bossMesh = Render3D.createBossMesh();
    bossMesh.position.set(bossStartX, 3.5, 0);
    scene.add(bossMesh);

    let boss = {
        mesh: bossMesh,
        hp: 10,
        maxHP: 10,
        active: true,
        dir: -1,
        speed: 7.5,
        isFrozen: false,
        freezeTimer: 0,
        isEnraged: false,
        iceBlock: null,
        fireballTimer: 3.0
    };
    const fireballs = [];

    // Encuentra la altura de plataforma más cercana a una posición X (para las bolas de fuego)
    function getGroundYAt(x) {
        let best = layout[0], bestDist = Infinity;
        layout.forEach(p => {
            const halfW = p.w / 2;
            if (x >= p.x - halfW && x <= p.x + halfW) { best = p; bestDist = 0; }
            else {
                const d = Math.min(Math.abs(x - (p.x - halfW)), Math.abs(x - (p.x + halfW)));
                if (d < bestDist) { bestDist = d; best = p; }
            }
        });
        return best.y;
    }

    function spawnBossFireball() {
        const targetX = playerMesh.position.x + (Math.random() - 0.5) * 5;
        const groundY = getGroundYAt(targetX) + 0.75;
        const warnRadius = 2.0;

        const warnMesh = Render3D.createWarningRing(warnRadius);
        warnMesh.position.set(targetX, groundY + 0.05, 0);
        scene.add(warnMesh);

        const fireMesh = Render3D.createFireballMesh();
        const startY = groundY + 22;
        fireMesh.position.set(targetX, startY, 0);
        scene.add(fireMesh);

        fireballs.push({ warnMesh, fireMesh, targetX, groundY, warnRadius, startY, timer: 1.1, duration: 1.1, landed: false });
        if (window.AudioFX) AudioFX.playUlti();
    }

    // Meta Final
    const goalMesh = Render3D.createGoalPost();
    goalMesh.position.set(goalX, 1.2, 0);
    scene.add(goalMesh);

    // Fondo Kawaii / Sanrio
    const bgDecor = Render3D.createBackgroundDecor(scene, lastPlat.x + lastPlat.w + 40);

    // Controles
    const keys = { left: false, right: false };
    let facingRight = true, jumpCount = 0;
    const maxJumpsAllowed = currentChar.maxJumps || 2;

    const onKeyDown = (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
        if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
        if (e.key === ' ' || e.key === 'w') {
            if (jumpCount < maxJumpsAllowed) { 
                playerBody.velocity.y = currentChar.jump; 
                jumpCount++; 
                if (window.AudioFX) AudioFX.playJump();
            }
        }
        if (e.key === 'f' || e.key === 'z') shoot('normal');
        if (e.key === 'x' || e.key === 'c') shoot('ice');
        if (e.key === 'e' || e.key === 'E') useSpecialAbility();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
    });

    function shoot(type) {
        const mesh = Render3D.createCakeBulletMesh(type);
        mesh.position.set(playerMesh.position.x, playerMesh.position.y + 0.5, 0);
        scene.add(mesh);
        bullets.push({ mesh, vx: facingRight ? 28 : -28, type, life: 55 });
        if (window.AudioFX) {
            if (type === 'normal') AudioFX.playShoot();
            else AudioFX.playFreeze();
        }
    }

    // --- SISTEMA DE HABILIDADES ESPECIALES (ULTIS) ---
    function useSpecialAbility() {
        if (abilityCooldown > 0) return;
        abilityCooldown = currentChar.cooldown;

        if (gameProgress.selectedSkin === 'kitty') {
            // Lluvia de Galletas (Limpieza AoE)
            enemies.forEach(e => {
                if (e.active && playerMesh.position.distanceTo(e.mesh.position) < 16) {
                    e.active = false;
                    scene.remove(e.mesh);
                    world.removeBody(e.body);
                    gameProgress.score += 200;
                }
            });
            if (boss.active && playerMesh.position.distanceTo(boss.mesh.position) < 18) {
                boss.hp -= 2;
            }
        } else if (gameProgress.selectedSkin === 'mymelody') {
            // Escudo de Inmunidad
            isInvulnerable = true;
            abilityTimer = 5.0;
            if (!shieldMesh) {
                shieldMesh = Render3D.createShieldBubble();
                playerMesh.add(shieldMesh);
            }
        } else if (gameProgress.selectedSkin === 'kuromi') {
            // Dash / Embestida Sombría
            isDashing = true;
            abilityTimer = 0.6;
            playerBody.velocity.x = facingRight ? 42 : -42;
        } else if (gameProgress.selectedSkin === 'cinnamon') {
            // Ciclón Dulce que congela todo alrededor
            enemies.concat(flyingEnemies).forEach(e => {
                if (e.active && playerMesh.position.distanceTo(e.mesh.position) < 14) {
                    e.isFrozen = true;
                    e.freezeTimer = 4.0;
                }
            });
        } else if (gameProgress.selectedSkin === 'purin') {
            // Onda Expansiva
            playerBody.velocity.y = 18;
            enemies.forEach(e => {
                if (e.active && playerMesh.position.distanceTo(e.mesh.position) < 12) {
                    e.active = false;
                    scene.remove(e.mesh);
                }
            });
        }
        updateHUD(boss.active ? '💜'.repeat(boss.hp) : '');
    }

    function takeDamage() {
        if (isInvulnerable || isDashing) return;
        if (window.AudioFX) AudioFX.playPlayerHit();
        lives--;
        updateHUD(boss.active ? '💜'.repeat(boss.hp) : '');
        playerBody.velocity.set(facingRight ? -14 : 14, 11, 0);

        if (lives <= 0) { isRunning = false; if (window.AudioFX) AudioFX.stopBackgroundMusic(); renderMenu(); } 
        else {
            isInvulnerable = true;
            let flashes = 0;
            let interval = setInterval(() => {
                playerMesh.visible = !playerMesh.visible;
                flashes++;
                if (flashes > 4) {
                    clearInterval(interval);
                    playerMesh.visible = true;
                    if (abilityTimer <= 0) isInvulnerable = false;
                }
            }, 150);
        }
    }

    const clock = new THREE.Clock();
    let isRunning = true;
    let animFrame = 0, animTimer = 0;

    function animate() {
        if (!isRunning) return;
        requestAnimationFrame(animate);

        const delta = clock.getDelta();
        world.step(1 / 60, delta, 3);

        // Actualizar Cooldowns y Habilidades
        if (abilityCooldown > 0) {
            abilityCooldown -= delta;
            if (abilityCooldown < 0) abilityCooldown = 0;
            updateHUD(boss.active ? '💜'.repeat(boss.hp) : '');
        }

        if (abilityTimer > 0) {
            abilityTimer -= delta;
            if (abilityTimer <= 0) {
                if (gameProgress.selectedSkin === 'mymelody') {
                    isInvulnerable = false;
                    if (shieldMesh) { playerMesh.remove(shieldMesh); shieldMesh = null; }
                }
                if (gameProgress.selectedSkin === 'kuromi') isDashing = false;
            }
        }

        // Animación del Sprite / Personaje
        animTimer += delta;
        if (animTimer > 0.1) {
            animFrame++;
            animTimer = 0;
        }

        playerMesh.position.copy(playerBody.position);
        const isAirborne = Math.abs(playerBody.velocity.y) > 0.5;

        if (!isDashing) {
            if (keys.left) { 
                playerBody.velocity.x = -currentChar.speed; 
                facingRight = false; 
                Render3D.updatePlayerSpriteAnim(playerMesh, 'left', animFrame, isAirborne);
            } else if (keys.right) { 
                playerBody.velocity.x = currentChar.speed; 
                facingRight = true; 
                Render3D.updatePlayerSpriteAnim(playerMesh, 'right', animFrame, isAirborne);
            } else { 
                playerBody.velocity.x *= 0.8; 
                Render3D.updatePlayerSpriteAnim(playerMesh, facingRight ? 'right' : 'left', 0, isAirborne);
            }
        } else {
            // Embestida de Kuromi destruye enemigos al contacto
            enemies.concat(flyingEnemies).forEach(e => {
                if (e.active && playerMesh.position.distanceTo(e.mesh.position) < 2.0) {
                    e.active = false;
                    scene.remove(e.mesh);
                }
            });
        }

        if (Math.abs(playerBody.velocity.y) < 0.1) jumpCount = 0;

        // Enemigos Terrestres
        enemies.forEach(e => {
            if (!e.active) return;
            e.mesh.position.copy(e.body.position);

            if (e.isFrozen) {
                e.body.velocity.x = 0;
                e.freezeTimer -= delta;
                if (!e.iceBlock) {
                    e.iceBlock = Render3D.createIceBlock();
                    e.mesh.add(e.iceBlock);
                }
                if (e.freezeTimer <= 0) {
                    e.isFrozen = false;
                    if (e.iceBlock) { e.mesh.remove(e.iceBlock); e.iceBlock = null; }
                }
            } else {
                let dist = playerMesh.position.distanceTo(e.mesh.position);
                if (dist < 18) {
                    if (playerMesh.position.x < e.mesh.position.x) e.body.velocity.x = -8;
                    else e.body.velocity.x = 8;
                }
                if (dist < 1.9) takeDamage();
            }
        });

        // Enemigos Voladores
        flyingEnemies.forEach(fe => {
            if (!fe.active) return;

            if (fe.isFrozen) {
                fe.freezeTimer -= delta;
                if (!fe.iceBlock) {
                    fe.iceBlock = Render3D.createIceBlock();
                    fe.mesh.add(fe.iceBlock);
                }
                if (fe.freezeTimer <= 0) {
                    fe.isFrozen = false;
                    if (fe.iceBlock) { fe.mesh.remove(fe.iceBlock); fe.iceBlock = null; }
                }
            } else {
                fe.angle += delta * 3.2;
                fe.mesh.position.y = fe.origY + Math.sin(fe.angle) * 1.5;
                let hdist = playerMesh.position.x - fe.mesh.position.x;
                if (Math.abs(hdist) < 16) {
                    fe.mesh.position.x += Math.sign(hdist) * 3.5 * delta;
                }
                if (playerMesh.position.distanceTo(fe.mesh.position) < 1.4) takeDamage();
            }
        });

        // Lógica del Jefe Demoniaco y Modo Furia
        if (boss.active) {
            // Verificar si entra en Modo Furia (HP < 50%)
            if (boss.hp <= boss.maxHP / 2 && !boss.isEnraged) {
                boss.isEnraged = true; // Aumenta velocidad
                boss.speed *= 1.4;
                boss.fireballTimer = 1.5; // primera bola de fuego llega rápido al enfurecerse
            }

            if (boss.isFrozen) {
                boss.freezeTimer -= delta;
                if (!boss.iceBlock) {
                    boss.iceBlock = Render3D.createIceBlock();
                    boss.iceBlock.scale.set(2, 2, 2);
                    boss.mesh.add(boss.iceBlock);
                }
                if (boss.freezeTimer <= 0) {
                    boss.isFrozen = false;
                    if (boss.iceBlock) { boss.mesh.remove(boss.iceBlock); boss.iceBlock = null; }
                }
            } else {
                boss.mesh.position.x += boss.dir * boss.speed * delta;
                boss.mesh.rotation.y += boss.isEnraged ? 0.06 : 0.03;

                if (boss.mesh.position.x < bossPatrolMin) boss.dir = 1;
                if (boss.mesh.position.x > bossPatrolMax) boss.dir = -1;

                if (playerMesh.position.distanceTo(boss.mesh.position) < 2.5) takeDamage();

                // Ataque cronometrado: solo en Modo Furia lanza bolas de fuego que caen del cielo
                if (boss.isEnraged) {
                    boss.fireballTimer -= delta;
                    if (boss.fireballTimer <= 0) {
                        spawnBossFireball();
                        spawnBossFireball();
                        boss.fireballTimer = 2.2;
                    }
                }
            }
        }

        // Bolas de fuego cayendo (advertencia en el suelo + impacto)
        for (let i = fireballs.length - 1; i >= 0; i--) {
            const fb = fireballs[i];
            fb.timer -= delta;
            const t = Math.min(1, Math.max(0, 1 - fb.timer / fb.duration));
            fb.fireMesh.position.y = fb.startY + (fb.groundY - fb.startY) * t;
            fb.fireMesh.rotation.y += delta * 6;

            const pulse = 0.35 + Math.abs(Math.sin(Date.now() * 0.012)) * 0.35;
            if (fb.warnMesh.children[0]) fb.warnMesh.children[0].material.opacity = pulse;

            if (fb.timer <= 0 && !fb.landed) {
                fb.landed = true;
                scene.remove(fb.fireMesh);
                scene.remove(fb.warnMesh);
                const dist = Math.abs(playerMesh.position.x - fb.targetX);
                if (dist < fb.warnRadius && Math.abs(playerMesh.position.y - fb.groundY) < 3) {
                    takeDamage();
                }
                if (window.AudioFX) AudioFX.playFreeze();
                fireballs.splice(i, 1);
            }
        }

        // Corazones
        hearts.forEach(h => {
            if (h.active) {
                h.mesh.rotation.y += 0.04;
                if (playerMesh.position.distanceTo(h.mesh.position) < 1.4) {
                    h.active = false;
                    scene.remove(h.mesh);
                    if (lives < currentChar.maxLives) { lives++; updateHUD(boss.active ? '💜'.repeat(boss.hp) : ''); }
                    gameProgress.score += 300;
                }
            }
        });

        // Proyectiles y Congelamiento
        bullets.forEach((b, idx) => {
            b.mesh.position.x += b.vx * delta;
            b.life--;

            // Disparo a Boss
            if (boss.active && b.mesh.position.distanceTo(boss.mesh.position) < 2.3) {
                if (window.AudioFX) AudioFX.playEnemyHit();
                if (b.type === 'ice') {
                    boss.isFrozen = true;
                    boss.freezeTimer = 3.0;
                } else {
                    boss.hp--;
                }
                b.life = 0;
                gameProgress.score += 150;
                if (boss.hp <= 0) {
                    boss.active = false;
                    scene.remove(boss.mesh);
                    fireballs.forEach(fb => { scene.remove(fb.fireMesh); scene.remove(fb.warnMesh); });
                    fireballs.length = 0;
                    gameProgress.score += 2000;
                    updateHUD('');
                }
            }

            // Disparo a Enemigos Terrestres
            enemies.forEach(e => {
                if (e.active && b.mesh.position.distanceTo(e.mesh.position) < 1.3) {
                    if (window.AudioFX) AudioFX.playEnemyHit();
                    if (b.type === 'ice') {
                        e.isFrozen = true;
                        e.freezeTimer = 3.5;
                    } else {
                        e.active = false;
                        scene.remove(e.mesh);
                        world.removeBody(e.body);
                    }
                    b.life = 0;
                    gameProgress.score += 200;
                }
            });

            // Disparo a Enemigos Voladores
            flyingEnemies.forEach(fe => {
                if (fe.active && b.mesh.position.distanceTo(fe.mesh.position) < 1.3) {
                    if (window.AudioFX) AudioFX.playEnemyHit();
                    if (b.type === 'ice') {
                        fe.isFrozen = true;
                        fe.freezeTimer = 3.5;
                    } else {
                        fe.active = false;
                        scene.remove(fe.mesh);
                    }
                    b.life = 0;
                    gameProgress.score += 250;
                }
            });

            if (b.life <= 0) { scene.remove(b.mesh); bullets.splice(idx, 1); }
        });

        // Caída
        if (playerBody.position.y < -10) takeDamage();

        // Meta Final
        if (playerMesh.position.distanceTo(goalMesh.position) < 2.2) {
            if (!boss.active) {
                isRunning = false;
                if (window.AudioFX) AudioFX.stopBackgroundMusic();
                gameProgress.score += 1500;
                if (gameProgress.currentLevel + 1 < LEVELS.length) {
                    gameProgress.unlockedLevels[gameProgress.currentLevel + 1] = true;
                }
                renderMenu();
            }
        }

        // Cámara Seguidora Suave
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, playerMesh.position.x + 3, 0.08);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, playerMesh.position.y + 3, 0.08);
        camera.position.z = 15;
        camera.lookAt(playerMesh.position.x + 2, playerMesh.position.y + 1, 0);

        // Fondo animado
        if (bgDecor) bgDecor.children.forEach(c => {
            c.rotation.y += delta * 0.15;
            if (c.userData && c.userData.isFloatDecor) {
                c.rotation.y += delta * 0.6;
                c.position.y = c.userData.baseY + Math.sin(Date.now() * 0.001 * c.userData.floatSpeed + c.userData.floatOffset) * c.userData.floatAmp;
            }
        });

        renderer.render(scene, camera);
    }
    animate();
}

renderMenu();