const count = 10000;
const addDelay = 5000;
let w, h;
let canvas;
let gl;
let prevTime;
let dt = 0;
let ps;
let addCounter = addDelay - 1000;
class Particle {
constructor(x, y, vx, vy, color) {
this.life = addDelay - 500;
this.lifeCounter = 0;
this.x = x;
this.y = y;
this.vx = this.vx0 = vx;
this.vy = this.vy0 = vy;
this.color = color;
this.size = Math.hypot(this.vx, this.vy) * 0.02;
this.seed = rand(0, 1);
}
update() {
this.lifeCounter += dt * 1000;
this.vx -= this.vx0 * dt * this.seed;
this.vy -= this.vy0 * dt * this.seed;
this.x += this.vx * dt;
this.y += this.vy * dt;
this.color[3] = 1 - this.lifeCounter / this.life;
}
isAlive() {
return this.lifeCounter < this.life;
}
}
class ParticleSystem {
constructor() {
this.particles = [];
}
addFirework() {
const color = Color.fromHsla(rand(0, 1), 1, 0.5);
for (let i = 0; i < count; ++i) {
const x = 0;
const y = 0;
const a = rand(0, Math.PI * 2);
const s = rand(0, 1.5) * w;
const vx = Math.cos(a) * s;
const vy = Math.sin(a) * s;
this.particles.push(new Particle(x, y, vx, vy, color));
}
}
update() {
for (let p of this.particles) {
p.update();
}

        this.particles = this.particles.filter(p => p.isAlive());
    }

    draw() {
        const count = this.particles.length;

        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const colors = new Float32Array(count * 4);

        for (let i = 0; i < count; ++i) {
            const p = this.particles[i];

            positions[i * 3] = p.x / w * 2;
            positions[i * 3 + 1] = -p.y / h * 2;
            positions[i * 3 + 2] = 0;
            sizes[i] = p.size;
            for (let j = 0; j < 4; ++j) {
                colors[i * 4 + j] = p.color[j];
            }
        }

        const posBuffer = BufferUtils.createAndFillBuffer(gl, positions);
        const sizeBuffer = BufferUtils.createAndFillBuffer(gl, sizes);
        const colorBuffer = BufferUtils.createAndFillBuffer(gl, colors);

        const shader = DefShaders.getFireworkShader();

        shader.activateShader();
        shader.bindPosBuffer(posBuffer);
        shader.bindSizeBuffer(sizeBuffer);
        shader.bindColorBuffer(colorBuffer);

        gl.drawArrays(gl.POINTS, 0, count);
    }

}

function rand(min, max) {
    return Math.random() * (max - min) + min;
}

function main() {
    canvas = document.querySelector("canvas");
    gl = canvas.getContext("webgl");

    DefShaders.init();

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    gl.clearColor(0.02, 0.03, 0.07, 1);

    ps = new ParticleSystem();

    resize();
    onresize = resize;
    prevTime = performance.now();
    requestAnimationFrame(loop);
}

function resize() {
    w = canvas.width = innerWidth;
    h = canvas.height = innerHeight;
    gl.viewport(0, 0, w, h);
}

function loop() {
    let curTime = performance.now();
    dt = (curTime - prevTime) * 1e-3;
    prevTime = curTime;

    addCounter += dt * 1000;
    if (addCounter >= addDelay) {
        addCounter -= addDelay;
        ps.addFirework();
    }

    ps.update();

    gl.clear(gl.COLOR_BUFFER_BIT);


    ps.draw();

    requestAnimationFrame(loop);
}

const DefShaders = (function () {

    let fireworkShader = null;

    function init() {
        fireworkShader = new FireworkShader(gl, FireworkShader.VSRC, FireworkShader.FSRC);
    }

    function getFireworkShader() {
        return fireworkShader;
    }

    return {
        init,
        getFireworkShader
    };

})();

class BufferUtils {

    static createAndFillBuffer(gl, data, isStatic = true) {

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, isStatic ? gl.STATIC_DRAW : gl.DYNAMIC_DRAW);

        return buffer;
    }

    static refillBuffer(gl, data, buffer) {

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
    }
}

class Shader {

    constructor(gl, vsrc, fsrc) {
        this._gl = gl;

        const vshader = this._compileShader(vsrc, this._gl.VERTEX_SHADER);
        const fshader = this._compileShader(fsrc, this._gl.FRAGMENT_SHADER);

        this._program = this._gl.createProgram();
        this._gl.attachShader(this._program, vshader);
        this._gl.attachShader(this._program, fshader);
        this._gl.linkProgram(this._program);

        if (!this._gl.getProgramParameter(this._program, this._gl.LINK_STATUS)) {
            console.log(this._gl.getProgramInfoLog(this._program));
            throw new Error("Program unable to link");
        }
    }

