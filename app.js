(function () {
    'use strict';

    // ==========================================
    // 1. WEB AUDIO API SYNTHESIZER (ANIME SFX)
    // ==========================================
    var soundEngine = {
        ctx: null,
        enabled: true,
        init: function () {
            var saved = localStorage.getItem('anime_sfx');
            if (saved !== null) {
                this.enabled = saved === 'true';
            }
            this.updateButton();
            var self = this;
            var resumeAudio = function () {
                if (!self.ctx) {
                    try {
                        var AudioCtx = window.AudioContext || window.webkitAudioContext;
                        if (AudioCtx) self.ctx = new AudioCtx();
                    } catch (e) {
                        console.warn('AudioContext not supported');
                    }
                }
                if (self.ctx && self.ctx.state === 'suspended') {
                    self.ctx.resume();
                }
                document.removeEventListener('click', resumeAudio);
                document.removeEventListener('keydown', resumeAudio);
            };
            document.addEventListener('click', resumeAudio);
            document.addEventListener('keydown', resumeAudio);
        },
        toggle: function () {
            this.enabled = !this.enabled;
            localStorage.setItem('anime_sfx', this.enabled);
            this.updateButton();
            if (this.enabled) this.playClick();
        },
        updateButton: function () {
            var icon = document.getElementById('sfx-icon');
            var label = document.getElementById('sfx-label');
            if (icon && label) {
                icon.textContent = this.enabled ? '🔊' : '🔇';
                label.textContent = this.enabled ? 'SFX: ON' : 'SFX: OFF';
            }
        },
        playHover: function () {
            if (!this.enabled || !this.ctx) return;
            try {
                var osc = this.ctx.createOscillator();
                var gain = this.ctx.createGain();
                osc.type = 'sine';
                var now = this.ctx.currentTime;
                osc.frequency.setValueAtTime(880, now);
                osc.frequency.exponentialRampToValueAtTime(1320, now + 0.06);
                gain.gain.setValueAtTime(0.04, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.06);
            } catch (e) {}
        },
        playClick: function () {
            if (!this.enabled || !this.ctx) return;
            try {
                var osc = this.ctx.createOscillator();
                var gain = this.ctx.createGain();
                osc.type = 'triangle';
                var now = this.ctx.currentTime;
                osc.frequency.setValueAtTime(520, now);
                osc.frequency.exponentialRampToValueAtTime(1040, now + 0.08);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.08);
            } catch (e) {}
        },
        playSlash: function () {
            if (!this.enabled || !this.ctx) return;
            try {
                var bufferSize = this.ctx.sampleRate * 0.12;
                var buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                var data = buffer.getChannelData(0);
                for (var i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                var noise = this.ctx.createBufferSource();
                noise.buffer = buffer;
                var filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                var now = this.ctx.currentTime;
                filter.frequency.setValueAtTime(2400, now);
                filter.frequency.exponentialRampToValueAtTime(300, now + 0.12);
                filter.Q.value = 3;

                var gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                noise.start(now);
                noise.stop(now + 0.12);
            } catch (e) {}
        },
        playFanfare: function () {
            if (!this.enabled || !this.ctx) return;
            var self = this;
            var notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
            notes.forEach(function (freq, idx) {
                setTimeout(function () {
                    try {
                        var osc = self.ctx.createOscillator();
                        var gain = self.ctx.createGain();
                        osc.type = 'triangle';
                        var now = self.ctx.currentTime;
                        osc.frequency.setValueAtTime(freq, now);
                        gain.gain.setValueAtTime(0.08, now);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                        osc.connect(gain);
                        gain.connect(self.ctx.destination);
                        osc.start(now);
                        osc.stop(now + 0.25);
                    } catch (e) {}
                }, idx * 90);
            });
        }
    };

    // ==========================================
    // 2. MANGA ONOMATOPOEIA POPUPS (ドドド / シュッ)
    // ==========================================
    var mangaSfxWords = ['ドドド', 'シュッ！', 'ピカー！', 'ズバッ！', 'ゴゴゴ', 'バァン！', 'キラーン'];
    function spawnMangaSfx(x, y) {
        var word = mangaSfxWords[Math.floor(Math.random() * mangaSfxWords.length)];
        var el = document.createElement('div');
        el.className = 'manga-sfx-popup';
        el.textContent = word;
        var rot = (Math.random() * 30 - 15) + 'deg';
        el.style.setProperty('--rot', rot);
        el.style.left = (x || (window.innerWidth / 2)) + 'px';
        el.style.top = (y || (window.innerHeight / 2)) + 'px';
        document.body.appendChild(el);
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 850);
    }

    // ==========================================
    // 3. THREE.JS 3D SAKURA & FIREFLIES ENGINE
    // ==========================================
    var animeWorld = {
        scene: null,
        camera: null,
        renderer: null,
        petals: [],
        fireflies: null,
        targetMouseX: 0,
        targetMouseY: 0,
        mouseX: 0,
        mouseY: 0,
        clock: new THREE.Clock(),
        init: function () {
            var canvas = document.getElementById('anime-canvas');
            if (!canvas) return;

            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
            this.camera.position.z = 15;

            this.renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            this.createSakuraPetals();
            this.createFireflies();

            var self = this;
            window.addEventListener('resize', function () { self.onResize(); });
            document.addEventListener('mousemove', function (e) {
                self.targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
                self.targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
            });

            this.animate();
        },
        createSakuraPetals: function () {
            var petalGeo = new THREE.BufferGeometry();
            var pts = [
                0, 0.22, 0,
                0.12, 0.12, 0.03,
                0.15, -0.06, 0.04,
                0, -0.22, 0.01,
                -0.15, -0.06, 0.04,
                -0.12, 0.12, 0.03
            ];
            var indices = [
                0, 1, 3,
                1, 2, 3,
                0, 3, 5,
                5, 3, 4
            ];
            petalGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
            petalGeo.setIndex(indices);
            petalGeo.computeVertexNormals();

            var colors = [0xff77a9, 0xffa8c8, 0xff4d94, 0xffffff, 0xff2a85];
            var petalCount = 80;

            for (var i = 0; i < petalCount; i++) {
                var c = colors[Math.floor(Math.random() * colors.length)];
                var mat = new THREE.MeshBasicMaterial({
                    color: c,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.55
                });
                var mesh = new THREE.Mesh(petalGeo, mat);
                mesh.position.x = (Math.random() - 0.5) * 36;
                mesh.position.y = (Math.random() - 0.5) * 26;
                mesh.position.z = -14 + Math.random() * 12;

                var scale = 0.2 + Math.random() * 0.22;
                mesh.scale.set(scale, scale, scale);

                mesh.userData = {
                    speedY: 0.02 + Math.random() * 0.035,
                    speedX: (Math.random() - 0.5) * 0.015,
                    rotSpeedX: (Math.random() - 0.5) * 0.04,
                    rotSpeedY: (Math.random() - 0.5) * 0.04,
                    rotSpeedZ: (Math.random() - 0.5) * 0.03,
                    swayOffset: Math.random() * Math.PI * 2
                };
                this.scene.add(mesh);
                this.petals.push(mesh);
            }
        },
        createFireflies: function () {
            var count = 220;
            var geo = new THREE.BufferGeometry();
            var pos = new Float32Array(count * 3);
            var cols = new Float32Array(count * 3);

            var cPink = new THREE.Color('#ff2a85');
            var cCyan = new THREE.Color('#00f5d4');

            for (var i = 0; i < count; i++) {
                var i3 = i * 3;
                pos[i3] = (Math.random() - 0.5) * 36;
                pos[i3 + 1] = (Math.random() - 0.5) * 28;
                pos[i3 + 2] = (Math.random() - 0.5) * 24;

                var c = Math.random() > 0.4 ? cCyan : cPink;
                cols[i3] = c.r;
                cols[i3 + 1] = c.g;
                cols[i3 + 2] = c.b;
            }
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));

            var mat = new THREE.PointsMaterial({
                size: 0.09,
                vertexColors: true,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            });
            this.fireflies = new THREE.Points(geo, mat);
            this.scene.add(this.fireflies);
        },
        onResize: function () {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        },
        animate: function () {
            var self = this;
            requestAnimationFrame(function () { self.animate(); });

            var t = this.clock.getElapsedTime();
            this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
            this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

            var windX = Math.sin(t * 0.6) * 0.015 + this.mouseX * 0.03;

            for (var i = 0; i < this.petals.length; i++) {
                var p = this.petals[i];
                p.position.y -= p.userData.speedY;
                p.position.x += p.userData.speedX + windX + Math.sin(t + p.userData.swayOffset) * 0.008;

                p.rotation.x += p.userData.rotSpeedX;
                p.rotation.y += p.userData.rotSpeedY;
                p.rotation.z += p.userData.rotSpeedZ;

                if (p.position.y < -14) {
                    p.position.y = 14;
                    p.position.x = (Math.random() - 0.5) * 32;
                }
                if (p.position.x > 18) p.position.x = -18;
                if (p.position.x < -18) p.position.x = 18;
            }

            if (this.fireflies) {
                this.fireflies.rotation.y = t * 0.02 + this.mouseX * 0.15;
                this.fireflies.rotation.x = t * 0.01 + this.mouseY * 0.1;
            }

            this.renderer.render(this.scene, this.camera);
        }
    };

    // ==========================================
    // 4. ANIME CUSTOM CURSOR
    // ==========================================
    var animeCursor = {
        cursor: document.getElementById('cursor'),
        dot: document.getElementById('cursor-dot'),
        init: function () {
            if (!this.cursor || !this.dot || window.innerWidth <= 768) return;
            var self = this;
            document.addEventListener('mousemove', function (e) {
                gsap.to(self.dot, { x: e.clientX, y: e.clientY, duration: 0.06, ease: 'none' });
                gsap.to(self.cursor, { x: e.clientX, y: e.clientY, duration: 0.18, ease: 'power2.out' });
            });

            var hoverTargets = document.querySelectorAll('a, button, .jutsu-card, .quest-card, .arsenal-item, .channel-link');
            hoverTargets.forEach(function (el) {
                el.addEventListener('mouseenter', function () {
                    self.cursor.classList.add('hover');
                    var soundType = el.getAttribute('data-sound');
                    if (soundType === 'hover' || !soundType) soundEngine.playHover();
                });
                el.addEventListener('mouseleave', function () {
                    self.cursor.classList.remove('hover');
                });
                el.addEventListener('click', function (e) {
                    var soundType = el.getAttribute('data-sound');
                    if (soundType === 'slash') {
                        soundEngine.playSlash();
                        spawnMangaSfx(e.clientX, e.clientY);
                    } else if (soundType === 'click') {
                        soundEngine.playClick();
                    }
                });
            });
        }
    };

    // ==========================================
    // 5. PRELOADER & HERO TIMELINES
    // ==========================================
    var animeLoader = {
        init: function () {
            var preloader = document.getElementById('preloader');
            if (preloader) preloader.style.display = 'none';
            heroSequence();
        }
    };

        function heroSequence() {
        if (typeof gsap === 'undefined') return;
        var tl = gsap.timeline();
        tl.fromTo('.hero-badge', { opacity: 0, y: -15 }, { opacity: 1, y: 0, duration: 0.4, clearProps: 'opacity,transform', ease: 'power2.out' })
          .fromTo('.hero-main-title', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, clearProps: 'opacity,transform', ease: 'power3.out' }, '-=0.2')
          .fromTo('.hero-description', { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.4, clearProps: 'opacity,transform', ease: 'power2.out' }, '-=0.2')
          .fromTo('.hero-stats-hud', { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.4, clearProps: 'opacity,transform', ease: 'power2.out' }, '-=0.2')
          .fromTo('.hero-actions .btn-anime', { opacity: 0, y: 15 }, { opacity: 1, y: 0, stagger: 0.08, duration: 0.4, clearProps: 'opacity,transform', ease: 'power2.out' }, '-=0.2')
          .fromTo('.hero-visual', { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.5, clearProps: 'opacity,transform', ease: 'power2.out' }, '-=0.3');
    }

    // ==========================================
    // 6. SCROLL REVEALS & ANIME TIMELINES
    // ==========================================
    function initScrollTriggers() {
        gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

        // Character panel
        gsap.from('.character-card-panel', {
            scrollTrigger: { trigger: '#about', start: 'top 75%' },
            opacity: 0,
            x: -40,
            duration: 0.8,
            ease: 'power3.out',
            clearProps: 'opacity,transform'
        });

        // Speech bubble & arsenal
        gsap.from('.character-story-panel', {
            scrollTrigger: { trigger: '#about', start: 'top 75%' },
            opacity: 0,
            x: 40,
            duration: 0.8,
            ease: 'power3.out',
            clearProps: 'opacity,transform'
        });

        // Jutsu Cards stagger
        gsap.from('.jutsu-card', {
            scrollTrigger: { trigger: '#skills', start: 'top 75%' },
            opacity: 0,
            y: 50,
            stagger: 0.12,
            duration: 0.7,
            ease: 'back.out(1.4)',
            clearProps: 'opacity,transform'
        });

        // Quest Cards stagger
        gsap.from('.quest-card', {
            scrollTrigger: { trigger: '#projects', start: 'top 75%' },
            opacity: 0,
            y: 60,
            stagger: 0.15,
            duration: 0.8,
            ease: 'power3.out',
            clearProps: 'opacity,transform'
        });

        // Terminal Form
        gsap.from('.terminal-dossier', {
            scrollTrigger: { trigger: '#contact', start: 'top 75%' },
            opacity: 0,
            x: -30,
            duration: 0.8,
            ease: 'power3.out',
            clearProps: 'opacity,transform'
        });
        gsap.from('.terminal-form-card', {
            scrollTrigger: { trigger: '#contact', start: 'top 75%' },
            opacity: 0,
            x: 30,
            duration: 0.8,
            ease: 'power3.out',
            clearProps: 'opacity,transform'
        });

        // Anchor links smooth scroll
        document.querySelectorAll('a[href^="#"]').forEach(function (a) {
            a.addEventListener('click', function (e) {
                var targetId = a.getAttribute('href');
                if (!targetId || targetId === '#') return;
                var targetEl = document.querySelector(targetId);
                if (targetEl) {
                    e.preventDefault();
                    gsap.to(window, {
                        scrollTo: { y: targetEl, offsetY: 76 },
                        duration: 1,
                        ease: 'power3.inOut'
                    });
                }
            });
        });
    }

    // ==========================================
    // 7. HUD CONTROLS & MOBILE DRAWER
    // ==========================================
    function initHudControls() {
        // SFX Button
        var sfxBtn = document.getElementById('sfx-toggle');
        if (sfxBtn) {
            sfxBtn.addEventListener('click', function () {
                soundEngine.toggle();
            });
        }

        // CRT Scanline Button
        var crtBtn = document.getElementById('crt-toggle');
        var crtLabel = document.getElementById('crt-label');
        if (crtBtn && crtLabel) {
            var crtSaved = localStorage.getItem('anime_crt') === 'true';
            if (crtSaved) {
                document.body.classList.add('crt-active');
                crtLabel.textContent = 'CRT: ON';
            }
            crtBtn.addEventListener('click', function () {
                var active = document.body.classList.toggle('crt-active');
                localStorage.setItem('anime_crt', active);
                crtLabel.textContent = active ? 'CRT: ON' : 'CRT: OFF';
                soundEngine.playClick();
            });
        }

        // Mobile Drawer
        var burger = document.getElementById('nav-burger');
        var drawer = document.getElementById('mobile-drawer');
        var closeBtn = document.getElementById('drawer-close');
        var drawerLinks = document.querySelectorAll('.drawer-link');

        if (burger && drawer) {
            burger.addEventListener('click', function () {
                drawer.classList.add('open');
                soundEngine.playClick();
            });
        }
        if (closeBtn && drawer) {
            closeBtn.addEventListener('click', function () {
                drawer.classList.remove('open');
                soundEngine.playClick();
            });
        }
        drawerLinks.forEach(function (link) {
            link.addEventListener('click', function () {
                if (drawer) drawer.classList.remove('open');
            });
        });
    }

    // ==========================================
    // 8. CONTACT FORM TERMINAL TRANSMISSION
    // ==========================================
    function initTransmissionForm() {
        var form = document.getElementById('anime-form');
        var btn = document.getElementById('btn-transmit');
        var btnText = document.getElementById('transmit-btn-text');
        var status = document.getElementById('form-status');

        if (!form || !btn || !btnText) return;

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            btnText.textContent = 'TRANSMITTING ENCRYPTED SIGNAL...';
            btn.style.opacity = '0.7';

            setTimeout(function () {
                soundEngine.playFanfare();
                spawnMangaSfx(window.innerWidth / 2, window.innerHeight / 2);
                btnText.textContent = 'SIGNAL CONFIRMED // 送信完了!';
                btn.style.opacity = '1';
                btn.style.background = 'var(--neon-cyan)';
                btn.style.boxShadow = '0 0 30px var(--neon-cyan-glow)';
                if (status) {
                    status.innerHTML = '<span class="status-success">[ TRANSMISSION CONFIRMED: PILOT WILL RESPOND SHORTLY ]</span>';
                }

                setTimeout(function () {
                    btnText.textContent = 'TRANSMIT PAYLOAD &rarr;';
                    btn.style.background = '';
                    btn.style.boxShadow = '';
                    form.reset();
                    if (status) status.innerHTML = '';
                }, 4000);
            }, 800);
        });
    }

    // DOM Ready Initialization
    document.addEventListener('DOMContentLoaded', function () {
        soundEngine.init();
        animeLoader.init();
        animeWorld.init();
        animeCursor.init();
        initHudControls();
        initScrollTriggers();
        initTransmissionForm();
    });
})();
