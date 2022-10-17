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

        // this is my prefered method to inject GLSL in the shader chunks
        // should probably write my own chunks to insert, but this way keeps eveything centralised
        
        this.onBeforeCompile = (shader, renderer) => {
            
            for (const uniformName of Object.keys(this.uniforms)) {
                shader.uniforms[uniformName] = this.uniforms[uniformName];
            }

            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>
                attribute vec2 roffset; // has been defined at vertex level, for each building, so the value is the same on all vertices of one building
                attribute vec3 sizing; // same but contains the cell size informations
                varying vec2 vUv;
                varying vec3 lNormal;
                varying vec3 vSizing;
                varying vec2 vOffset;
          `

            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <uv_vertex>`,
                `#include <uv_vertex>

                // passing attributes to fragment shader
                vUv = uv; // provided by MeshStandardMaterial
                lNormal = normal; // provided by MeshStandardMaterial
                vSizing = sizing; // from BuildingGeometry.ts
                vOffset = roffset; // from BuildingGeometry.ts

                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); // projected position
                
          `
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <common>`,
                `#include <common>

                uniform sampler2D randTex;
                varying vec2 vUv;
                varying vec3 lNormal;
                varying vec3 vSizing;
                varying vec2 vOffset;

                // returns sample from our random texture
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

                // box signed distance field
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

                // to isolate a signal , see https://iquilezles.org/articles/functions/
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

                
                float faceDot = abs( dot( lNormal, vec3(0.0,1.0,0.0)) ); // dot product of the normal and UP to see if we're on a vertical or horizontal face fragment
                
                float windowFace = 1.0 - step( 0.1, faceDot ); // 1 or 0 depending on horizontal or vertical
                float windowsZone = (1.0 - step( 0.8, abs( vUv.x * 2.0 -1.0) )) * windowFace; // cutting some margins
                windowsZone *= 1.0 - step( 1.0,vUv.y); // cutting the roof

                vec2 modUv = vUv;
                
                float hdot = abs( dot( lNormal, vec3(1.0, 0.0,0.0))); // dot product of the normal and right to see if we're on Norht-South or East-West fragment
                float xfac = vSizing.x * (1.0 - hdot) ;
                float zfac = vSizing.z * hdot;
                modUv.x *= (zfac + xfac)  * 3.0 ; // scaling according to cell size, and 3 for windows width density
                modUv.y *= vSizing.y;  // same for the vertical
                
                vec2 windowSt = mod( modUv , 1.0) * 2.0 - 1.0;
                float w = 1.0 - step( 0.0, sdBox( windowSt, vec2( 0.4)) ); // gettings boxes of the right size
                // also picking the border. This should take the width/height ratio of the window in consideration, but doesn't
                float border = step( 0.5, cubicPulse(0.0, 0.01, sdBox( windowSt, vec2( 0.4)) ) ) * windowsZone; 

                vec2 floorModUv = floor(modUv + vOffset * 10.0); 
                float fc = hash21B(floorModUv); // getting a random value for window coloration

                vec2 stripesUvs = windowSt;
                stripesUvs = rotateUV(stripesUvs * 1.0, -PI/8.0, 0.0); 
                stripesUvs.y *= 6.0; // calculating UVS for the black diagonal lines
                float stripes = step( 0.5, cubicPulse(0.5, 0.05, mod( stripesUvs.y, 1.0 )) )  * w * windowsZone; // and extracting them
                
                // mixing everything together
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