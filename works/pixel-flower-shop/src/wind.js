import * as THREE from 'three';

// 風：風聲和樹葉晃動共用同一條陣風曲線，風大時聲音大、葉子也晃得多

export const windUniforms = {
  uTime: { value: 0 },
  uGust: { value: 0 },
};

// 幾個慢速正弦疊出不規則的陣風，0～1
export function gust(time) {
  const g = 0.45 + 0.3 * Math.sin(time * 0.13) + 0.2 * Math.sin(time * 0.31 + 1.7) + 0.1 * Math.sin(time * 0.77 + 0.4);
  return Math.min(1, Math.max(0, g));
}

export function updateWind(time) {
  windUniforms.uTime.value = time;
  windUniforms.uGust.value = gust(time);
}

// 讓 InstancedMesh 的每個方塊依高度隨風晃：越高晃越大，貼地的落葉不動
const SWAY_GLSL = /* glsl */ `
  vec4 mvPosition = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    mvPosition = instanceMatrix * mvPosition;
    vec3 ip = instanceMatrix[3].xyz;
    float h = clamp( ( ip.y - 0.6 ) / 7.0, 0.0, 1.0 );
    float k = h * ( 0.008 + 0.025 * uGust ) + 0.003 * step( 0.5, ip.y );
    float ph = uTime * 1.1 + ip.x * 0.55 + ip.z * 0.4;
    mvPosition.x += k * ( sin( ph ) + 0.4 * sin( ph * 2.3 + ip.y ) );
    mvPosition.z += k * 0.6 * cos( ph * 0.9 + ip.x );
    mvPosition.y += k * 0.3 * sin( ph * 1.3 );
  #endif
  mvPosition = modelViewMatrix * mvPosition;
  gl_Position = projectionMatrix * mvPosition;
`;
function patch(material) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, windUniforms);
    shader.vertexShader = 'uniform float uTime;\nuniform float uGust;\n' +
      shader.vertexShader.replace('#include <project_vertex>', SWAY_GLSL);
  };
  material.customProgramCacheKey = () => 'sway';
  return material;
}
export function addSway(mesh) {
  patch(mesh.material);
  // 陰影也要跟著晃
  mesh.customDepthMaterial = patch(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }));
  return mesh;
}
