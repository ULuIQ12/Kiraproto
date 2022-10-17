import { FXRandomIntBetween } from '@liamegan1/fxhash-helpers';
import * as THREE from 'three';

/**
 * Generates a texture with values from fxrand
 * to be used in shaders // here only for the building windows
 */
class RandTexGen{

    static SIZE = 512;
    static Texture:any = -1;
    static GetTex()
    {
        if( RandTexGen.Texture == -1)
        {
            this.GenerateTex();
        }
        return RandTexGen.Texture;
    }

    static GenerateTex()
    {
        const size = this.SIZE * this.SIZE;
        
        const data = new Uint8Array(size);
        for(let i=0;i<size;i++)
        {
            data[i] = FXRandomIntBetween(0,256);
        }
        RandTexGen.Texture = new THREE.DataTexture(
            data,
            this.SIZE,
            this.SIZE,
            THREE.RedFormat,
            THREE.UnsignedByteType,
            THREE.UVMapping,
            THREE.RepeatWrapping,
            THREE.RepeatWrapping,
        );
        RandTexGen.Texture.needsUpdate = true;
    }
}

export { RandTexGen };