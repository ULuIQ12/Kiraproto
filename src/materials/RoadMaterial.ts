import { Color, MeshStandardMaterial } from "three";

class RoadMaterial extends MeshStandardMaterial
{
    uniforms:any;
    onBeforeCompile:any;

    constructor(parameters, type:number= 0, dashTint:Color = new Color().setHSL(0.0,0.0,0.1))
    {
        super(parameters);
        
        this.uniforms = {
            type:{value:type}, // 2 = horizontal , 1 = vertical, 0 = crossing
            dashTint:{value:dashTint},
        }

        this.onBeforeCompile = (shader, renderer) => {
            
            for (const uniformName of Object.keys(this.uniforms)) {
                shader.uniforms[uniformName] = this.uniforms[uniformName];
            }

            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>
                varying vec2 vUv;
                varying vec3 vPositionW;
          `

            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <uv_vertex>`,
                `#include <uv_vertex>

                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );                
                vPositionW = (vec3(modelMatrix * vec4(position, 1.0)).xyz); // using absolute world position . Tiles are normalized, perfect for this purpose          
          `


            );

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <common>`,
                `#include <common>

                varying vec2 vUv;
                
                varying vec3 vPositionW;
                uniform float type;
                uniform vec3 dashTint;            

                // return a box signed distance field - https://iquilezles.org/articles/distfunctions2d/
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

                // calculating horizontal dashes
                vec2 tileUV = mod(vPositionW.xz, 1.0 ); // using world positions for tiling
                vec2 horST = tileUV;
                horST.x *= 4.0; // number of dashes
                horST = mod( horST , 1.0 ) * 2.0 - 1.0;
                float horb = sdBox( horST, vec2(0.5, 0.02)); // getting dashes
                horb = 1.0 - step( 0.0, horb); // only the inside
                horb = (type==2.0)?horb:0.0; // does it match the type uniform ?

                // same for the verticals
                vec2 verST = tileUV;
                verST.y *= 4.0; // number of dashes
                verST = mod( verST , 1.0 ) * 2.0 - 1.0;
                float verb = sdBox( verST, vec2(0.02, 0.5));
                verb = 1.0 - step( 0.0, verb);
                verb = (type==1.0)?verb:0.0;
                float totalDash = verb + horb;

                // mixing the two
                diffuseColor.rgb = mix(diffuseColor.rgb, dashTint, totalDash);

          `
            );



        };

    }
}

export {RoadMaterial};