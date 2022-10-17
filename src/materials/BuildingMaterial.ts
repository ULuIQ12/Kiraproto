import { MeshStandardMaterial } from "three";
import { RandTexGen } from "../utils/RandTexGen";

class BuildingMaterial extends MeshStandardMaterial
{
    uniforms:any;
    onBeforeCompile:any;

    constructor(parameters)
    {
        super(parameters);
        
        this.uniforms = {
            randTex:{value:RandTexGen.GetTex()},            
        }

        this.onBeforeCompile = (shader, renderer) => {
            
            for (const uniformName of Object.keys(this.uniforms)) {
                shader.uniforms[uniformName] = this.uniforms[uniformName];
            }

            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>
                attribute vec2 roffset;
                attribute vec3 sizing;
                varying vec2 vUv;
                varying vec3 lNormal;
                varying vec3 vSizing;
          `

            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <uv_vertex>`,
                `#include <uv_vertex>

                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                lNormal = normal;
                vSizing = sizing;
          `
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <common>`,
                `#include <common>

                uniform sampler2D randTex;
                varying vec2 vUv;
                varying vec3 lNormal;
                varying vec3 vSizing;

                float hash21B(vec2 x){ 
                    vec2 p = floor(x);
                    vec2 f = fract(x);
                    f = f*f*(3.0-2.0*f);
                    float a = textureLod(randTex,(p+vec2(0.5,0.5))/511.0,0.0).x;
                    float b = textureLod(randTex,(p+vec2(1.5,0.5))/511.0,0.0).x;
                    float c = textureLod(randTex,(p+vec2(0.5,1.5))/511.0,0.0).x;
                    float d = textureLod(randTex,(p+vec2(1.5,1.5))/511.0,0.0).x;
                    return mix(mix( a, b,f.x), mix( c, d,f.x),f.y);                
                }

                #define FMBROTMAT mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
                #define OCT 2
                float fbm ( in vec2 _st) {
                    float v = 0.0;
                    float a = 0.5;
                    vec2 shift = vec2(100.0);
                    
                    mat2 rot = FMBROTMAT;
                    for (int i = 0; i < OCT; ++i) {
                        v += a * hash21B(_st);
                        _st = rot * _st * 4.0 + shift;
                        a *= 0.5;
                    }
                    return v;
                }


                float sdBox( in vec2 p, in vec2 b )
                {
                    vec2 d = abs(p)-b;
                    return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
                }

                vec2 rotateUV(vec2 uv, float rotation)
                {
                    float mid = 0.5;
                    return vec2(
                        cos(rotation) * (uv.x - mid) + sin(rotation) * (uv.y - mid) + mid,
                        cos(rotation) * (uv.y - mid) - sin(rotation) * (uv.x - mid) + mid
                    );
                }
                vec2 rotateUV(vec2 uv, float rotation, vec2 mid)
                {
                    return vec2(
                      cos(rotation) * (uv.x - mid.x) + sin(rotation) * (uv.y - mid.y) + mid.x,
                      cos(rotation) * (uv.y - mid.y) - sin(rotation) * (uv.x - mid.x) + mid.y
                    );
                }
                
                vec2 rotateUV(vec2 uv, float rotation, float mid)
                {
                    return vec2(
                      cos(rotation) * (uv.x - mid) + sin(rotation) * (uv.y - mid) + mid,
                      cos(rotation) * (uv.y - mid) - sin(rotation) * (uv.x - mid) + mid
                    );
                }
                float cubicPulse( float c, float w, float x )
                {
                    x = abs(x - c);
                    if( x>w ) return 0.0;
                    x /= w;
                    return 1.0 - x*x*(3.0-2.0*x);
                }
    
          `
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                "#include <color_fragment>",
                `#include <color_fragment>

                float faceDot = abs( dot( lNormal, vec3(0.0,1.0,0.0)) );
                
                float windowFace = 1.0 - step( 0.1, faceDot );
                float windowsZone = (1.0 - step( 0.8, abs( vUv.x * 2.0 -1.0) )) * windowFace;
                windowsZone *= 1.0 - step( 1.0,vUv.y);

                vec2 modUv = vUv;
                
                float hdot = abs( dot( lNormal, vec3(1.0, 0.0,0.0)));
                float xfac = vSizing.x * (1.0 - hdot) ;
                float zfac = vSizing.z * hdot;
                modUv.x *= (zfac + xfac)  * 3.0 ;                
                
                modUv.y *= vSizing.y;
                
                vec2 windowSt = mod( modUv , 1.0) * 2.0 - 1.0;
                float w = 1.0 - step( 0.0, sdBox( windowSt, vec2( 0.4)) );
                float border = step( 0.5, cubicPulse(0.0, 0.01, sdBox( windowSt, vec2( 0.4)) ) ) * windowsZone;

                vec2 floorModUv = floor(modUv);
                float fc = hash21B(floorModUv);

                vec2 stripesUvs = windowSt;
                stripesUvs = rotateUV(stripesUvs * 1.0, -PI/8.0, 0.0);
                stripesUvs.y *= 6.0;
                float stripes = step( 0.5, cubicPulse(0.5, 0.05, mod( stripesUvs.y, 1.0 )) )  * w * windowsZone;
                
                diffuseColor.rgb = mix( diffuseColor.rgb, vec3( round(fc *4.0 ) /4.0), windowsZone * w);
                diffuseColor.rgb = mix( diffuseColor.rgb, vec3(1.0), stripes);
                diffuseColor.rgb = mix( diffuseColor.rgb, vec3(0.0), border);               
                
          `
            );

            //console.log( shader.fragmentShader);

        };

    }
}

export {BuildingMaterial};