    activateShader() {
        this._gl.useProgram(this._program);
    }

    _compileShader(src, type) {
        const shader = this._gl.createShader(type);

        this._gl.shaderSource(shader, src);
        this._gl.compileShader(shader);

        if (!this._gl.getShaderParameter(shader, this._gl.COMPILE_STATUS)) {
            console.log(this._gl.getShaderInfoLog(shader));
            const shaderTypeName = type === this._gl.VERTEX_SHADER ? "Vertex" : "Fragment";
            throw new Error(this.constructor.name + ": " + shaderTypeName + " unable to compile");
        }

        return shader;
    }
}

class FireworkShader extends Shader {

    constructor(gl, vsrc, fsrc) {
        super(gl, vsrc, fsrc);

        this._aPosLoc = this._gl.getAttribLocation(this._program, "a_pos");
        this._aSizeLoc = this._gl.getAttribLocation(this._program, "a_size");
        this._aColorLoc = this._gl.getAttribLocation(this._program, "a_color");
    }

    bindPosBuffer(buffer) {
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, buffer);
        this._gl.enableVertexAttribArray(this._aPosLoc);
        this._gl.vertexAttribPointer(this._aPosLoc, 3, this._gl.FLOAT, false, 0, 0);
    }

    bindSizeBuffer(buffer) {
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, buffer);
        this._gl.enableVertexAttribArray(this._aSizeLoc);
        this._gl.vertexAttribPointer(this._aSizeLoc, 1, this._gl.FLOAT, false, 0, 0);
    }

    bindColorBuffer(buffer) {
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, buffer);
        this._gl.enableVertexAttribArray(this._aColorLoc);
        this._gl.vertexAttribPointer(this._aColorLoc, 4, this._gl.FLOAT, false, 0, 0);
    }

    supplyUniforms() {
        
    }

    static VSRC = `
    attribute vec3 a_pos;
    attribute vec4 a_color;
    attribute float a_size;

    varying vec4 v_color;

    void main(void) {
        v_color = a_color;
        gl_Position = vec4(a_pos, 1.0);
        gl_PointSize = a_size * gl_Position.w;
    }
    `;

    static FSRC = `
    precision mediump float;

    varying vec4 v_color;

    void main(void) {
        gl_FragColor = vec4(v_color.rgb * v_color.a, v_color.a);
    }
    `;

}

class Color {

    static fromRgba(r, g, b, a = 1) {
        return [r / 255, g / 255, b / 255, a];
    }

    static fromHsla(h, s, l, a = 1) {
        let r, g, b;

        if (s == 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            }

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return [r, g, b, a];
    }

    static add(c1, c2) {
        return c1.map((comp, i) => comp + c2[i]);
    }

    static sub(c1, c2) {
        return c1.map((comp, i) => comp - c2[i]);
    }

    static mult(c, s) {
        return c.map(comp => comp * s);
    }

    static lerp(val, c1, c2) {
        return Color.add(c1, Color.mult(Color.sub(c2, c1), val));
    }

    static get White() {
        return this.fromRgba(255, 255, 255);
    }

    static get Black() {
        return this.fromRgba(0, 0, 0);
    }

    static get Red() {
        return this.fromRgba(255, 0, 0);
    }

    static get Green() {
        return this.fromRgba(0, 128, 0);
    }

    static get Blue() {
        return this.fromRgba(0, 0, 255);
    }

    static get Lime() {
        return this.fromRgba(0, 255, 0);
    }

    static get Yellow() {
        return this.fromRgba(255, 255, 0);
    }

    static get Aqua() {
        return this.fromRgba(0, 255, 255);
    }

    static get Magneta() {
        return this.fromRgba(255, 0, 255);
    }

    static get Silver() {
        return this.fromRgba(192, 192, 192);
    }

    static get Gray() {
        return this.fromRgba(128, 128, 128);
    }

    static get Purple() {
        return this.fromRgba(128, 0, 128);
    }

    static get Teal() {
        return this.fromRgba(0, 128, 128);
    }

    static get Navy() {
        return this.fromRgba(0, 0, 128);
    }

    static get Maroon() {
        return this.fromRgba(128, 0, 0);
    }

    static get Olive() {
        return this.fromRgba(128, 128, 0);
    }
}

onload = main;