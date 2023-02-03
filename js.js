/*********
 * made by Matthias Hurrle (@atzedent)
 */

/** @type {HTMLCanvasElement} */
const canvas = window.canvas
const gl = canvas.getContext("webgl2")
const dpr = Math.max(.5, .25*window.devicePixelRatio)
/** @type {Map<string,PointerEvent>} */
const touches = new Map()

const vertexSource = `#version 300 es
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

in vec2 position;

void main(void) {
    gl_Position = vec4(position, 0., 1.);
}
`
const fragmentSource = `#version 300 es
/*********
* made by Matthias Hurrle (@atzedent)
*/

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float time;
uniform vec2 resolution;
uniform vec2 touch;
uniform int pointerCount;

out vec4 fragColor;

#define PI 3.14159
#define TAU 6.28318
#define THETA 1.57079
#define T (17.+time)
#define mouse (touch/resolution)
#define hue(a) (.25+.4*cos((a)*11.3+vec3(0,83,21)))
#define rot(a) mat2(cos(a),-sin(a),sin(a),cos(a))

void main(void) {
    float mn = min(resolution.x, resolution.y);
    vec2 uv = (
        gl_FragCoord.xy-.5*resolution
    ) / mn;

    vec3 col = vec3(0),
    lp=vec3(9,5,2),
    rp=vec3(9,6,7),
    ro=vec3(.7,.9,3),
    rd=normalize(vec3(uv, 1)),
    ax=normalize(vec3(8,-3,-5)),
    p;
    
    float g=.0, angle=sin(T*.1)*PI;
    
    if(pointerCount>0) {
        ax=normalize(vec3(1,-5,5));
        ax.xz*=rot(mouse.x*TAU);
        angle=mouse.y*PI;
    } else {
        ax.xz*=rot(T*.05);
    }
    
    for(float i=1.; i<40.; i++) {
        p=g*rd-ro;
        p=mix(
            dot(p,ax)*ax,
            p,
            cos(angle)
        )*THETA-cross(p,ax);
        float d=1., e=.0;

        for(float j=.0; j<16.; j++) {
            p=lp-abs(p-rp);
            e=9./clamp(dot(p,p), .0, 16.);
            d*=e*1.01;
            p=abs(p)*e;
        }

        e=p.y/d;
        e+=+3e-4;
        g+=e*.5;

        col+=mix(
            vec3(1),
            hue(-log(d)*.25),
            .75
        )/e*5e-5;
    }
    
    col = 1. - exp(-col * 1.8);
    col = pow(col, vec3(1.45));
    vec2 z = (gl_FragCoord.xy -.5 * resolution.xy) / mn;
    col *= 1.-dot(z, z);

    fragColor = vec4(col, 1);
}
`
let time
let buffer
let program
let touch
let resolution
let pointerCount
let vertices = []
let touching = false

function resize() {
    const { innerWidth: width, innerHeight: height } = window

    canvas.width = width * dpr
    canvas.height = height * dpr

    gl.viewport(0, 0, width * dpr, height * dpr)
}

function compile(shader, source) {
    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader))
    }
}

function setup() {
    const vs = gl.createShader(gl.VERTEX_SHADER)
    const fs = gl.createShader(gl.FRAGMENT_SHADER)

    program = gl.createProgram()

    compile(vs, vertexSource)
    compile(fs, fragmentSource)

    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program))
    }

    vertices = [-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]

    buffer = gl.createBuffer()

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)

    const position = gl.getAttribLocation(program, "position")

    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    time = gl.getUniformLocation(program, "time")
    touch = gl.getUniformLocation(program, "touch")
    pointerCount = gl.getUniformLocation(program, "pointerCount")
    resolution = gl.getUniformLocation(program, "resolution")
}

function draw(now) {
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)

    gl.uniform1f(time, now * 0.001)
    gl.uniform2f(touch, ...getTouches())
    gl.uniform1i(pointerCount, touches.size)
    gl.uniform2f(resolution, canvas.width, canvas.height)
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length * 0.5)
}

function getTouches() {
    if (!touches.size) {
        return [0, 0]
    }

    for (let [id, t] of touches) {
        const result = [dpr * t.clientX, dpr * (innerHeight - t.clientY)]

        return result
    }
}

function loop(now) {
    draw(now)
    requestAnimationFrame(loop)
}

function init() {
    setup()
    resize()
    loop(0)
}

document.body.onload = init
window.onresize = resize
canvas.onpointerdown = e => {
    touching = true
    touches.set(e.pointerId, e)
}
canvas.onpointermove = e => {
    if (!touching) return
    touches.set(e.pointerId, e)
}
canvas.onpointerup = e => {
    touching = false
    touches.clear()
}
canvas.onpointerout = e => {
    touching = false
    touches.clear()
}
