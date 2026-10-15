// Measurement-only. Installed only for non-timed content proof, then restored.
// Function is stringified into the instrumented renderer; keep it self-contained.
export function installContentAudit(renderer) {
  const ids = new WeakMap();
  let nextId = 0, events = null, textures = null;
  const id = (o) => { if (!o) return null; if (!ids.has(o)) ids.set(o, ++nextId); return ids.get(o); };
  const number = (x) => Number.isFinite(x) ? x : String(x);
  const values = (a) => Array.from(a, number);
  const texture = (t) => {
    const key = id(t);
    if (textures[key]) return { texture: key };
    const image = t.image;
    let source;
    if (t.isRenderTargetTexture) source = { target: true, width: image?.width, height: image?.height, depth: image?.depth };
    else if (image?.data) source = { width: image.width, height: image.height, data: values(image.data) };
    else if (image?.toDataURL) source = { width: image.width, height: image.height, png: image.toDataURL('image/png') };
    else if (image?.currentSrc || image?.src) source = { width: image.naturalWidth ?? image.width, height: image.naturalHeight ?? image.height, url: image.currentSrc || image.src };
    else throw Error('Unaccounted texture source in complete content audit');
    textures[key] = { source, mapping: t.mapping, wrapS: t.wrapS, wrapT: t.wrapT, magFilter: t.magFilter, minFilter: t.minFilter, format: t.format, type: t.type, colorSpace: t.colorSpace, flipY: t.flipY, generateMipmaps: t.generateMipmaps, premultiplyAlpha: t.premultiplyAlpha, unpackAlignment: t.unpackAlignment, matrix: values(t.matrix.elements) };
    return { texture: key };
  };
  const value = (v) => {
    if (v === null || v === undefined || typeof v === 'boolean' || typeof v === 'string') return v ?? null;
    if (typeof v === 'number') return number(v);
    if (v.isTexture) return texture(v);
    if (ArrayBuffer.isView(v) || Array.isArray(v)) return Array.from(v, value);
    if (v.elements) return values(v.elements);
    if (typeof v.toArray === 'function') return v.toArray().map(value);
    if (Object.getPrototypeOf(v) === Object.prototype) return Object.fromEntries(Object.keys(v).sort().map(k => [k, value(v[k])]));
    throw Error('Unaccounted visual uniform value in complete content audit');
  };
  const target = () => {
    const t = renderer.getRenderTarget();
    return t ? { id: id(t), width: t.width, height: t.height, textures: (t.textures ?? [t.texture]).map(x => id(x)), depthBuffer: t.depthBuffer, stencilBuffer: t.stencilBuffer, samples: t.samples } : null;
  };
  const vector = (method) => {
    const v = { x: 0, y: 0, z: 0, w: 0, copy(o) { Object.assign(this, o); return this; } };
    renderer[method](v); return [v.x, v.y, v.z, v.w];
  };
  const state = () => {
    const c = { r: 0, g: 0, b: 0, copy(o) { Object.assign(this, o); return this; } };
    renderer.getClearColor(c);
    return { target: target(), viewport: vector('getCurrentViewport'), scissor: vector('getScissor'), scissorTest: renderer.getScissorTest(), clear: [c.r, c.g, c.b, renderer.getClearAlpha()], autoClear: [renderer.autoClear, renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil], outputColorSpace: renderer.outputColorSpace, toneMapping: renderer.toneMapping, toneMappingExposure: renderer.toneMappingExposure };
  };
  const attribute = (a, n) => {
    if (a.isInterleavedBufferAttribute) throw Error('Interleaved attribute requires an explicit audited adapter');
    const count = a.isInstancedBufferAttribute ? Math.min(a.count, Math.ceil(n / a.meshPerAttribute)) : a.count;
    return { itemSize: a.itemSize, normalized: a.normalized, gpuType: a.gpuType ?? null, meshPerAttribute: a.meshPerAttribute ?? null, count, type: a.array.constructor.name, values: values(a.array.subarray(0, count * a.itemSize)) };
  };
  const requireEmptyCallback = (fn, label) => {
    if (fn == null) return;
    const source = Function.prototype.toString.call(fn).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/\s/g, '');
    if (!/^(?:function)?[A-Za-z0-9_$]*\([^)]*\)\{\}$/.test(source)) throw Error(`Unsupported nonempty callback:${label}`);
  };
  const draw = (object, geometry, material, camera, group) => {
    requireEmptyCallback(material.onBeforeRender, 'material.onBeforeRender');
    requireEmptyCallback(material.onBeforeCompile, 'material.onBeforeCompile');
    if (geometry.morphAttributes && Object.keys(geometry.morphAttributes).length) throw Error('Morph attributes require an explicit audited adapter');
    const n = geometry.isInstancedBufferGeometry ? geometry.instanceCount : 1;
    const settings = ['type', 'visible', 'transparent', 'opacity', 'side', 'depthTest', 'depthWrite', 'depthFunc', 'colorWrite', 'blending', 'blendSrc', 'blendDst', 'blendEquation', 'blendSrcAlpha', 'blendDstAlpha', 'blendEquationAlpha', 'premultipliedAlpha', 'alphaTest', 'alphaHash', 'alphaToCoverage', 'polygonOffset', 'polygonOffsetFactor', 'polygonOffsetUnits', 'stencilWrite', 'stencilWriteMask', 'stencilFunc', 'stencilRef', 'stencilFuncMask', 'stencilFail', 'stencilZFail', 'stencilZPass', 'wireframe', 'vertexColors', 'toneMapped', 'dithering', 'glslVersion', 'precision', 'fog', 'lights', 'clipping', 'clipIntersection', 'clipShadows', 'forceSinglePass', 'shadowSide', 'linewidth', 'extensions', 'defaultAttributeValues'];
    const materialState = Object.fromEntries(settings.map(k => [k, value(material[k])]));
    if (material.uniformsGroups?.length || material.clippingPlanes?.length) throw Error('Uniform groups/clipping require an explicit audited adapter');
    if (!material.isShaderMaterial && !material.isRawShaderMaterial) throw Error(`Unaccounted material:${material.type}`);
    events.push({ kind: 'draw', object: id(object), type: object.type, renderOrder: object.renderOrder, group: value(group), matrices: { world: values(object.matrixWorld.elements), view: values(camera.matrixWorldInverse.elements), projection: values(camera.projectionMatrix.elements) }, geometry: { instanceCount: number(n), drawRange: value(geometry.drawRange), attributes: Object.fromEntries(Object.keys(geometry.attributes).sort().map(k => [k, attribute(geometry.attributes[k], n)])), index: geometry.index ? attribute(geometry.index, 1) : null, groups: value(geometry.groups) }, material: { ...materialState, vertexShader: material.vertexShader, fragmentShader: material.fragmentShader, defines: value(material.defines), uniforms: Object.fromEntries(Object.entries(material.uniforms).map(([k, u]) => [k, value(u.value)])) } });
  };
  const originalRender = renderer.render, originalClear = renderer.clear;
  const render = function (scene, camera) {
    events.push({ kind: 'pass', ...state() });
    const restored = [];
    try {
    scene.traverseVisible(o => {
      if (!(o.isMesh || o.isLine || o.isPoints || o.isSprite)) return;
      if (o.isInstancedMesh || o.isSkinnedMesh || o.morphTargetInfluences?.length) throw Error('Instanced/skinned/morphed object requires an explicit audited adapter');
      requireEmptyCallback(o.onBeforeRender, 'object.onBeforeRender');
      requireEmptyCallback(o.onAfterRender, 'object.onAfterRender');
      const old = o.onBeforeRender;
      restored.push([o, old]);
      o.onBeforeRender = function (r, s, c, g, m, group) { old.call(this, r, s, c, g, m, group); draw(this, g, m, c, group); };
    });
    return originalRender.call(this, scene, camera);
    } finally { for (const [o, old] of restored) o.onBeforeRender = old; }
  };
  const clear = function (...args) { events.push({ kind: 'clear', args: args.map(value), ...state() }); return originalClear.apply(this, args); };
  return {
    begin() {
      if (events !== null) throw Error('Nested content audit');
      events = []; textures = {};
      renderer.render = render; renderer.clear = clear;
    },
    end() {
      if (events === null) throw Error('No content audit');
      renderer.render = originalRender; renderer.clear = originalClear;
      const result = { events, textures };
      events = null; textures = null;
      if (!result.events.some(e => e.kind === 'draw')) throw Error('No actual draws captured');
      return result;
    },
    restored() { return renderer.render === originalRender && renderer.clear === originalClear; },
  };
}
