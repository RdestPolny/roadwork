/* Collodion: a WebGL pass that shows the finished frame as an 1860s wet-plate print lit by tallow.
Split toning (soot shadows, tallow highlights, lamp-black instead of pure black), halation around the brightest pixels,
grain and uneven emulsion per picture pixel (the pixel art stays sharp), an oval lens vignette with silvered corners.
Off by default; the Options checkbox turns it on. Without WebGL2 the renderer keeps its plain 2D blit. */
import { state as progressionState } from './progression.js';
import { state as boxingState } from './boxing.js';
import { cellLights } from './cell-light.js';

// Runtime values owned by collodion; initialized explicitly by main.js.
export const state = {};

const KEY = 'roadwork.collodion';

const VS = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv=aPos*0.5+0.5; gl_Position=vec4(aPos,0.,1.); }`;

// Pass 1: the bright parts of the picture, kept for the halation glow (mipmapped, sampled blurred in pass 2).
const BRIGHT = `#version 300 es
precision mediump float;
uniform sampler2D uTex; in vec2 vUv; out vec4 o;
void main(){
  vec3 c=texture(uTex,vUv).rgb; float l=dot(c,vec3(.299,.587,.114));
  float w=smoothstep(.45,.9,l); o=vec4(c*w*w,1.);
}`;

const GRADE = `#version 300 es
precision highp float;
uniform sampler2D uTex, uGlow;
uniform vec2 uRes;      // picture size in picture pixels
uniform vec4 uRect;     // shown part of the picture: x, y, w, h in picture pixels
uniform float uFrame;   // grain frame (12 per second)
uniform float uTime;    // seconds, for the slow emulsion drift
uniform float uLamp;    // 0 daylight .. 1 tallow only
in vec2 vUv; out vec4 o;
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
void main(){
  vec2 q=vec2(vUv.x,1.-vUv.y);                       // 0,0 at the top left, like the frame buffer
  vec2 pp=uRect.xy+q*uRect.zw, px=floor(pp), uv=(px+.5)/uRes;
  vec3 c=texture(uTex,uv).rgb;
  float l=dot(c,vec3(.299,.587,.114)), ink=smoothstep(0.,.035,l); // ink 0: the empty black around a room stays black
  c=mix(vec3(l),c,.8);                               // albumen paper: quieter colour
  vec3 soot=vec3(.86,.97,1.04), tallow=mix(vec3(1.06,.99,.86),vec3(1.12,.95,.74),uLamp);
  c*=mix(soot,tallow,smoothstep(.08,.75,l));          // cold soot in the shadows, tallow in the lights
  c=mix(c,c*c*(3.-2.*c),.2)*1.1;                      // gentle S curve, a touch more exposure
  vec2 gq=pp/uRes;
  vec3 g=textureLod(uGlow,gq,1.5).rgb*.8+textureLod(uGlow,gq,2.8).rgb*.8+textureLod(uGlow,gq,4.).rgb*.7;
  float gl=dot(g,vec3(.299,.587,.114));
  c=1.-(1.-c)*(1.-gl*vec3(1.,.52,.26)*1.25);          // halation: a red-orange bleed around the flame and the window
  float mot=vnoise(px/22.+vec2(uTime*.05,0.))-.5;     // unevenly poured emulsion
  c*=1.+mot*.07;
  float grain=hash(px+uFrame*vec2(17.13,31.71))-.5;
  c+=grain*.075*(.25+3.*l*(1.-l))*ink;                    // grain, strongest in the half tones
  vec2 d=(q-vec2(.5,.47))*vec2(1.,1.25); float r=length(d);
  float vig=smoothstep(.95,.4,r);
  c=mix(c,c*vec3(.86,.92,1.02)+vec3(.02,.025,.03)*ink,smoothstep(.5,.8,r)*.5); // silvering creeping in from the plate corners
  vec3 black=vec3(.05,.038,.03);
  c=black*ink+clamp(c,0.,1.)*(1.-black*ink);                  // lamp-black, never pure black
  vec2 e=min(q,1.-q)*uRect.zw;                        // distance to the picture edge, in picture pixels
  c*=mix(.62,1.,vig)*smoothstep(0.,8.,min(e.x,e.y)); // Petzval lens: an oval vignette, the plate edge sinking into the page black
  o=vec4(c,1.);
}`;

/** @param {WebGL2RenderingContext} gl @param {string} vs @param {string} fs */
function program(gl,vs,fs){
  const p=gl.createProgram();
  for(const [type,src] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){
    const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)||'shader');
    gl.attachShader(p,s);
  }
  gl.bindAttribLocation(p,0,'aPos'); gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)||'link');
  return p;
}

/** Build the GL canvas and programs once; false when WebGL2 is not available. */
function setup(){
  if(state.gl!==undefined) return !!state.gl;
  state.gl=null;
  try{
    const cv=document.createElement('canvas'), gl=cv.getContext('webgl2',{alpha:false,antialias:false,premultipliedAlpha:false});
    if(!gl) return false;
    const tex=()=>{ const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); return t; };
    const src=tex(); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    const glow=tex(); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    const buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buf); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    const bright=program(gl,VS,BRIGHT), grade=program(gl,VS,GRADE), u=n=>gl.getUniformLocation(grade,n);
    gl.useProgram(grade); gl.uniform1i(u('uTex'),0); gl.uniform1i(u('uGlow'),1);
    state.gl=gl; state.cv=cv; state.src=src; state.glow=glow; state.fbo=gl.createFramebuffer(); state.bright=bright; state.grade=grade;
    state.u={res:u('uRes'),rect:u('uRect'),frame:u('uFrame'),time:u('uTime'),lamp:u('uLamp')}; state.size='';
    cv.addEventListener('webglcontextlost',()=>{ state.gl=null; });
  }catch(e){ console.warn('collodion: WebGL2 unavailable',e); state.gl=null; }
  return !!state.gl;
}

/** Is the collodion look on? */
export function collodionOn(){ return state.on; }

/** Turn the collodion look on or off (remembered in this browser). @param {boolean} on */
export function setCollodion(on){
  state.on=!!on;
  try{ localStorage.setItem(KEY,state.on?'1':'0'); }catch{}
  if(state.el) state.el.checked=state.on;
}

/** Grade the picture for the screen. Returns the canvas to draw (outW×outH, the rect of the picture already cut out),
 * or null when the look is off or WebGL2 is missing — the caller then blits the plain picture.
 * @param {ImageData} img the finished frame @param {number[]} rect x, y, w, h of the shown part in picture pixels
 * @param {number} outW @param {number} outH size on the screen in device pixels @returns {HTMLCanvasElement|null} */
export function collodionFrame(img,rect,outW,outH){
  if(!state.on||!setup()) return null;
  const gl=state.gl, W=img.width, H=img.height, data=new Uint8Array(img.data.buffer,img.data.byteOffset,W*H*4);
  if(state.cv.width!==outW||state.cv.height!==outH){ state.cv.width=outW; state.cv.height=outH; }
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,state.src);
  if(state.size!==W+'x'+H){
    state.size=W+'x'+H; gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,W,H,0,gl.RGBA,gl.UNSIGNED_BYTE,data);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,state.glow); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,W,H,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.bindFramebuffer(gl.FRAMEBUFFER,state.fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,state.glow,0);
    gl.activeTexture(gl.TEXTURE0);
  }else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,data);
  // pass 1: bright parts into the glow texture, then its mipmaps for the blur
  gl.bindFramebuffer(gl.FRAMEBUFFER,state.fbo); gl.viewport(0,0,W,H); gl.useProgram(state.bright); gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,state.glow); gl.generateMipmap(gl.TEXTURE_2D);
  // pass 2: the graded print on the screen-sized canvas
  gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.viewport(0,0,outW,outH); gl.useProgram(state.grade);
  const t=boxingState.tick/60, L=cellLights(progressionState.save?.sim?.min??600);
  gl.uniform2f(state.u.res,W,H); gl.uniform4f(state.u.rect,rect[0],rect[1],rect[2],rect[3]);
  gl.uniform1f(state.u.frame,Math.floor(t*12)%997); gl.uniform1f(state.u.time,t); gl.uniform1f(state.u.lamp,1-L.day);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  gl.activeTexture(gl.TEXTURE0);
  return state.cv;
}

/** Read the remembered choice and bind the Options checkbox. */
export function initialize(){
  try{ state.on=localStorage.getItem(KEY)==='1'; }catch{ state.on=false; }
  state.el=/** @type {HTMLInputElement|null} */ (document.getElementById('collodion'));
  if(state.el){ state.el.checked=state.on; state.el.onchange=()=>setCollodion(state.el.checked); }
}
