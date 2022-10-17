import { MeshStandardMaterial } from "three";

class TreeMaterial extends MeshStandardMaterial
{
    uniforms:any;
    onBeforeCompile:any;

    constructor(parameters)
    {
        parameters.transparent = true;
        parameters.alphaTest = 0.5; // for correct alpha blending
        super(parameters);
        
        this.uniforms = {
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
          `
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                "#include <color_fragment>",
                `#include <color_fragment>

                
                vec2 trunkSt = vUv * 2.0 - 1.0 ;
                trunkSt.y += 0.5;
                vec2 trunkSize = vec2(0.15, 0.8);
                float trunk = sdBox(trunkSt, trunkSize);
                trunk = 1.0 - step(0.0, trunk);

                vec2 topSt = vUv * 2.0 - 1.0;
                topSt.y *= 1.0;
                topSt.y -= 0.25;
                float top = sdCircle(topSt, 0.75);
                top = 1.0 - step(0.0, top);
                diffuseColor.a = max(top,trunk);
          `
            );



        };

    }
}

export {TreeMaterial};