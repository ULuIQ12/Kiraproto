import { MeshStandardMaterial } from "three";
import { SceneManager } from "../utils/SceneManager";

class PeopleMaterial extends MeshStandardMaterial
{
    uniforms:any;
    onBeforeCompile:any;

    constructor(parameters)
    {
        parameters.transparent = true;
        parameters.alphaTest = 0.5;
        super(parameters);
        
        this.uniforms = {
            aspect:{value:SceneManager.instance.aspect},
        }

        this.onBeforeCompile = (shader, renderer) => {
            
            for (const uniformName of Object.keys(this.uniforms)) {
                shader.uniforms[uniformName] = this.uniforms[uniformName];
            }

            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>
                varying vec2 vUv;
          `

            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <uv_vertex>`,
                `#include <uv_vertex>

                vUv = uv;                
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
          `


            );

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <common>`,
                `#include <common>

                varying vec2 vUv;

                float sdCircle( vec2 p, float r )
                {
                    return length(p) - r;
                }

                float sdBox( in vec2 p, in vec2 b )
                {
                    vec2 d = abs(p)-b;
                    return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
                }
                float sdRoundedBox( in vec2 p, in vec2 b, in vec4 r )
                {
                    r.xy = (p.x>0.0)?r.xy : r.zw;
                    r.x  = (p.y>0.0)?r.x  : r.y;
                    vec2 q = abs(p)-b+r.x;
                    return min(max(q.x,q.y),0.0) + length(max(q,0.0)) - r.x;
                }
    
          `
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                "#include <color_fragment>",
                `#include <color_fragment>

                
                vec2 trunkSt = vUv * 2.0 - 1.0 ;
                trunkSt.y += 0.5;
                vec2 trunkSize = vec2(0.23, 0.7);
                vec4 rounding = vec4(0.1, 0.0, 0.1, 0.0);
                float trunk = sdRoundedBox(trunkSt, trunkSize, rounding);
                trunk = 1.0 - step(0.0, trunk);

                vec2 topSt = vUv * 2.0 - 1.0;
                topSt.y -= 0.5;
                float top = sdCircle(topSt, 0.3);
                top = 1.0 - step(0.0, top);
                diffuseColor.a = max(top,trunk);
          `
            );



        };

    }
}

export {PeopleMaterial};